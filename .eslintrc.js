const ecmConfig = require("@eliasm307/config/eslint")({ withPrettier: true });

module.exports = {
  ...ecmConfig,
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
  },
  settings: {
    "functional-core": {
      purePaths: [".*"],
    },
  },
};
