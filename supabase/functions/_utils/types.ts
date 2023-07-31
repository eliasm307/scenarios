export interface GenericWebhookPayload<Row> {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Row;
  schema: "public";
  old_record: null | Row;
}
