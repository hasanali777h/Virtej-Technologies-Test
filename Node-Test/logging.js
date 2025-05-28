const fs = require("fs");
const { Writable, PassThrough } = require("stream");
const http = require("http");
const path = require("path");

const LOG_DIR = "./app-logs";
const LOG_FILE = "app-logs.log";
const MAX_SIZE = 100 * 1024 * 1024;
const REMOTE_URL = "http://www.example.com/logs";
const MAX_RETRY_QUEUE = 1000;

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

class RotatingFileStream extends Writable {
  constructor(filePath, maxSize) {
    super({ objectMode: true });
    this.filePath = filePath;
    this.maxSize = maxSize;
    this.currentSize = 0;
    this.stream = this._createStream();
  }

  _createStream() {
    const stream = fs.createWriteStream(this.filePath, { flags: "a" });
    stream.on("open", () => {
      fs.stat(this.filePath, (err, stats) => {
        this.currentSize = err ? 0 : stats.size;
      });
    });
    return stream;
  }

  _rotate(cb) {
    this.stream.end(() => {
      const rotated = this.filePath + "." + Date.now();
      fs.rename(this.filePath, rotated, (err) => {
        if (err) return cb(err);
        this.stream = this._createStream();
        this.currentSize = 0;
        cb();
      });
    });
  }

  _write(chunk, encoding, callback) {
    const data = JSON.stringify(chunk) + "\n";
    this.currentSize += Buffer.byteLength(data);
    if (this.currentSize > this.maxSize) {
      this._rotate((err) => {
        if (err) return callback(err);
        this.stream.write(data, callback);
      });
    } else {
      if (!this.stream.write(data)) {
        this.stream.once("drain", callback);
      } else {
        callback();
      }
    }
  }
}

class RemoteHTTPStream extends Writable {
  constructor(url, maxQueue = 1000) {
    super({ objectMode: true });
    this.url = url;
    this.retryQueue = [];
    this.sending = false;
    this.maxQueue = maxQueue;
  }

  _write(chunk, encoding, callback) {
    this._send(chunk, 0, callback);
  }

  _send(chunk, attempt, callback) {
    const postData = JSON.stringify(chunk);
    const urlObj = new URL(this.url);

    const req = http.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || 80,
        path: urlObj.pathname,
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          callback();
        } else {
          this._retry(chunk, attempt, callback);
        }
      },
    );

    req.on("error", () => this._retry(chunk, attempt, callback));
    req.write(postData);
    req.end();
  }

  _retry(chunk, attempt, callback) {
    if (this.retryQueue.length < this.maxQueue) {
      const delay = Math.min(1000 * 2 ** attempt, 30000);
      this.retryQueue.push({ chunk, attempt: attempt + 1, time: Date.now() + delay });
      setTimeout(() => this._processQueue(), delay);
    }
    callback();
  }

  _processQueue() {
    if (this.sending || this.retryQueue.length === 0) return;
    this.sending = true;
    const now = Date.now();
    const toSend = this.retryQueue.filter((item) => item.time <= now);
    this.retryQueue = this.retryQueue.filter((item) => item.time > now);

    let pending = toSend.length;
    if (pending === 0) {
      this.sending = false;
      return;
    }
    toSend.forEach(({ chunk, attempt }) => {
      this._send(chunk, attempt, () => {
        if (--pending === 0) this.sending = false;
      });
    });
  }
}

const fileStream = new RotatingFileStream(path.join(LOG_DIR, LOG_FILE), MAX_SIZE);
const remoteStream = new RemoteHTTPStream(REMOTE_URL, MAX_RETRY_QUEUE);
const tee = new PassThrough({ objectMode: true });

tee.pipe(fileStream);
tee.pipe(remoteStream);

function logEvent(event) {
  if (!tee.write(event)) {
    tee.once("drain", () => {});
  }
}

setInterval(() => {
  logEvent({ time: new Date().toISOString(), level: "info", msg: "Hello world" });
}, 1000);
