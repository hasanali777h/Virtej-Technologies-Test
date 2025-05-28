let interval = setInterval(() => {
  console.log("Plugin running...");
}, 1000);

function cleanup() {
  clearInterval(interval);
  console.log("Plugin cleaned up!");
}

module.exports = { cleanup };
