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
      documents: {
        Row: {
          approved: boolean | null
          created_at: string
          doc_type: string
          file_path: string | null
          id: string
          name: string
          site_id: string | null
          status: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          approved?: boolean | null
          created_at?: string
          doc_type: string
          file_path?: string | null
          id?: string
          name: string
          site_id?: string | null
          status?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          approved?: boolean | null
          created_at?: string
          doc_type?: string
          file_path?: string | null
          id?: string
          name?: string
          site_id?: string | null
          status?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      embeddings: {
        Row: {
          content_hash: string
          created_at: string
          id: string
          metadata: Json | null
          pinecone_id: string
          source_id: string | null
          source_type: string
          updated_at: string
        }
        Insert: {
          content_hash: string
          created_at?: string
          id?: string
          metadata?: Json | null
          pinecone_id: string
          source_id?: string | null
          source_type: string
          updated_at?: string
        }
        Update: {
          content_hash?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          pinecone_id?: string
          source_id?: string | null
          source_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      feedback_events: {
        Row: {
          created_at: string
          feedback_type: Database["public"]["Enums"]["feedback_type"]
          id: string
          notes: string | null
          study_id: string
          triage_result_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          feedback_type: Database["public"]["Enums"]["feedback_type"]
          id?: string
          notes?: string | null
          study_id: string
          triage_result_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          feedback_type?: Database["public"]["Enums"]["feedback_type"]
          id?: string
          notes?: string | null
          study_id?: string
          triage_result_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_events_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_events_triage_result_id_fkey"
            columns: ["triage_result_id"]
            isOneToOne: false
            referencedRelation: "triage_results"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_results: {
        Row: {
          co2: number | null
          crp: number | null
          id: string
          o2: number | null
          ph: number | null
          procalcitonin: number | null
          source: string | null
          study_id: string
          timestamp: string
          wbc: number | null
        }
        Insert: {
          co2?: number | null
          crp?: number | null
          id?: string
          o2?: number | null
          ph?: number | null
          procalcitonin?: number | null
          source?: string | null
          study_id: string
          timestamp?: string
          wbc?: number | null
        }
        Update: {
          co2?: number | null
          crp?: number | null
          id?: string
          o2?: number | null
          ph?: number | null
          procalcitonin?: number | null
          source?: string | null
          study_id?: string
          timestamp?: string
          wbc?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_literature: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          source: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          source?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          source?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved: boolean
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          institution: string | null
          role: string
          specialty: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          institution?: string | null
          role?: string
          specialty?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved?: boolean
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          institution?: string | null
          role?: string
          specialty?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      studies: {
        Row: {
          created_at: string
          file_path: string | null
          id: string
          modality: string | null
          patient_hash: string
          site_id: string | null
          status: Database["public"]["Enums"]["study_status"]
          study_time: string
          thumbnail_path: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_path?: string | null
          id?: string
          modality?: string | null
          patient_hash: string
          site_id?: string | null
          status?: Database["public"]["Enums"]["study_status"]
          study_time?: string
          thumbnail_path?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_path?: string | null
          id?: string
          modality?: string | null
          patient_hash?: string
          site_id?: string | null
          status?: Database["public"]["Enums"]["study_status"]
          study_time?: string
          thumbnail_path?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      triage_results: {
        Row: {
          confidence: number
          created_at: string
          id: string
          inference_time_ms: number | null
          model_version: string | null
          risk_bucket: Database["public"]["Enums"]["risk_bucket"]
          risk_score: number
          roi_heatmap_path: string | null
          study_id: string
        }
        Insert: {
          confidence: number
          created_at?: string
          id?: string
          inference_time_ms?: number | null
          model_version?: string | null
          risk_bucket: Database["public"]["Enums"]["risk_bucket"]
          risk_score: number
          roi_heatmap_path?: string | null
          study_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: string
          inference_time_ms?: number | null
          model_version?: string | null
          risk_bucket?: Database["public"]["Enums"]["risk_bucket"]
          risk_score?: number
          roi_heatmap_path?: string | null
          study_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "triage_results_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin_user: { Args: never; Returns: boolean }
      is_approved_user: { Args: never; Returns: boolean }
    }
    Enums: {
      feedback_type: "CORRECT_PRIORITY" | "FALSE_ALARM" | "MISSED_URGENCY"
      risk_bucket: "CRITICAL" | "REVIEW" | "CLEAR"
      study_status:
        | "PENDING"
        | "QUEUED"
        | "PROCESSING"
        | "REVIEWED"
        | "ARCHIVED"
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
      feedback_type: ["CORRECT_PRIORITY", "FALSE_ALARM", "MISSED_URGENCY"],
      risk_bucket: ["CRITICAL", "REVIEW", "CLEAR"],
      study_status: ["PENDING", "QUEUED", "PROCESSING", "REVIEWED", "ARCHIVED"],
    },
  },
} as const
