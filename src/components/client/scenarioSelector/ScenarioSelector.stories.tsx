import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useState } from "react";
import { action } from "../../../../.storybook/utils";
// import { within, userEvent } from "@storybook/testing-library";

import Component from "./ScenarioSelector";
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

const DUMMY_SCENARIOS = [
  "You are a successful surgeon who has just received an invitation to participate in a groundbreaking medical trial. The trial involves testing a new and experimental procedure that could potentially save many lives in the future. However, you learn that the procedure has not been extensively tested and carries significant risks for the patients involved.\n\nDo you take on the responsibility of participating in the trial, knowing that your expertise could make a difference but also risking harm to the patients? Or do you decline the opportunity, prioritizing patient safety over potential medical advancements?",
  "You are a renowned journalist who has been assigned to cover an important political scandal. As you dig deeper into the story, you uncover evidence that could potentially expose high-ranking officials involved in corruption. However, publishing this information would put your career at risk and could also endanger your personal safety.\n\nDo you publish the story, believing in the importance of exposing corruption and holding those accountable? Or do you protect your career and personal well-being by keeping the information confidential?",
  "You are a devoted parent who is offered a once-in-a-lifetime job opportunity on another continent. Accepting this job means relocating and uprooting your entire family from their familiar surroundings. While it offers financial security and professional growth, it also means disrupting your children's lives and potentially straining your relationships with extended family members.\n\nDo you seize this chance for professional advancement, knowing it could have lasting effects on your family dynamics? Or do you prioritize stability and continuity for your children by declining the job offer?",
];

const meta = {
  component: Component,
  parameters: {
    // More on how to position stories at: https://storybook.js.org/docs/react/configure/story-layout
    layout: "fullscreen",
  },
  args: {
    users,
    currentUser: users[0],
    isLoading: false,
    scenarioOptions: DUMMY_SCENARIOS,
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
    isUserReadyForNextStage: (userId) => {
      return ["1", "2", "3"].includes(userId);
    },
    getOptionRating: () => null,
    usersWaitingToVote: users,
    optionsAiAuthorModelId: "",
  },
} satisfies Meta<typeof Component>;

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

export const WithScenarioOptionsStreamingIn: Story = {
  render: function Render(props) {
    const [scenarioOptions, setScenarioOptions] = useState<string[]>(["", "", ""]);

    useEffect(() => {
      const stream = createDummyScenarioStream();
      const intervalId = setInterval(() => {
        const { value, done } = stream.next();
        if (done) {
          clearInterval(intervalId);
        }
        setScenarioOptions(value);
      }, 10);

      return () => {
        clearInterval(intervalId);
      };
    }, []);

    return <Component {...props} scenarioOptions={scenarioOptions} />;
  },
};

const DUMMY_SCENARIOS_FOR_STREAMING = [
  "You are a successful surgeon ".repeat(30),
  "You are a renowned journalist ".repeat(30),
  "You are a devoted parent ".repeat(30),
];

function* createDummyScenarioStream() {
  const output = ["", "", ""];
  let index = 0;
  for (const scenario of DUMMY_SCENARIOS_FOR_STREAMING) {
    const tokens = scenario.split(/\b/g);

    for (const token of tokens) {
      output[index] += token;
      yield [...output];
    }

    index++;
  }

  return output;
}
