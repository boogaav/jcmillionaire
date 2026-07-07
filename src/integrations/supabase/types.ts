export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      answer_stats: {
        Row: {
          choice_a_count: number
          choice_b_count: number
          choice_c_count: number
          choice_d_count: number
          id: string
          question_id: string
        }
        Insert: {
          choice_a_count?: number
          choice_b_count?: number
          choice_c_count?: number
          choice_d_count?: number
          id?: string
          question_id: string
        }
        Update: {
          choice_a_count?: number
          choice_b_count?: number
          choice_c_count?: number
          choice_d_count?: number
          id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_stats_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      answers: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          question_number: number
          run_id: string
          selected: string
          time_taken_ms: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct: boolean
          question_id: string
          question_number: number
          run_id: string
          selected: string
          time_taken_ms: number
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          question_number?: number
          run_id?: string
          selected?: string
          time_taken_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      attempts: {
        Row: {
          cap: number
          day_id: string
          earned_from_referrals: number
          free_granted: boolean
          id: string
          used: number
          user_id: string
        }
        Insert: {
          cap?: number
          day_id: string
          earned_from_referrals?: number
          free_granted?: boolean
          id?: string
          used?: number
          user_id: string
        }
        Update: {
          cap?: number
          day_id?: string
          earned_from_referrals?: number
          free_granted?: boolean
          id?: string
          used?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_nonces: {
        Row: {
          created_at: string
          nonce: string
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          nonce: string
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          nonce?: string
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      claims: {
        Row: {
          amount: number
          created_at: string
          day_id: string
          expires_at: string
          id: string
          nonce: string
          run_id: string
          status: Database["public"]["Enums"]["claim_status"]
          tx_hash: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          day_id: string
          expires_at: string
          id?: string
          nonce: string
          run_id: string
          status?: Database["public"]["Enums"]["claim_status"]
          tx_hash?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          day_id?: string
          expires_at?: string
          id?: string
          nonce?: string
          run_id?: string
          status?: Database["public"]["Enums"]["claim_status"]
          tx_hash?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      day_state: {
        Row: {
          created_at: string
          day_id: string
          pool_locked: number
          pool_remaining: number
          pool_total: number
        }
        Insert: {
          created_at?: string
          day_id: string
          pool_locked?: number
          pool_remaining?: number
          pool_total?: number
        }
        Update: {
          created_at?: string
          day_id?: string
          pool_locked?: number
          pool_remaining?: number
          pool_total?: number
        }
        Relationships: []
      }
      leaderboard_snapshots: {
        Row: {
          created_at: string
          day_id: string
          id: string
          rank: number
          total_claimed: number
          user_id: string
        }
        Insert: {
          created_at?: string
          day_id: string
          id?: string
          rank: number
          total_claimed: number
          user_id: string
        }
        Update: {
          created_at?: string
          day_id?: string
          id?: string
          rank?: number
          total_claimed?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      live_answers: {
        Row: {
          answered_at: string
          choice: string
          id: string
          is_correct: boolean | null
          question_id: string
          session_id: string
          user_id: string
        }
        Insert: {
          answered_at?: string
          choice: string
          id?: string
          is_correct?: boolean | null
          question_id: string
          session_id: string
          user_id: string
        }
        Update: {
          answered_at?: string
          choice?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "live_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_participants: {
        Row: {
          current_ladder_amount: number
          display_name: string | null
          id: string
          is_eliminated: boolean
          joined_at: string
          reached_index: number
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          current_ladder_amount?: number
          display_name?: string | null
          id?: string
          is_eliminated?: boolean
          joined_at?: string
          reached_index?: number
          role?: string
          session_id: string
          user_id: string
        }
        Update: {
          current_ladder_amount?: number
          display_name?: string | null
          id?: string
          is_eliminated?: boolean
          joined_at?: string
          reached_index?: number
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_questions: {
        Row: {
          choice_a: string
          choice_b: string
          choice_c: string
          choice_d: string
          correct_choice: string
          created_at: string
          id: string
          order_index: number
          prize_amount: number
          question: string
          quiz_set_id: string
        }
        Insert: {
          choice_a: string
          choice_b: string
          choice_c: string
          choice_d: string
          correct_choice: string
          created_at?: string
          id?: string
          order_index: number
          prize_amount?: number
          question: string
          quiz_set_id: string
        }
        Update: {
          choice_a?: string
          choice_b?: string
          choice_c?: string
          choice_d?: string
          correct_choice?: string
          created_at?: string
          id?: string
          order_index?: number
          prize_amount?: number
          question?: string
          quiz_set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_questions_quiz_set_id_fkey"
            columns: ["quiz_set_id"]
            isOneToOne: false
            referencedRelation: "live_quiz_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      live_quiz_sets: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      live_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          current_question_index: number
          current_question_started_at: string | null
          id: string
          is_active: boolean
          quiz_set_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_question_index?: number
          current_question_started_at?: string | null
          id?: string
          is_active?: boolean
          quiz_set_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_question_index?: number
          current_question_started_at?: string | null
          id?: string
          is_active?: boolean
          quiz_set_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_quiz_set_id_fkey"
            columns: ["quiz_set_id"]
            isOneToOne: false
            referencedRelation: "live_quiz_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      prize_ladder: {
        Row: {
          is_safe_haven: boolean
          prize_amount: number
          question_number: number
        }
        Insert: {
          is_safe_haven?: boolean
          prize_amount: number
          question_number: number
        }
        Update: {
          is_safe_haven?: boolean
          prize_amount?: number
          question_number?: number
        }
        Relationships: []
      }
      questions: {
        Row: {
          active_dates: string
          category: string
          choice_a: string
          choice_a_es: string | null
          choice_a_hi: string | null
          choice_a_id: string | null
          choice_a_th: string | null
          choice_b: string
          choice_b_es: string | null
          choice_b_hi: string | null
          choice_b_id: string | null
          choice_b_th: string | null
          choice_c: string
          choice_c_es: string | null
          choice_c_hi: string | null
          choice_c_id: string | null
          choice_c_th: string | null
          choice_d: string
          choice_d_es: string | null
          choice_d_hi: string | null
          choice_d_id: string | null
          choice_d_th: string | null
          correct_choice: string
          created_at: string
          difficulty: number
          hint: string
          hint_es: string | null
          hint_hi: string | null
          hint_id: string | null
          hint_th: string | null
          id: string
          image_url: string | null
          is_active: boolean
          question: string
          question_es: string | null
          question_hi: string | null
          question_id: string | null
          question_th: string | null
          text_hash: string
        }
        Insert: {
          active_dates?: string
          category: string
          choice_a: string
          choice_a_es?: string | null
          choice_a_hi?: string | null
          choice_a_id?: string | null
          choice_a_th?: string | null
          choice_b: string
          choice_b_es?: string | null
          choice_b_hi?: string | null
          choice_b_id?: string | null
          choice_b_th?: string | null
          choice_c: string
          choice_c_es?: string | null
          choice_c_hi?: string | null
          choice_c_id?: string | null
          choice_c_th?: string | null
          choice_d: string
          choice_d_es?: string | null
          choice_d_hi?: string | null
          choice_d_id?: string | null
          choice_d_th?: string | null
          correct_choice: string
          created_at?: string
          difficulty: number
          hint: string
          hint_es?: string | null
          hint_hi?: string | null
          hint_id?: string | null
          hint_th?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          question: string
          question_es?: string | null
          question_hi?: string | null
          question_id?: string | null
          question_th?: string | null
          text_hash: string
        }
        Update: {
          active_dates?: string
          category?: string
          choice_a?: string
          choice_a_es?: string | null
          choice_a_hi?: string | null
          choice_a_id?: string | null
          choice_a_th?: string | null
          choice_b?: string
          choice_b_es?: string | null
          choice_b_hi?: string | null
          choice_b_id?: string | null
          choice_b_th?: string | null
          choice_c?: string
          choice_c_es?: string | null
          choice_c_hi?: string | null
          choice_c_id?: string | null
          choice_c_th?: string | null
          choice_d?: string
          choice_d_es?: string | null
          choice_d_hi?: string | null
          choice_d_id?: string | null
          choice_d_th?: string | null
          correct_choice?: string
          created_at?: string
          difficulty?: number
          hint?: string
          hint_es?: string | null
          hint_hi?: string | null
          hint_id?: string | null
          hint_th?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          question?: string
          question_es?: string | null
          question_hi?: string | null
          question_id?: string | null
          question_th?: string | null
          text_hash?: string
        }
        Relationships: []
      }
      referral_failures: {
        Row: {
          attempted_code: string
          created_at: string
          failure_reason: string
          id: string
          ip_hint: string | null
          user_id: string | null
        }
        Insert: {
          attempted_code: string
          created_at?: string
          failure_reason: string
          id?: string
          ip_hint?: string | null
          user_id?: string | null
        }
        Update: {
          attempted_code?: string
          created_at?: string
          failure_reason?: string
          id?: string
          ip_hint?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          invited_user_id: string | null
          inviter_user_id: string
          status: Database["public"]["Enums"]["referral_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code: string
          invited_user_id?: string | null
          inviter_user_id: string
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          invited_user_id?: string | null
          inviter_user_id?: string
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Relationships: [
          {
            foreignKeyName: "referrals_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_inviter_user_id_fkey"
            columns: ["inviter_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      runs: {
        Row: {
          current_question_id: string | null
          day_id: string
          earned_amount: number
          earned_tier: number
          ended_at: string | null
          id: string
          lifelines_used: Database["public"]["Enums"]["lifeline_type"][]
          question_started_at: string | null
          reached_q: number
          started_at: string
          status: Database["public"]["Enums"]["run_status"]
          user_id: string
        }
        Insert: {
          current_question_id?: string | null
          day_id: string
          earned_amount?: number
          earned_tier?: number
          ended_at?: string | null
          id?: string
          lifelines_used?: Database["public"]["Enums"]["lifeline_type"][]
          question_started_at?: string | null
          reached_q?: number
          started_at?: string
          status?: Database["public"]["Enums"]["run_status"]
          user_id: string
        }
        Update: {
          current_question_id?: string | null
          day_id?: string
          earned_amount?: number
          earned_tier?: number
          ended_at?: string | null
          id?: string
          lifelines_used?: Database["public"]["Enums"]["lifeline_type"][]
          question_started_at?: string | null
          reached_q?: number
          started_at?: string
          status?: Database["public"]["Enums"]["run_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "runs_current_question_id_fkey"
            columns: ["current_question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_balances: {
        Row: {
          created_at: string
          id: string
          total_claimed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          total_claimed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          total_claimed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_play_date: string | null
          longest_streak: number
          total_days_played: number
          total_earned: number
          total_runs: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_play_date?: string | null
          longest_streak?: number
          total_days_played?: number
          total_earned?: number
          total_runs?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_play_date?: string | null
          longest_streak?: number
          total_days_played?: number
          total_earned?: number
          total_runs?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          id: string
          nullifier_hash: string
          profile_picture_url: string | null
          referral_code: string | null
          solana_address: string | null
          updated_at: string
          username: string | null
          verification_level: Database["public"]["Enums"]["verification_level"]
          wallet_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          nullifier_hash: string
          profile_picture_url?: string | null
          referral_code?: string | null
          solana_address?: string | null
          updated_at?: string
          username?: string | null
          verification_level?: Database["public"]["Enums"]["verification_level"]
          wallet_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          nullifier_hash?: string
          profile_picture_url?: string | null
          referral_code?: string | null
          solana_address?: string | null
          updated_at?: string
          username?: string | null
          verification_level?: Database["public"]["Enums"]["verification_level"]
          wallet_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_create_run: { Args: { p_user_id: string }; Returns: boolean }
      get_or_create_day_state: {
        Args: { p_day_id: string }
        Returns: {
          created_at: string
          day_id: string
          pool_locked: number
          pool_remaining: number
          pool_total: number
        }
        SetofOptions: {
          from: "*"
          to: "day_state"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      claim_status: "authorized" | "submitted" | "confirmed" | "expired"
      lifeline_type: "fifty_fifty" | "hint" | "chain_scan"
      referral_status: "clicked" | "verified" | "first_run_completed"
      run_status: "active" | "completed" | "abandoned"
      verification_level: "device" | "orb"
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
  public: {
    Enums: {
      app_role: ["admin", "user"],
      claim_status: ["authorized", "submitted", "confirmed", "expired"],
      lifeline_type: ["fifty_fifty", "hint", "chain_scan"],
      referral_status: ["clicked", "verified", "first_run_completed"],
      run_status: ["active", "completed", "abandoned"],
      verification_level: ["device", "orb"],
    },
  },
} as const
