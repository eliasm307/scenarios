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
