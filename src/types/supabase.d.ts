export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      messages: {
        Row: {
          author_id: string | null;
          author_name: string;
          author_role: string;
          id: number;
          inserted_at: string;
          session_id: string;
          text: string;
          updated_at: string;
        };
        Insert: {
          author_id?: string | null;
          author_name: string;
          author_role: string;
          id?: number;
          inserted_at?: string;
          session_id: string;
          text: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string | null;
          author_name?: string;
          author_role?: string;
          id?: number;
          inserted_at?: string;
          session_id?: string;
          text?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_author_id_fkey";
            columns: ["author_id"];
            referencedRelation: "users";
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
          voted_by_user_ids: string[];
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
          scenario_option_votes: Json;
          scenario_options: string[] | null;
          scenario_outcome_votes: Json;
          selected_scenario_id: number | null;
          stage: string;
        };
        Insert: {
          created_at?: string;
          id?: number;
          scenario_option_votes?: Json;
          scenario_options?: string[] | null;
          scenario_outcome_votes?: Json;
          selected_scenario_id?: number | null;
          stage: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          scenario_option_votes?: Json;
          scenario_options?: string[] | null;
          scenario_outcome_votes?: Json;
          selected_scenario_id?: number | null;
          stage?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_selected_scenario_id_fkey";
            columns: ["selected_scenario_id"];
            referencedRelation: "scenarios";
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
      sessions_view: {
        Row: {
          created_at: string | null;
          id: number | null;
          scenario_option_votes: Json | null;
          scenario_options: string[] | null;
          scenario_outcome_votes: Json | null;
          scenario_text: string | null;
          selected_scenario_id: number | null;
          stage: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_selected_scenario_id_fkey";
            columns: ["selected_scenario_id"];
            referencedRelation: "scenarios";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
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
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
