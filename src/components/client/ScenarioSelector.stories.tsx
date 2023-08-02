import type { Meta, StoryObj } from "@storybook/react";
import { action } from "@storybook/addon-actions";
// import { within, userEvent } from "@storybook/testing-library";

import Page from "./ScenarioSelector";
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

const scenarioOptions = [
  `You are an ambitious professional climbing up the ranks of a successful company when an unexpected opportunity arises: another company offers you a higher position with more responsibilities and a significant increase in salary.

  However, accepting this offer means leaving behind incredible colleagues and mentors who have helped shape your career so far.

  Do you stay loyal to your current company or take the leap into the unknown?`,
  "Scenario 2",
  "Scenario 3",
];

const meta = {
  component: Page,
  parameters: {
    // More on how to position stories at: https://storybook.js.org/docs/react/configure/story-layout
    layout: "fullscreen",
  },
  args: {
    users,
    currentUser: users[0],
    isLoading: false,
    scenarioOptions,
    optionVotes: {
      1: null,
      2: 2,
      3: 1,
    },
    handleCurrentUserReadyForNextStage: async () => action("handleCurrentUserReadyForNextStage")(),
    isCurrentUserReadyForNextStage: false,
    setSelection: action("setSelection"),
    usersWaitingToVote: users,
  },
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithNullSelection: Story = {
  args: {
    optionVotes: {
      1: null,
      2: 2,
      3: 1,
    },
  },
};

export const WithMinusOneSelection: Story = {
  args: {
    optionVotes: {
      1: -1,
      2: 2,
      3: 1,
    },
  },
};

export const WithIdSelection: Story = {
  args: {
    optionVotes: {
      1: 1,
      2: 2,
      3: 1,
    },
  },
};

export const WithMultipleUsersOnTheSameOption: Story = {
  args: {
    optionVotes: {
      1: 1,
      2: 1,
      3: 1,
      4: 1,
      5: 1,
      6: 1,
    },
  },
};