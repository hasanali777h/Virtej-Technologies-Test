const { Worker } = require("worker_threads");
const os = require("os");
const { performance } = require("perf_hooks");
const path = require("path");

class WorkerPool {
  constructor(workerPath, poolSize) {
    this.workerPath = workerPath;
    this.poolSize = poolSize;
    this.idle = [];
    this.queue = [];
    this.active = 0;

    for (let i = 0; i < poolSize; i++) {
      this.idle.push(this._createWorker());
    }
  }

  _createWorker() {
    const worker = new Worker(this.workerPath);
    worker.on("message", (result) => {
      worker._resolve(result);
      this._release(worker);
    });
    worker.on("error", (err) => {
      worker._reject(err);
      this._release(worker);
    });
    worker.on("exit", (code) => {
      if (code !== 0) {
        worker._reject(new Error(`Worker exited with code ${code}`));
      }

      this.idle.push(this._createWorker());
    });
    return worker;
  }

  _release(worker) {
    worker._resolve = null;
    worker._reject = null;
    this.idle.push(worker);
    this.active--;
    this._next();
  }

  _next() {
    if (this.queue.length === 0 || this.idle.length === 0) return;
    const { buffer, resolve, reject } = this.queue.shift();
    const worker = this.idle.pop();
    worker._resolve = resolve;
    worker._reject = reject;
    this.active++;
    worker.postMessage(buffer);
  }

  run(buffer) {
    return new Promise((resolve, reject) => {
      this.queue.push({ buffer, resolve, reject });
      this._next();
    });
  }
}

const pool = new WorkerPool(path.resolve(__dirname, "worker.js"), os.cpus().length - 1);

function processImage(buffer) {
  return pool.run(buffer);
}

processImage(Buffer.from("image data"))
  .then((result) => console.log("Processed:", result))
  .catch((err) => console.error("Error:", err));

const NUM_REQUESTS = 10;
const buffer = Buffer.from("image data");
let completed = 0;
let latencies = [];

const start = performance.now();

for (let i = 0; i < NUM_REQUESTS; i++) {
  const t0 = performance.now();
  processImage(buffer).then(() => {
    const t1 = performance.now();
    latencies.push(t1 - t0);
    completed++;
    if (completed === NUM_REQUESTS) {
      const end = performance.now();
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      console.log("Throughput:", (NUM_REQUESTS / ((end - start) / 1000)).toFixed(2), "req/sec");
      console.log("Average latency:", avgLatency.toFixed(2), "ms");
    }
  });
}
