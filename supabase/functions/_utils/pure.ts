import type { MessageRow } from "../../../src/types/databaseRows.ts";
import type { ChatMessage } from "./openai/types.ts";

export function messageRowToChatMessage(messageRow: MessageRow): ChatMessage {
  return {
    content: messageRow.content,
    role: messageRow.author_role,
  };
}

export function mimeTypeToFileExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpeg";
    default:
      throw new Error(`Unsupported mime type: ${mimeType}`);
  }
}
