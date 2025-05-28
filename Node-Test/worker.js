const { parentPort } = require("worker_threads");

parentPort.on("message", (buffer) => {
  setTimeout(() => {
    parentPort.postMessage("done");
  }, 100);
});
