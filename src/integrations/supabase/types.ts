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
      blood_banks: {
        Row: {
          address: string
          availability: string | null
          contact: string | null
          created_at: string
          id: string
          name: string
          rating: number | null
          services: string | null
          type: string | null
        }
        Insert: {
          address: string
          availability?: string | null
          contact?: string | null
          created_at?: string
          id?: string
          name: string
          rating?: number | null
          services?: string | null
          type?: string | null
        }
        Update: {
          address?: string
          availability?: string | null
          contact?: string | null
          created_at?: string
          id?: string
          name?: string
          rating?: number | null
          services?: string | null
          type?: string | null
        }
        Relationships: []
      }
      blood_donation_requests: {
        Row: {
          blood_group: string
          created_at: string
          doctor_id: string | null
          doctor_note: string | null
          id: string
          patient_id: string
          preferred_bank_id: string | null
          reason: string | null
          status: string
          units_needed: number
          updated_at: string
          urgency: string
        }
        Insert: {
          blood_group: string
          created_at?: string
          doctor_id?: string | null
          doctor_note?: string | null
          id?: string
          patient_id: string
          preferred_bank_id?: string | null
          reason?: string | null
          status?: string
          units_needed?: number
          updated_at?: string
          urgency?: string
        }
        Update: {
          blood_group?: string
          created_at?: string
          doctor_id?: string | null
          doctor_note?: string | null
          id?: string
          patient_id?: string
          preferred_bank_id?: string | null
          reason?: string | null
          status?: string
          units_needed?: number
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "blood_donation_requests_preferred_bank_id_fkey"
            columns: ["preferred_bank_id"]
            isOneToOne: false
            referencedRelation: "blood_banks"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_profiles: {
        Row: {
          allergies: string | null
          blood_group: string | null
          created_at: string
          diseases: string | null
          emergency_contact: string | null
          id: string
          user_id: string
        }
        Insert: {
          allergies?: string | null
          blood_group?: string | null
          created_at?: string
          diseases?: string | null
          emergency_contact?: string | null
          id?: string
          user_id: string
        }
        Update: {
          allergies?: string | null
          blood_group?: string | null
          created_at?: string
          diseases?: string | null
          emergency_contact?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      medicine_logs: {
        Row: {
          id: string
          reminder_id: string
          taken_at: string
          taken_date: string
          user_id: string
        }
        Insert: {
          id?: string
          reminder_id: string
          taken_at?: string
          taken_date?: string
          user_id: string
        }
        Update: {
          id?: string
          reminder_id?: string
          taken_at?: string
          taken_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicine_logs_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          blood_group: string | null
          created_at: string
          email: string
          id: string
          mobile: string | null
          name: string
          specialization: string | null
          user_id: string
        }
        Insert: {
          age?: number | null
          blood_group?: string | null
          created_at?: string
          email: string
          id?: string
          mobile?: string | null
          name: string
          specialization?: string | null
          user_id: string
        }
        Update: {
          age?: number | null
          blood_group?: string | null
          created_at?: string
          email?: string
          id?: string
          mobile?: string | null
          name?: string
          specialization?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          dosage: string | null
          id: string
          medicine_name: string
          time: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dosage?: string | null
          id?: string
          medicine_name: string
          time: string
          user_id: string
        }
        Update: {
          created_at?: string
          dosage?: string | null
          id?: string
          medicine_name?: string
          time?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          extracted_data: Json | null
          file_name: string | null
          file_url: string
          id: string
          upload_date: string
          user_id: string
        }
        Insert: {
          extracted_data?: Json | null
          file_name?: string | null
          file_url: string
          id?: string
          upload_date?: string
          user_id: string
        }
        Update: {
          extracted_data?: Json | null
          file_name?: string | null
          file_url?: string
          id?: string
          upload_date?: string
          user_id?: string
        }
        Relationships: []
      }
      risk_records: {
        Row: {
          age: number | null
          bp: string | null
          created_at: string
          id: string
          risk_score: string
          sugar_level: number | null
          user_id: string
          weight: number | null
        }
        Insert: {
          age?: number | null
          bp?: string | null
          created_at?: string
          id?: string
          risk_score: string
          sugar_level?: number | null
          user_id: string
          weight?: number | null
        }
        Update: {
          age?: number | null
          bp?: string | null
          created_at?: string
          id?: string
          risk_score?: string
          sugar_level?: number | null
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          id: string
          message: string
          phone_number: string | null
          reminder_id: string | null
          sent_at: string
          sent_date: string
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          message: string
          phone_number?: string | null
          reminder_id?: string | null
          sent_at?: string
          sent_date?: string
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          message?: string
          phone_number?: string | null
          reminder_id?: string | null
          sent_at?: string
          sent_date?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "patient" | "doctor"
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
      app_role: ["patient", "doctor"],
    },
  },
} as const
