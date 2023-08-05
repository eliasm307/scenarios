import type { Message } from "ai";
import type { MessageRow } from "../types";

export function messageRowToChatMessage(messageRow: MessageRow): Message {
  return {
    id: String(messageRow.id),
    content: messageRow.content,
    role: messageRow.author_role as Message["role"],
    createdAt: new Date(messageRow.updated_at),
    // name: message.author_id!,
  };
}

export function isTruthy<T>(value: T): value is NonNullable<T> {
  return Boolean(value);
}

export function createUserReadyForNextStageKey(userId: string) {
  return `${userId}-ready-for-next-stage`;
}

// ! this gets persisted but is temporary so could be changed but breaks any existing sessions using the old key
const SCENARIO_OPTION_RATING_TEXT = "-rating-for-scenario-";

export function createScenarioOptionUserRatingKey({
  userId,
  optionId,
}: {
  userId: string;
  optionId: number;
}) {
  return `${userId}${SCENARIO_OPTION_RATING_TEXT}${optionId}`;
}

export function parseUserRatingKey(key: string) {
  const segments = key.split(SCENARIO_OPTION_RATING_TEXT);
  const forScenarioOptionId = Number(segments.pop()?.trim());
  if (isNaN(forScenarioOptionId)) {
    return null;
  }
  const byUserId = segments.shift()?.trim(); // db will reject if this is not a valid uuid
  if (!byUserId) {
    return null;
  }
  return { byUserId, forScenarioOptionIndex: forScenarioOptionId };
}
