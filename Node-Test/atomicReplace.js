const fs = require("fs");
const path = require("path");

function replaceConfig(newData) {
  const dir = "./myapp";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(path.join(dir, "config.tmp"), JSON.stringify(newData, null, 2));
  fs.renameSync(path.join(dir, "config.tmp"), path.join(dir, "config.json"));
}
const data = {
  val1: "val1",
};
replaceConfig(data);
