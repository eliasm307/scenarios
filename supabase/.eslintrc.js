const ecmConfig = require("@eliasm307/config/eslint")({ withPrettier: true, withReact: false });

module.exports = {
  ...ecmConfig,
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
    "import/no-unresolved": "off",
    "@typescript-eslint/no-unsafe-return": "off",
  },
  settings: {
    "functional-core": {
      purePaths: [".*"],
    },
  },
};
