export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      messages: {
        Row: {
          author_name: string;
          author_role: string;
          content: string;
          id: number;
          inserted_at: string;
          session_id: string;
          updated_at: string;
        };
        Insert: {
          author_name: string;
          author_role: string;
          content: string;
          id?: number;
          inserted_at?: string;
          session_id: string;
          updated_at?: string;
        };
        Update: {
          author_name?: string;
          author_role?: string;
          content?: string;
          id?: number;
          inserted_at?: string;
          session_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
