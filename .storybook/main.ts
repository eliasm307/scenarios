import type { StorybookConfig } from "@storybook/nextjs";
import path from "path";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  staticDirs: ["../public", "./public"],
  addons: [
    // "@storybook/addon-links",
    // see https://storybook.js.org/docs/7.1/react/essentials/introduction#configuration
    // "@storybook/addon-essentials", // todo remove this to only include addons we need (e.g. dont need docs)
    // "@storybook/addon-controls",
    // "@storybook/addon-backgrounds",
    // "@storybook/addon-toolbars",
    // "@storybook/addon-measure",
    // "@storybook/addon-outline",
    // '@storybook/addon-controls',
    // '@storybook/addon-backgrounds',
    // '@storybook/addon-toolbars',
    // '@storybook/addon-measure',
    // '@storybook/addon-outline',

    "@storybook/addon-actions",
    "@storybook/addon-controls",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/nextjs",
    options: {
      fastRefresh: true,
      builder: {
        fsCache: true,
        lazyCompilation: true,
        // useSWC: true,
      },
      nextConfigPath: path.resolve(__dirname, "../next.config.js"),
    },
  },
  logLevel: "warn",
  docs: {
    autodocs: "tag",
  },
  managerHead: addIconToHead,
  previewHead: addIconToHead,
};

function addIconToHead(headInnerHtml: string) {
  return `
    ${headInnerHtml}
    <link rel="icon" href="/assets/emoji_u1f52e.svg" />
  `;
}

export default config;
