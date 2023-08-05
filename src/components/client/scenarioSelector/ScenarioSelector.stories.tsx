import type { Meta, StoryObj } from "@storybook/react";
import { action } from "../../../../.storybook/utils";
// import { within, userEvent } from "@storybook/testing-library";

import Page from "./ScenarioSelector";
import type { SessionUser } from "../../../types";

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
    hasUserSelectedOption: (userId, optionId) => {
      return (
        {
          1: null,
          2: 2,
          3: 1,
        }[userId] === optionId
      );
    },
    readyForNextStageProps: {
      canMoveToNextStage: false,
      isReadyForNextStage: false,
      handleReadyForNextStageClick: action("handleReadyForNextStageClick"),
      canMoveToNextStageConditionText: "You have to select an option first",
    },
    handleSelectionChange: action("setSelection"),
    handleOptionRating: action("handleOptionRating"),
    isUserReadyForNextStage: () => Math.random() > 0.5,
    getOptionRating: () => null,
    usersWaitingToVote: users,
    optionsAiAuthorModelId: "",
  },
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithNullSelection: Story = {
  args: {
    hasUserSelectedOption: (userId, optionId) => {
      return (
        {
          1: null,
          2: 2,
          3: 1,
        }[userId] === optionId
      );
    },
  },
};

export const WithMinusOneSelection: Story = {
  args: {
    hasUserSelectedOption: (userId, optionId) => {
      return (
        {
          1: -1,
          2: 2,
          3: 1,
        }[userId] === optionId
      );
    },
  },
};

export const WithIdSelection: Story = {
  args: {
    hasUserSelectedOption: (userId, optionId) => {
      return (
        {
          1: 1,
          2: 2,
          3: 1,
        }[userId] === optionId
      );
    },
  },
};

export const WithMultipleUsersOnTheSameOption: Story = {
  args: {
    hasUserSelectedOption: (userId, optionId) => {
      return (
        {
          1: 1,
          2: 1,
          3: 1,
          4: 1,
          5: 1,
          6: 1,
        }[userId] === optionId
      );
    },
  },
};

export const WithPositiveAndNegativeRatings: Story = {
  args: {
    getOptionRating: (optionId) => {
      return (
        {
          1: 1,
          2: -1,
          3: 1,
        }[optionId] || null
      );
    },
  },
};
