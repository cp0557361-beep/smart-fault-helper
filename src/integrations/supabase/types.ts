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
      areas: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_logs: {
        Row: {
          ai_classified_fault: string | null
          area_id: string
          created_at: string
          description: string | null
          fault_type_id: string | null
          id: string
          machine_id: string
          operator_id: string
          photo_url: string | null
          production_line_id: string
          raw_voice_text: string | null
          status: Database["public"]["Enums"]["event_status"] | null
          supervisor_id: string | null
          supervisor_notes: string | null
          updated_at: string
          validated_at: string | null
        }
        Insert: {
          ai_classified_fault?: string | null
          area_id: string
          created_at?: string
          description?: string | null
          fault_type_id?: string | null
          id?: string
          machine_id: string
          operator_id: string
          photo_url?: string | null
          production_line_id: string
          raw_voice_text?: string | null
          status?: Database["public"]["Enums"]["event_status"] | null
          supervisor_id?: string | null
          supervisor_notes?: string | null
          updated_at?: string
          validated_at?: string | null
        }
        Update: {
          ai_classified_fault?: string | null
          area_id?: string
          created_at?: string
          description?: string | null
          fault_type_id?: string | null
          id?: string
          machine_id?: string
          operator_id?: string
          photo_url?: string | null
          production_line_id?: string
          raw_voice_text?: string | null
          status?: Database["public"]["Enums"]["event_status"] | null
          supervisor_id?: string | null
          supervisor_notes?: string | null
          updated_at?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_logs_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_logs_fault_type_id_fkey"
            columns: ["fault_type_id"]
            isOneToOne: false
            referencedRelation: "fault_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_logs_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_logs_production_line_id_fkey"
            columns: ["production_line_id"]
            isOneToOne: false
            referencedRelation: "production_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      fault_types: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          keywords: string[] | null
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      glossary_learning: {
        Row: {
          created_at: string
          id: string
          is_mapped: boolean | null
          mapped_at: string | null
          mapped_by: string | null
          occurrences: number | null
          suggested_fault_type_id: string | null
          term: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_mapped?: boolean | null
          mapped_at?: string | null
          mapped_by?: string | null
          occurrences?: number | null
          suggested_fault_type_id?: string | null
          term: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_mapped?: boolean | null
          mapped_at?: string | null
          mapped_by?: string | null
          occurrences?: number | null
          suggested_fault_type_id?: string | null
          term?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "glossary_learning_suggested_fault_type_id_fkey"
            columns: ["suggested_fault_type_id"]
            isOneToOne: false
            referencedRelation: "fault_types"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_section_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          machine_type: string
          section_name: string
          sequence_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          machine_type: string
          section_name: string
          sequence_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          machine_type?: string
          section_name?: string
          sequence_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      machine_sections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          machine_id: string
          name: string
          sequence_order: number | null
          status: Database["public"]["Enums"]["machine_status"] | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          machine_id: string
          name: string
          sequence_order?: number | null
          status?: Database["public"]["Enums"]["machine_status"] | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          machine_id?: string
          name?: string
          sequence_order?: number | null
          status?: Database["public"]["Enums"]["machine_status"] | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "machine_sections_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machine_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "machine_section_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          sequence_order: number | null
          sequences: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sequence_order?: number | null
          sequences?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sequence_order?: number | null
          sequences?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      machines: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          machine_type: string | null
          name: string
          nameplate_image_url: string | null
          production_line_id: string
          sequence_order: number | null
          sequences: string[] | null
          serial_number: string | null
          status: Database["public"]["Enums"]["machine_status"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          machine_type?: string | null
          name: string
          nameplate_image_url?: string | null
          production_line_id: string
          sequence_order?: number | null
          sequences?: string[] | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["machine_status"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          machine_type?: string | null
          name?: string
          nameplate_image_url?: string | null
          production_line_id?: string
          sequence_order?: number | null
          sequences?: string[] | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["machine_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "machines_production_line_id_fkey"
            columns: ["production_line_id"]
            isOneToOne: false
            referencedRelation: "production_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      production_lines: {
        Row: {
          area_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          sequence_order: number | null
          updated_at: string
        }
        Insert: {
          area_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sequence_order?: number | null
          updated_at?: string
        }
        Update: {
          area_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sequence_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_lines_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      section_attribute_definitions: {
        Row: {
          attribute_name: string
          attribute_type: string
          created_at: string
          id: string
          is_required: boolean | null
          options: Json | null
          sequence_order: number | null
          template_id: string | null
        }
        Insert: {
          attribute_name: string
          attribute_type?: string
          created_at?: string
          id?: string
          is_required?: boolean | null
          options?: Json | null
          sequence_order?: number | null
          template_id?: string | null
        }
        Update: {
          attribute_name?: string
          attribute_type?: string
          created_at?: string
          id?: string
          is_required?: boolean | null
          options?: Json | null
          sequence_order?: number | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "section_attribute_definitions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "machine_section_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      section_attribute_values: {
        Row: {
          attribute_definition_id: string | null
          attribute_name: string
          attribute_value: string | null
          created_at: string
          id: string
          section_id: string
          updated_at: string
        }
        Insert: {
          attribute_definition_id?: string | null
          attribute_name: string
          attribute_value?: string | null
          created_at?: string
          id?: string
          section_id: string
          updated_at?: string
        }
        Update: {
          attribute_definition_id?: string | null
          attribute_name?: string
          attribute_value?: string | null
          created_at?: string
          id?: string
          section_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_attribute_values_attribute_definition_id_fkey"
            columns: ["attribute_definition_id"]
            isOneToOne: false
            referencedRelation: "section_attribute_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_attribute_values_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "machine_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_area_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_area_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_area_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_assigned_area_id_fkey"
            columns: ["assigned_area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_operador: { Args: never; Returns: boolean }
      is_supervisor: { Args: never; Returns: boolean }
      supervisor_oversees_area: { Args: { _area_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "operador" | "supervisor" | "admin"
      event_status: "open" | "in_review" | "validated" | "closed"
      machine_status: "ok" | "warning" | "fault"
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
      app_role: ["operador", "supervisor", "admin"],
      event_status: ["open", "in_review", "validated", "closed"],
      machine_status: ["ok", "warning", "fault"],
    },
  },
} as const
