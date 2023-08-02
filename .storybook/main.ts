import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  staticDirs: ["../public", "./public"],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
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
