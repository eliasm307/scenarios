const ecmConfig = require("@eliasm307/config/eslint")({ withPrettier: true, withReact: true });

module.exports = {
  ...ecmConfig,
  plugins: [...ecmConfig.plugins].filter((plugin) => plugin !== "react-hooks"),
  extends: [...ecmConfig.extends, "next/core-web-vitals"],
  root: true,
  rules: {
    ...ecmConfig.rules,
    "functional-core/purity": [
      "warn",
      {
        allowThrow: true,
      },
    ],
    "react/no-unused-prop-types": "off",
  },
  settings: {
    "functional-core": {
      purePaths: [".*"],
    },
  },
};
