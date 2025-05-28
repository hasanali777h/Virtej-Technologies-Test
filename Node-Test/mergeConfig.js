const _ = require("lodash");
const defaults = {};
const overrides = JSON.parse('{ "__proto__": { "polluted": true } }');
_.merge(defaults, overrides);

console.log({}.polluted); // true (polluted!)

function isSafeKey(key) {
  return !["__proto__", "constructor", "prototype"].includes(key);
}

function deepMergeSafe(target, source) {
  for (const key of Object.keys(source)) {
    if (!isSafeKey(key)) continue;
    if (
      typeof source[key] === "object" &&
      source[key] !== null &&
      typeof target[key] === "object" &&
      target[key] !== null
    ) {
      deepMergeSafe(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// Usage:
const safeConfig = deepMergeSafe(JSON.parse(JSON.stringify(defaults)), overrides);
console.log(safeConfig);
