const { createHook, executionAsyncId, triggerAsyncId } = require("async_hooks");

let counter = 0;

createHook({ init() {} }).enable();
Promise.resolve(1729).then(() => {
  console.log(`eid ${executionAsyncId()} tid ${triggerAsyncId()}`);
});

function delayedIncrement() {
  return new Promise((resolve) => {
    setTimeout(() => {
      counter += Math.floor(Math.random() * 100);
      resolve(counter);
    }, 1000);
  });
}

async function main() {
  const results = await Promise.all([delayedIncrement(), delayedIncrement(), delayedIncrement()]);
  console.log("Final:", results);
}
main();
