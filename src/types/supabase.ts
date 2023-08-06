export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      messages: {
        Row: {
          author_ai_model_id: string | null;
          author_id: string | null;
          author_role: string;
          content: string;
          id: number;
          inserted_at: string;
          session_id: number;
          updated_at: string;
        };
        Insert: {
          author_ai_model_id?: string | null;
          author_id?: string | null;
          author_role: string;
          content: string;
          id?: number;
          inserted_at?: string;
          session_id: number;
          updated_at?: string;
        };
        Update: {
          author_ai_model_id?: string | null;
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
          disliked_by_user_ids: string[];
          id: number;
          image_creator_ai_model_id: string | null;
          image_path: string | null;
          image_prompt: string | null;
          liked_by_user_ids: string[];
          rating: number;
          text: string;
          voted_by_user_ids: string[] | null;
        };
        Insert: {
          created_at?: string;
          disliked_by_user_ids?: string[];
          id?: number;
          image_creator_ai_model_id?: string | null;
          image_path?: string | null;
          image_prompt?: string | null;
          liked_by_user_ids?: string[];
          rating?: number;
          text: string;
          voted_by_user_ids?: string[] | null;
        };
        Update: {
          created_at?: string;
          disliked_by_user_ids?: string[];
          id?: number;
          image_creator_ai_model_id?: string | null;
          image_path?: string | null;
          image_prompt?: string | null;
          liked_by_user_ids?: string[];
          rating?: number;
          text?: string;
          voted_by_user_ids?: string[] | null;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          ai_is_responding: boolean;
          created_at: string;
          id: number;
          scenario_option_votes: Json;
          scenario_options: string[] | null;
          scenario_options_ai_author_model_id: string | null;
          scenario_outcome_votes: Json;
          selected_scenario_id: number | null;
          selected_scenario_image_path: string | null;
          selected_scenario_text: string | null;
          stage: string;
        };
        Insert: {
          ai_is_responding?: boolean;
          created_at?: string;
          id?: number;
          scenario_option_votes?: Json;
          scenario_options?: string[] | null;
          scenario_options_ai_author_model_id?: string | null;
          scenario_outcome_votes?: Json;
          selected_scenario_id?: number | null;
          selected_scenario_image_path?: string | null;
          selected_scenario_text?: string | null;
          stage?: string;
        };
        Update: {
          ai_is_responding?: boolean;
          created_at?: string;
          id?: number;
          scenario_option_votes?: Json;
          scenario_options?: string[] | null;
          scenario_options_ai_author_model_id?: string | null;
          scenario_outcome_votes?: Json;
          selected_scenario_id?: number | null;
          selected_scenario_image_path?: string | null;
          selected_scenario_text?: string | null;
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
          preferred_reading_rate: number | null;
          user_id: string;
          user_name: string;
        };
        Insert: {
          created_at?: string;
          id?: number;
          preferred_reading_rate?: number | null;
          user_id: string;
          user_name: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          preferred_reading_rate?: number | null;
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
      get_example_bad_scenarios: {
        Args: Record<PropertyKey, never>;
        Returns: {
          created_at: string;
          disliked_by_user_ids: string[];
          id: number;
          image_creator_ai_model_id: string | null;
          image_path: string | null;
          image_prompt: string | null;
          liked_by_user_ids: string[];
          rating: number;
          text: string;
          voted_by_user_ids: string[] | null;
        }[];
      };
      get_example_good_scenarios: {
        Args: Record<PropertyKey, never>;
        Returns: {
          created_at: string;
          disliked_by_user_ids: string[];
          id: number;
          image_creator_ai_model_id: string | null;
          image_path: string | null;
          image_prompt: string | null;
          liked_by_user_ids: string[];
          rating: number;
          text: string;
          voted_by_user_ids: string[] | null;
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
      set_option_rating: {
        Args: {
          rating_key: string;
          session_id: number;
          rating: Json;
        };
        Returns: undefined;
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
