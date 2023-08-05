import type { Meta, StoryObj } from "@storybook/react";
import { action } from "@storybook/addon-actions";
// import { within, userEvent } from "@storybook/testing-library";

import Page from "./OutcomesReveal";
import type { SessionUser } from "../../types";

const users: SessionUser[] = [
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

const outcomeVotes = users.reduce<any>((acc, user) => {
  acc[user.id] = users.reduce<any>((innerMap, innerUser) => {
    innerMap[innerUser.id] = Math.random() > 0.5;
    return innerMap;
  }, {});
  return acc;
}, {});

const meta = {
  component: Page,
  parameters: {
    // More on how to position stories at: https://storybook.js.org/docs/react/configure/story-layout
    layout: "fullscreen",
  },
  args: {
    readyForNextStageProps: {
      canMoveToNextStage: true,
      handleReadyForNextStageClick: action("handleReadyForNextStageClick"),
      beforeReadyText: "Before ready",
      isReadyForNextStage: true,
      canMoveToNextStageConditionText: "You have to select an option first",
    },
    outcomeVotes,
    scenarioText:
      "You are an ambitious professional climbing up the ranks of a successful company when an unexpected opportunity arises:\n another company offers you a higher position with more responsibilities and a significant increase in salary. \nHowever, accepting this offer means leaving behind incredible colleagues and mentors who have helped shape your career so far. \nDo you stay loyal to your current company or take the leap into the unknown?",
    users,
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
