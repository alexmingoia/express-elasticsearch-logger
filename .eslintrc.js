const fs = require("fs")
const path = require("path")
const prettierOptions = JSON.parse(
  fs.readFileSync(path.join(__dirname, "./.prettierrc"), "utf8"),
)

module.exports = {
  parserOptions: {
    allowImportExportEverywhere: true,
  },
  extends: ["airbnb-base", "prettier"],
  env: {
    mocha: true,
    node: true,
    es6: true,
  },
  rules: {
    "no-underscore-dangle":"off",
    "prettier/prettier": [2, prettierOptions],
    "no-console": "error",
    "func-names": ["error", "never"],
    quotes: ["error", "double"],
    semi: ["error", "never"],
  },
  plugins: ["prettier", "mocha"],
}
