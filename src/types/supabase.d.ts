export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      messages: {
        Row: {
          author_id: string | null;
          author_role: string;
          content: string;
          id: number;
          inserted_at: string;
          session_id: number;
          updated_at: string;
        };
        Insert: {
          author_id?: string | null;
          author_role: string;
          content: string;
          id?: number;
          inserted_at?: string;
          session_id: number;
          updated_at?: string;
        };
        Update: {
          author_id?: string | null;
          author_role?: string;
          content?: string;
          id?: number;
          inserted_at?: string;
          session_id?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_author_id_fkey";
            columns: ["author_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_session_id_fkey";
            columns: ["session_id"];
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      scenarios: {
        Row: {
          created_at: string;
          id: number;
          text: string;
          voted_by_user_ids: string[];
        };
        Insert: {
          created_at?: string;
          id?: number;
          text: string;
          voted_by_user_ids?: string[];
        };
        Update: {
          created_at?: string;
          id?: number;
          text?: string;
          voted_by_user_ids?: string[];
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          created_at: string;
          id: number;
          messaging_locked_by_user_id: string | null;
          scenario_option_votes: Json;
          scenario_options: string[] | null;
          scenario_outcome_votes: Json;
          selected_scenario_text: string | null;
          stage: string;
        };
        Insert: {
          created_at?: string;
          id?: number;
          messaging_locked_by_user_id?: string | null;
          scenario_option_votes?: Json;
          scenario_options?: string[] | null;
          scenario_outcome_votes?: Json;
          selected_scenario_text?: string | null;
          stage: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          messaging_locked_by_user_id?: string | null;
          scenario_option_votes?: Json;
          scenario_options?: string[] | null;
          scenario_outcome_votes?: Json;
          selected_scenario_text?: string | null;
          stage?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_messaging_locked_by_user_id_fkey";
            columns: ["messaging_locked_by_user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_profiles: {
        Row: {
          created_at: string;
          id: number;
          user_id: string;
          user_name: string;
        };
        Insert: {
          created_at?: string;
          id?: number;
          user_id: string;
          user_name: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          user_id?: string;
          user_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_profiles_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_example_scenarios: {
        Args: Record<PropertyKey, never>;
        Returns: {
          value: string;
        }[];
      };
      get_example_scenarios_fn: {
        Args: Record<PropertyKey, never>;
        Returns: {
          created_at: string;
          id: number;
          text: string;
          voted_by_user_ids: string[];
        }[];
      };
      json_matches_schema: {
        Args: {
          schema: Json;
          instance: Json;
        };
        Returns: boolean;
      };
      jsonb_matches_schema: {
        Args: {
          schema: Json;
          instance: Json;
        };
        Returns: boolean;
      };
      vote_for_option: {
        Args: {
          user_id: string;
          session_id: number;
          option_id: Json;
        };
        Returns: undefined;
      };
      vote_for_outcome: {
        Args: {
          vote_by_user_id: string;
          vote_for_user_id: string;
          session_id: number;
          outcome: Json;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
