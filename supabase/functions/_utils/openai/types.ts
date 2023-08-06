import type {
  ChatCompletionFunctions as BaseChatCompletionFunction,
  ChatCompletionRequestMessage,
} from "https://esm.sh/openai-edge@1.2.0";
import type { CreateMessage } from "https://esm.sh/ai";
import type { JSONSchema7 } from "https://esm.sh/json-schema@0.4.0";

export type ChatMessage = ChatCompletionRequestMessage;

type JSONValue =
  | null
  | string
  | number
  | boolean
  | {
    [x: string]: JSONValue;
  }
  | Array<JSONValue>;

export type ChatCompletionFunction = {
  definition: BaseChatCompletionFunction & {
    parameters: JSONSchema7 & { type: "object" };
  };
  /**
   * @remark if there was an error in the function call, the error will be returned as the result, maybe the AI will try again? Is this a good idea?
   */
  handler: (parameters: any) => Promise<JSONValue>;
};

export type FunctionCallMessage = CreateMessage;
