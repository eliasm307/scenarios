import type { Meta, StoryObj } from "@storybook/react";
// import { within, userEvent } from "@storybook/testing-library";

import Page from "./ScenarioChat";
import type { MessageRow } from "../../../types";
import { DUMMY_MESSAGES } from "../../../utils/constants";
import { action } from "../../../../.storybook/utils";

const users = [
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
];

const meta = {
  component: Page,
  args: {
    chat: {
      allowsSubmitting: true,
      handleSubmit: action("handleSubmit"),
      inputProps: {
        onChange: action("input:onChange"),
        onKeyDown: action("input:onKeyDown"),
        onBlur: action("input:onBlur"),
        placeholder: "Type a message...",
        maxLength: 500,
        value: "", // todo container should not be controlling UI control, this means UI doesn't work standalone
      },
      isLoading: false,
    },
    handleVoteChange: action("handleVoteChange"),
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
        content: [
          `Sure thing, ThatGuy Hotmail! Here's an image that represents the intimidating basketball coach we were just talking about. Take a look and let your imagination run wild!`,

          `![Intimidating Basketball Coach](https://dmjwwnpltjvsevmfujec.supabase.co/storage/v1/object/public/images/session_chat_images/8352f8a3-4448-4ca3-abb6-601475f0ff37.jpeg "some title")`,

          `Just remember, looks can be deceiving, and sometimes the toughest and most challenging experiences can lead to unexpected growth and success. It's all about finding the right balance between ambition and personal well-being.`,
        ].join("\n"),
        inserted_at: "2021-08-03T18:00:00.000Z",
        updated_at: "2021-08-03T18:00:00.000Z",
        session_id: 1,
      },
    ] satisfies MessageRow[],
    outcomeVotesByCurrentUser: {},
    selectedScenarioImageUrl: "/assets/output.jpeg",
    selectedScenarioText:
      "You are an ambitious professional climbing up the ranks of a successful company when an unexpected opportunity arises:\n another company offers you a higher position with more responsibilities and a significant increase in salary. \nHowever, accepting this offer means leaving behind incredible colleagues and mentors who have helped shape your career so far. \nDo you stay loyal to your current company or take the leap into the unknown?",
    users,
    readyForNextStageProps: {
      isReadyForNextStage: false,
      canMoveToNextStage: false,
      handleReadyForNextStageClick: action("handleReadyForNextStage"),
      canMoveToNextStageConditionText: "You must vote on all outcomes",
    },
    remoteUserVotingStatuses: users
      .filter((user) => !user.isCurrentUser)
      .map((user) => ({ user, isFinishedVoting: Math.random() > 0.5 })),
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
