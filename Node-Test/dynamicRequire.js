function loadPlugin(name) {
  const pluginPath = require.resolve(`./plugins/${name}.js`);
  const oldPlugin = require.cache[pluginPath]?.exports;

  if (oldPlugin && typeof oldPlugin.cleanup === "function") {
    oldPlugin.cleanup();
  }

  delete require.cache[pluginPath];
  return require(`./plugins/${name}.js`);
}

loadPlugin("plugin");
