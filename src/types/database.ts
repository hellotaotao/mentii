export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      participants: {
        Row: {
          emoji: string
          joined_at: string
          nickname: string
          participant_id: string
          real_name: string | null
          session_id: string
        }
        Insert: {
          emoji?: string
          joined_at?: string
          nickname: string
          participant_id: string
          real_name?: string | null
          session_id: string
        }
        Update: {
          emoji?: string
          joined_at?: string
          nickname?: string
          participant_id?: string
          real_name?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      q_and_a_entries: {
        Row: {
          answered_at: string | null
          created_at: string
          id: string
          participant_id: string
          question_id: string
          text: string
        }
        Insert: {
          answered_at?: string | null
          created_at?: string
          id?: string
          participant_id: string
          question_id: string
          text: string
        }
        Update: {
          answered_at?: string | null
          created_at?: string
          id?: string
          participant_id?: string
          question_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "q_and_a_entries_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      q_and_a_entry_upvotes: {
        Row: {
          created_at: string
          entry_id: string
          participant_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          participant_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "q_and_a_entry_upvotes_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "q_and_a_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      question_result_signals: {
        Row: {
          question_id: string
          updated_at: string
          version: number
        }
        Insert: {
          question_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          question_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "question_result_signals_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          config: Json
          created_at: string
          id: string
          order_index: number
          session_id: string
          title: string
          type: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          order_index: number
          session_id: string
          title: string
          type: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          order_index?: number
          session_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          code: string
          created_at: string
          current_question_id: string | null
          host_id: string | null
          id: string
          name: string
          question_cycle_started_at: string
          results_hidden: boolean
          state: string
          voting_open: boolean
        }
        Insert: {
          code: string
          created_at?: string
          current_question_id?: string | null
          host_id?: string | null
          id?: string
          name?: string
          question_cycle_started_at?: string
          results_hidden?: boolean
          state?: string
          voting_open?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          current_question_id?: string | null
          host_id?: string | null
          id?: string
          name?: string
          question_cycle_started_at?: string
          results_hidden?: boolean
          state?: string
          voting_open?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "sessions_current_question_id_fkey"
            columns: ["current_question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          created_at: string
          id: string
          participant_id: string
          question_id: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          participant_id: string
          question_id: string
          value: Json
        }
        Update: {
          created_at?: string
          id?: string
          participant_id?: string
          question_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "votes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_session: {
        Args: { target_session_id: string }
        Returns: boolean
      }
      duplicate_room: {
        Args: { next_room_name: string; source_session_id: string }
        Returns: string
      }
      get_my_participant: { Args: { target_session_id: string }; Returns: Json }
      get_my_quiz_status: { Args: { target_session_id: string }; Returns: Json }
      get_question_results: {
        Args: { target_question_id: string }
        Returns: Json
      }
      get_quiz_leaderboard: {
        Args: { max_entries?: number; target_session_id: string }
        Returns: Json
      }
      join_session: {
        Args: {
          next_emoji: string
          next_nickname: string
          target_session_id: string
        }
        Returns: Json
      }
      participant_profile_json: {
        Args: { target_participant_id: string; target_session_id: string }
        Returns: Json
      }
      quiz_correct_option_idx: {
        Args: { question_config: Json }
        Returns: number
      }
      quiz_duration_seconds: {
        Args: { question_config: Json }
        Returns: number
      }
      quiz_scoreboard: {
        Args: { target_session_id: string }
        Returns: {
          answered_last: boolean
          correct_count: number
          emoji: string
          last_points: number
          nickname: string
          participant_id: string
          previous_rank: number
          rank: number
          real_name: string
          score: number
        }[]
      }
      reorder_questions: {
        Args: { ordered_question_ids: string[]; target_session_id: string }
        Returns: undefined
      }
      requesting_participant_id: { Args: never; Returns: string }
      reset_question_results: {
        Args: { target_question_id: string }
        Returns: undefined
      }
      reset_question_votes: {
        Args: { target_question_id: string }
        Returns: undefined
      }
      reset_session_results: {
        Args: { target_session_id: string }
        Returns: undefined
      }
      set_participant_real_name: {
        Args: { next_real_name: string; target_session_id: string }
        Returns: Json
      }
      set_q_and_a_entry_answered: {
        Args: { next_answered: boolean; target_entry_id: string }
        Returns: undefined
      }
      submit_q_and_a_entry: {
        Args: { entry_text: string; target_question_id: string }
        Returns: string
      }
      upvote_q_and_a_entry: {
        Args: { target_entry_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

