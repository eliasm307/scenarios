import type { Meta, StoryObj } from "@storybook/react";
import { action } from "@storybook/addon-actions";
// import { within, userEvent } from "@storybook/testing-library";

import Page from "./ScenarioChat";
import type { MessageRow } from "../../types";
import { DUMMY_MESSAGES } from "../../utils/constants";

const meta = {
  component: Page,
  args: {
    chat: {
      allowsSubmitting: true,
      error: null,
      handleSubmit: async () => action("handleSubmit")(),
      hasError: false,
      inputProps: {
        onChange: action("input:onChange"),
        onKeyDown: async () => action("input:onKeyDown")(),
        onBlur: action("input:onBlur"),
        placeholder: "Type a message...",
        value: "", // todo container shouldnt be controlling UI control, this means UI doesnt work standalone
      },
      isLoading: false,
    },
    handleVoteChange: async () => {},
    messageRows: [
      ...DUMMY_MESSAGES.map((message, id) => {
        const isUser = message.role === "user";
        return {
          id,
          author_role: message.role,
          author_id: isUser ? String(Math.floor(Math.random() * 3) + 1) : null,
          author_ai_model_id: !isUser ? "gpt-3" : null,
          content: message.content,
          inserted_at: "2021-08-03T18:00:00.000Z",
          updated_at: "2021-08-03T18:00:00.000Z",
          session_id: 1,
        } satisfies MessageRow;
      }),
      {
        id: 1,
        author_role: "user",
        author_id: "1",
        author_ai_model_id: null,
        content: "Hello, world!",
        inserted_at: "2021-08-03T18:00:00.000Z",
        updated_at: "2021-08-03T18:00:00.000Z",
        session_id: 1,
      },
      {
        id: 1,
        author_role: "assistant",
        author_id: null,
        author_ai_model_id: "gpt-3",
        content: "Ai response",
        inserted_at: "2021-08-03T18:00:00.000Z",
        updated_at: "2021-08-03T18:00:00.000Z",
        session_id: 1,
      },
    ] satisfies MessageRow[],
    outcomeVotes: {},
    outcomeVotesForCurrentUser: {},
    selectedScenarioImagePath: "",
    selectedScenarioImageUrl: "/assets/output.jpeg",
    selectedScenarioText:
      "You are an ambitious professional climbing up the ranks of a successful company when an unexpected opportunity arises:\n another company offers you a higher position with more responsibilities and a significant increase in salary. \nHowever, accepting this offer means leaving behind incredible colleagues and mentors who have helped shape your career so far. \nDo you stay loyal to your current company or take the leap into the unknown?",
    users: [
      {
        id: "1",
        name: "John Doe",
        isCurrentUser: true,
        relativeName: "I",
      },
      {
        id: "2",
        name: "Jane Doe",
        isCurrentUser: false,
        relativeName: "Jane Doe",
      },
      {
        id: "3",
        name: "John Smith",
        isCurrentUser: false,
        relativeName: "John Smith",
      },
      {
        id: "4",
        name: "Jane Smith",
        isCurrentUser: false,
        relativeName: "Jane Smith",
      },
      {
        id: "5",
        name: "John Connor",
        isCurrentUser: false,
        relativeName: "John Connor",
      },
      {
        id: "6",
        name: "Jane Connor",
        isCurrentUser: false,
        relativeName: "Jane Connor",
      },
    ],
  },
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// todo add tests
// More on interaction testing: https://storybook.js.org/docs/react/writing-tests/interaction-testing
// export const LoggedIn: Story = {
// play: async ({ canvasElement }) => {
//   const canvas = within(canvasElement);
//   const loginButton = await canvas.getByRole("button", {
//     name: /Log in/i,
//   });
//   await userEvent.click(loginButton);
// },
// };
