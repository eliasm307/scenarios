import type { MessageRow } from "../../../src/types/databaseRows.ts";
import type { ChatMessage } from "./openai/types.ts";

export function messageRowToChatMessage(messageRow: MessageRow): ChatMessage {
  return {
    content: messageRow.content,
    role: messageRow.author_role,
    name: messageRow.author_id || undefined,
  };
}
