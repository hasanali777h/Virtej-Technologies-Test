const cluster = require("cluster");
const http = require("http");

const WORKERS = 4;

if (cluster.isMaster) {
  for (let i = 0; i < WORKERS; i++) cluster.fork();

  process.on("SIGTERM", () => {
    for (const id in cluster.workers) {
      cluster.workers[id].send("shutdown");
    }
    let exiting = 0;
    cluster.on("exit", () => {
      exiting++;
      if (exiting === WORKERS) process.exit(0);
    });
  });
} else {
  const server = http.createServer((req, res) => {
    setTimeout(() => {
      res.end("ok");
    }, 1000);
  });

  let connections = 0;
  server.on("connection", (socket) => {
    connections++;
    socket.on("close", () => connections--);
  });

  function shutdown() {
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 30000);
  }

  process.on("SIGTERM", shutdown);
  process.on("message", (msg) => {
    if (msg === "shutdown") shutdown();
  });

  server.listen(3000, () => {
    console.log("server listening on port: ", 3000);
  });
}
