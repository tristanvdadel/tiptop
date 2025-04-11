export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      hour_registrations: {
        Row: {
          created_at: string
          date: string
          hours: number
          id: string
          processed: boolean | null
          team_member_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          hours: number
          id?: string
          processed?: boolean | null
          team_member_id: string
        }
        Update: {
          created_at?: string
          date?: string
          hours?: number
          id?: string
          processed?: boolean | null
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hour_registrations_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          permissions: Json | null
          role: string
          team_id: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          permissions?: Json | null
          role: string
          team_id: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          permissions?: Json | null
          role?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_distributions: {
        Row: {
          actual_amount: number | null
          amount: number
          balance: number | null
          created_at: string
          id: string
          payout_id: string
          team_member_id: string
        }
        Insert: {
          actual_amount?: number | null
          amount: number
          balance?: number | null
          created_at?: string
          id?: string
          payout_id: string
          team_member_id: string
        }
        Update: {
          actual_amount?: number | null
          amount?: number
          balance?: number | null
          created_at?: string
          id?: string
          payout_id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_distributions_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_distributions_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_periods: {
        Row: {
          created_at: string
          id: string
          payout_id: string
          period_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payout_id: string
          period_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payout_id?: string
          period_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_periods_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_periods_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          created_at: string
          date: string
          id: string
          payer_name: string | null
          payout_time: string
          team_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          payer_name?: string | null
          payout_time?: string
          team_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          payer_name?: string | null
          payout_time?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      periods: {
        Row: {
          auto_close_date: string | null
          average_tip_per_hour: number | null
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          is_paid: boolean
          name: string | null
          notes: string | null
          start_date: string
          team_id: string
        }
        Insert: {
          auto_close_date?: string | null
          average_tip_per_hour?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          is_paid?: boolean
          name?: string | null
          notes?: string | null
          start_date?: string
          team_id: string
        }
        Update: {
          auto_close_date?: string | null
          average_tip_per_hour?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          is_paid?: boolean
          name?: string | null
          notes?: string | null
          start_date?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "periods_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          balance: number | null
          created_at: string
          hours: number | null
          id: string
          permissions: Json | null
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string
          hours?: number | null
          id?: string
          permissions?: Json | null
          role: string
          team_id: string
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string
          hours?: number | null
          id?: string
          permissions?: Json | null
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_settings: {
        Row: {
          align_with_calendar: boolean
          auto_close_periods: boolean
          closing_time: Json
          id: string
          period_duration: string
          team_id: string
          updated_at: string
        }
        Insert: {
          align_with_calendar?: boolean
          auto_close_periods?: boolean
          closing_time?: Json
          id?: string
          period_duration?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          align_with_calendar?: boolean
          auto_close_periods?: boolean
          closing_time?: Json
          id?: string
          period_duration?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_settings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      tips: {
        Row: {
          added_by: string
          amount: number
          created_at: string
          date: string
          id: string
          note: string | null
          period_id: string
        }
        Insert: {
          added_by: string
          amount: number
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          period_id: string
        }
        Update: {
          added_by?: string
          amount?: number
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          period_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tips_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_team_member: {
        Args: {
          team_id_param: string
          user_id_param: string
          role_param: string
          permissions_param: Json
        }
        Returns: string
      }
      check_team_membership: {
        Args: { user_id_param: string; team_id_param: string }
        Returns: boolean
      }
      create_team_with_admin: {
        Args: { name_param: string; user_id_param: string }
        Returns: string
      }
      get_team_members: {
        Args: { team_id_param: string }
        Returns: {
          balance: number | null
          created_at: string
          hours: number | null
          id: string
          permissions: Json | null
          role: string
          team_id: string
          user_id: string
        }[]
      }
      get_team_members_safe: {
        Args: { team_id_param: string }
        Returns: {
          balance: number | null
          created_at: string
          hours: number | null
          id: string
          permissions: Json | null
          role: string
          team_id: string
          user_id: string
        }[]
      }
      get_user_teams: {
        Args: { user_id_param: string }
        Returns: {
          created_at: string
          created_by: string
          id: string
          name: string
        }[]
      }
      get_user_teams_safe: {
        Args: { user_id_param: string }
        Returns: {
          created_at: string
          created_by: string
          id: string
          name: string
        }[]
      }
      is_team_admin: {
        Args: { user_id: string; team_id: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { user_id: string; team_id: string }
        Returns: boolean
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
