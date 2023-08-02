import "./preview.css";
import "../src/app/globals.css";
import type { Preview } from "@storybook/react";
import React from "react";
import { CommonProviders, UserProvider } from "../src/app/providers";
import { User } from "@supabase/supabase-js";

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    parameters: {
      // More on how to position stories at: https://storybook.js.org/docs/react/configure/story-layout
      layout: "fullscreen",
    },
  },
  decorators: [
    (Story) => (
      <CommonProviders>
        <UserProvider
          initialProfile={{
            created_at: new Date().toISOString(),
            id: 1234,
            user_id: "1234",
            preferred_reading_rate: 1,
            user_name: "Test User",
          }}
          user={{ id: "1234" } as User}
        >
          <Story />
        </UserProvider>
      </CommonProviders>
    ),
  ],
};

export default preview;
