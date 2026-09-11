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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      asset_prices: {
        Row: {
          as_of: string | null
          change_percent: number
          currency: string
          market_symbol: string
          price: number
          price_kwd: number
          source: string
          ticker: string
          updated_at: string
          usd_kwd: number
        }
        Insert: {
          as_of?: string | null
          change_percent?: number
          currency?: string
          market_symbol: string
          price?: number
          price_kwd?: number
          source?: string
          ticker: string
          updated_at?: string
          usd_kwd?: number
        }
        Update: {
          as_of?: string | null
          change_percent?: number
          currency?: string
          market_symbol?: string
          price?: number
          price_kwd?: number
          source?: string
          ticker?: string
          updated_at?: string
          usd_kwd?: number
        }
        Relationships: []
      }
      holdings: {
        Row: {
          asset_class_ar: string
          asset_name_ar: string
          id: string
          target_weight: number
          ticker: string
          units: number
          updated_at: string
          user_id: string
          user_portfolio_id: string
          value_kwd: number
        }
        Insert: {
          asset_class_ar: string
          asset_name_ar: string
          id?: string
          target_weight: number
          ticker: string
          units?: number
          updated_at?: string
          user_id: string
          user_portfolio_id: string
          value_kwd?: number
        }
        Update: {
          asset_class_ar?: string
          asset_name_ar?: string
          id?: string
          target_weight?: number
          ticker?: string
          units?: number
          updated_at?: string
          user_id?: string
          user_portfolio_id?: string
          value_kwd?: number
        }
        Relationships: [
          {
            foreignKeyName: "holdings_user_portfolio_id_fkey"
            columns: ["user_portfolio_id"]
            isOneToOne: false
            referencedRelation: "user_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      model_portfolios: {
        Row: {
          code: string
          created_at: string
          description_ar: string
          expected_return: number
          id: string
          max_score: number
          min_score: number
          name_ar: string
          risk_level: number
          sort_order: number
          volatility: number
        }
        Insert: {
          code: string
          created_at?: string
          description_ar: string
          expected_return: number
          id?: string
          max_score: number
          min_score: number
          name_ar: string
          risk_level: number
          sort_order?: number
          volatility: number
        }
        Update: {
          code?: string
          created_at?: string
          description_ar?: string
          expected_return?: number
          id?: string
          max_score?: number
          min_score?: number
          name_ar?: string
          risk_level?: number
          sort_order?: number
          volatility?: number
        }
        Relationships: []
      }
      portfolio_allocations: {
        Row: {
          asset_class_ar: string
          asset_name_ar: string
          id: string
          portfolio_id: string
          target_weight: number
          ticker: string
        }
        Insert: {
          asset_class_ar: string
          asset_name_ar: string
          id?: string
          portfolio_id: string
          target_weight: number
          ticker: string
        }
        Update: {
          asset_class_ar?: string
          asset_name_ar?: string
          id?: string
          portfolio_id?: string
          target_weight?: number
          ticker?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_allocations_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "model_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          share_portfolio: boolean
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          share_portfolio?: boolean
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          share_portfolio?: boolean
        }
        Relationships: []
      }
      rebalance_events: {
        Row: {
          created_at: string
          id: string
          max_drift: number
          trades: Json
          user_id: string
          user_portfolio_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_drift: number
          trades?: Json
          user_id: string
          user_portfolio_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_drift?: number
          trades?: Json
          user_id?: string
          user_portfolio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rebalance_events_user_portfolio_id_fkey"
            columns: ["user_portfolio_id"]
            isOneToOne: false
            referencedRelation: "user_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_assessments: {
        Row: {
          answers: Json
          created_at: string
          expected_return: number
          id: string
          recommended_portfolio_id: string | null
          risk_level: number
          score: number
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          expected_return: number
          id?: string
          recommended_portfolio_id?: string | null
          risk_level: number
          score: number
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          expected_return?: number
          id?: string
          recommended_portfolio_id?: string | null
          risk_level?: number
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_assessments_recommended_portfolio_id_fkey"
            columns: ["recommended_portfolio_id"]
            isOneToOne: false
            referencedRelation: "model_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_portfolio_directory: {
        Row: {
          masked_name: string
          portfolio_name: string
          total_assets_kwd: number
          updated_at: string
          user_id: string
          user_portfolio_id: string
        }
        Insert: {
          masked_name: string
          portfolio_name: string
          total_assets_kwd?: number
          updated_at?: string
          user_id: string
          user_portfolio_id: string
        }
        Update: {
          masked_name?: string
          portfolio_name?: string
          total_assets_kwd?: number
          updated_at?: string
          user_id?: string
          user_portfolio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_portfolio_directory_user_portfolio_id_fkey"
            columns: ["user_portfolio_id"]
            isOneToOne: true
            referencedRelation: "user_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      user_portfolios: {
        Row: {
          amount_kwd: number
          created_at: string
          id: string
          is_active: boolean
          portfolio_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_kwd?: number
          created_at?: string
          id?: string
          is_active?: boolean
          portfolio_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_kwd?: number
          created_at?: string
          id?: string
          is_active?: boolean
          portfolio_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_portfolios_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "model_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount_kwd: number
          confirmed_at: string | null
          created_at: string
          failure_reason: string | null
          id: string
          idempotency_key: string
          metadata: Json
          provider: string
          provider_reference: string | null
          status: string
          transaction_type: string
          updated_at: string
          user_id: string
          user_portfolio_id: string
        }
        Insert: {
          amount_kwd: number
          confirmed_at?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          idempotency_key?: string
          metadata?: Json
          provider?: string
          provider_reference?: string | null
          status?: string
          transaction_type: string
          updated_at?: string
          user_id: string
          user_portfolio_id: string
        }
        Update: {
          amount_kwd?: number
          confirmed_at?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          idempotency_key?: string
          metadata?: Json
          provider?: string
          provider_reference?: string | null
          status?: string
          transaction_type?: string
          updated_at?: string
          user_id?: string
          user_portfolio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_user_portfolio_id_fkey"
            columns: ["user_portfolio_id"]
            isOneToOne: false
            referencedRelation: "user_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      shared_portfolios_public: {
        Row: {
          masked_name: string | null
          portfolio_name: string | null
          total_assets_kwd: number | null
          updated_at: string | null
        }
        Insert: {
          masked_name?: string | null
          portfolio_name?: string | null
          total_assets_kwd?: number | null
          updated_at?: string | null
        }
        Update: {
          masked_name?: string | null
          portfolio_name?: string | null
          total_assets_kwd?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      finalize_wallet_deposit: {
        Args: { _payment_id: string; _transaction_id: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
