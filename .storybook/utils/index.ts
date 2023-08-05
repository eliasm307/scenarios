import { action as baseAction } from "@storybook/addon-actions";

// todo raise storybook issue about this not working with async callback props
export const action: (name: string) => any = (name: string) => baseAction(name);
