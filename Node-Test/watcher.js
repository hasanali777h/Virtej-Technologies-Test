const EventEmitter = require("events");
const fs = require("fs");

class FileWatcher extends EventEmitter {
  watch(path) {
    const stream = fs.watch(path);
    stream.on("change", () => this.emit("fileChanged", path));
  }
}

const dirPath = "./log";
if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath, { recursive: true });
}
fs.writeFileSync("./log/app.log", "some text");

const watcher = new FileWatcher();
watcher.watch("./log/app.log");

watcher.on("fileChanged", (filePath) => {
  console.log(`File changed: ${filePath}`);
});
