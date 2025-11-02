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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      api_responses: {
        Row: {
          api_name: string
          created_at: string
          endpoint: string
          error_message: string | null
          id: string
          request_payload: Json | null
          research_job_id: string | null
          response_payload: Json | null
          response_text: string | null
          status_code: number | null
        }
        Insert: {
          api_name: string
          created_at?: string
          endpoint: string
          error_message?: string | null
          id?: string
          request_payload?: Json | null
          research_job_id?: string | null
          response_payload?: Json | null
          response_text?: string | null
          status_code?: number | null
        }
        Update: {
          api_name?: string
          created_at?: string
          endpoint?: string
          error_message?: string | null
          id?: string
          request_payload?: Json | null
          research_job_id?: string | null
          response_payload?: Json | null
          response_text?: string | null
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "api_responses_research_job_id_fkey"
            columns: ["research_job_id"]
            isOneToOne: false
            referencedRelation: "research_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      company_scripts: {
        Row: {
          created_at: string
          id: string
          research_job_id: string
          script_content: string
          script_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          research_job_id: string
          script_content: string
          script_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          research_job_id?: string
          script_content?: string
          script_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_scripts_research_job_id_fkey"
            columns: ["research_job_id"]
            isOneToOne: false
            referencedRelation: "research_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_activity: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at: string
          created_by: string
          id: string
          notes: string
          research_job_id: string
          status: Database["public"]["Enums"]["activity_status"]
          updated_at: string
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at?: string
          created_by: string
          id?: string
          notes: string
          research_job_id: string
          status?: Database["public"]["Enums"]["activity_status"]
          updated_at?: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          created_at?: string
          created_by?: string
          id?: string
          notes?: string
          research_job_id?: string
          status?: Database["public"]["Enums"]["activity_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_activity_research_job_id_fkey"
            columns: ["research_job_id"]
            isOneToOne: false
            referencedRelation: "research_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_statuses: {
        Row: {
          color: string
          created_at: string
          id: string
          is_system: boolean
          label: string
          sort_order: number
          updated_at: string
          value: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_system?: boolean
          label: string
          sort_order?: number
          updated_at?: string
          value: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_system?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      discussion_topics: {
        Row: {
          created_at: string
          description: string
          id: string
          research_job_id: string
          source_references: string[] | null
          title: string
          topic_type: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          research_job_id: string
          source_references?: string[] | null
          title: string
          topic_type: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          research_job_id?: string
          source_references?: string[] | null
          title?: string
          topic_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_topics_research_job_id_fkey"
            columns: ["research_job_id"]
            isOneToOne: false
            referencedRelation: "research_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      executives: {
        Row: {
          awards_recognition: string | null
          confidence_level: string | null
          confidence_score: number | null
          created_at: string
          data_source: string | null
          history: string | null
          id: string
          interests: string | null
          is_user_provided: boolean | null
          key_interests: string | null
          keywords: string[] | null
          last_verified_at: string | null
          linkedin_url: string | null
          name: string
          position: string
          research_job_id: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          awards_recognition?: string | null
          confidence_level?: string | null
          confidence_score?: number | null
          created_at?: string
          data_source?: string | null
          history?: string | null
          id?: string
          interests?: string | null
          is_user_provided?: boolean | null
          key_interests?: string | null
          keywords?: string[] | null
          last_verified_at?: string | null
          linkedin_url?: string | null
          name: string
          position: string
          research_job_id: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          awards_recognition?: string | null
          confidence_level?: string | null
          confidence_score?: number | null
          created_at?: string
          data_source?: string | null
          history?: string | null
          id?: string
          interests?: string | null
          is_user_provided?: boolean | null
          key_interests?: string | null
          keywords?: string[] | null
          last_verified_at?: string | null
          linkedin_url?: string | null
          name?: string
          position?: string
          research_job_id?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "executives_research_job_id_fkey"
            columns: ["research_job_id"]
            isOneToOne: false
            referencedRelation: "research_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_scripts: {
        Row: {
          ai_improvement_metadata: Json | null
          created_at: string | null
          id: string
          parent_script_id: string | null
          research_job_id: string
          script_content_html: string | null
          script_content_plain: string
          script_type: string
          template_id: string | null
          template_source: string | null
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          ai_improvement_metadata?: Json | null
          created_at?: string | null
          id?: string
          parent_script_id?: string | null
          research_job_id: string
          script_content_html?: string | null
          script_content_plain: string
          script_type: string
          template_id?: string | null
          template_source?: string | null
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          ai_improvement_metadata?: Json | null
          created_at?: string | null
          id?: string
          parent_script_id?: string | null
          research_job_id?: string
          script_content_html?: string | null
          script_content_plain?: string
          script_type?: string
          template_id?: string | null
          template_source?: string | null
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_scripts_parent_script_id_fkey"
            columns: ["parent_script_id"]
            isOneToOne: false
            referencedRelation: "generated_scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_scripts_research_job_id_fkey"
            columns: ["research_job_id"]
            isOneToOne: false
            referencedRelation: "research_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      news_items: {
        Row: {
          confidence_level: string | null
          created_at: string
          executive_id: string | null
          id: string
          keywords: string[] | null
          published_date: string | null
          relevance_score: number | null
          research_job_id: string
          snippet: string | null
          source_credibility_score: number | null
          source_domain: string | null
          summary: string
          title: string
          url: string
        }
        Insert: {
          confidence_level?: string | null
          created_at?: string
          executive_id?: string | null
          id?: string
          keywords?: string[] | null
          published_date?: string | null
          relevance_score?: number | null
          research_job_id: string
          snippet?: string | null
          source_credibility_score?: number | null
          source_domain?: string | null
          summary: string
          title: string
          url: string
        }
        Update: {
          confidence_level?: string | null
          created_at?: string
          executive_id?: string | null
          id?: string
          keywords?: string[] | null
          published_date?: string | null
          relevance_score?: number | null
          research_job_id?: string
          snippet?: string | null
          source_credibility_score?: number | null
          source_domain?: string | null
          summary?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_items_executive_id_fkey"
            columns: ["executive_id"]
            isOneToOne: false
            referencedRelation: "executives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_items_research_job_id_fkey"
            columns: ["research_job_id"]
            isOneToOne: false
            referencedRelation: "research_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          linkedin_url: string | null
          status: string
          updated_at: string
          user_id: string
          user_industry_experience: string[] | null
          user_interests: string[] | null
          user_last_ceo_position: string | null
          user_last_company: string | null
          user_location: string | null
          user_name: string | null
          user_phone_number: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          linkedin_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
          user_industry_experience?: string[] | null
          user_interests?: string[] | null
          user_last_ceo_position?: string | null
          user_last_company?: string | null
          user_location?: string | null
          user_name?: string | null
          user_phone_number?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          linkedin_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          user_industry_experience?: string[] | null
          user_interests?: string[] | null
          user_last_ceo_position?: string | null
          user_last_company?: string | null
          user_location?: string | null
          user_name?: string | null
          user_phone_number?: string | null
        }
        Relationships: []
      }
      research_embeddings: {
        Row: {
          content_text: string
          content_type: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json | null
          research_job_id: string
          updated_at: string
        }
        Insert: {
          content_text: string
          content_type: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          research_job_id: string
          updated_at?: string
        }
        Update: {
          content_text?: string
          content_type?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          research_job_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_embeddings_research_job_id_fkey"
            columns: ["research_job_id"]
            isOneToOne: false
            referencedRelation: "research_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      research_jobs: {
        Row: {
          acquisition_signal: string | null
          additional_urls: string[] | null
          board_leadership_changes: string | null
          ceo_linkedin_url: string
          ceo_name: string
          city: string | null
          company_keywords: string[] | null
          company_name: string
          company_overview: string | null
          competitors: string | null
          competitors_citations: Json | null
          contact_status: string | null
          country: string
          created_at: string
          data_quality_score: number | null
          data_sources: Json | null
          ebitda_amount: number | null
          employee_count: number | null
          enrichment_metadata: Json | null
          enrichment_phases: Json | null
          enrichment_status: string | null
          financial_information: string | null
          funding_investment_news: string | null
          id: string
          industry_business_model: string | null
          key_partnerships: string | null
          key_products_customers: string | null
          last_contact_datetime: string | null
          last_enriched_at: string | null
          likely_acquirers: string | null
          likely_acquirers_citations: Json | null
          location: string
          market_position: string | null
          overview_citations: Json | null
          processed_at: string | null
          recent_developments: string | null
          revenue_amount: number | null
          state: string | null
          status: Database["public"]["Enums"]["research_status"]
          top_5: string | null
          updated_at: string
          user_id: string
          validation_score: number | null
          website_url: string
        }
        Insert: {
          acquisition_signal?: string | null
          additional_urls?: string[] | null
          board_leadership_changes?: string | null
          ceo_linkedin_url: string
          ceo_name: string
          city?: string | null
          company_keywords?: string[] | null
          company_name: string
          company_overview?: string | null
          competitors?: string | null
          competitors_citations?: Json | null
          contact_status?: string | null
          country: string
          created_at?: string
          data_quality_score?: number | null
          data_sources?: Json | null
          ebitda_amount?: number | null
          employee_count?: number | null
          enrichment_metadata?: Json | null
          enrichment_phases?: Json | null
          enrichment_status?: string | null
          financial_information?: string | null
          funding_investment_news?: string | null
          id?: string
          industry_business_model?: string | null
          key_partnerships?: string | null
          key_products_customers?: string | null
          last_contact_datetime?: string | null
          last_enriched_at?: string | null
          likely_acquirers?: string | null
          likely_acquirers_citations?: Json | null
          location: string
          market_position?: string | null
          overview_citations?: Json | null
          processed_at?: string | null
          recent_developments?: string | null
          revenue_amount?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["research_status"]
          top_5?: string | null
          updated_at?: string
          user_id: string
          validation_score?: number | null
          website_url: string
        }
        Update: {
          acquisition_signal?: string | null
          additional_urls?: string[] | null
          board_leadership_changes?: string | null
          ceo_linkedin_url?: string
          ceo_name?: string
          city?: string | null
          company_keywords?: string[] | null
          company_name?: string
          company_overview?: string | null
          competitors?: string | null
          competitors_citations?: Json | null
          contact_status?: string | null
          country?: string
          created_at?: string
          data_quality_score?: number | null
          data_sources?: Json | null
          ebitda_amount?: number | null
          employee_count?: number | null
          enrichment_metadata?: Json | null
          enrichment_phases?: Json | null
          enrichment_status?: string | null
          financial_information?: string | null
          funding_investment_news?: string | null
          id?: string
          industry_business_model?: string | null
          key_partnerships?: string | null
          key_products_customers?: string | null
          last_contact_datetime?: string | null
          last_enriched_at?: string | null
          likely_acquirers?: string | null
          likely_acquirers_citations?: Json | null
          location?: string
          market_position?: string | null
          overview_citations?: Json | null
          processed_at?: string | null
          recent_developments?: string | null
          revenue_amount?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["research_status"]
          top_5?: string | null
          updated_at?: string
          user_id?: string
          validation_score?: number | null
          website_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_contact_status"
            columns: ["contact_status"]
            isOneToOne: false
            referencedRelation: "contact_statuses"
            referencedColumns: ["value"]
          },
        ]
      }
      research_notes: {
        Row: {
          corum_activity: string | null
          created_at: string
          feedback: string | null
          id: string
          internal_notes: string | null
          research_job_id: string
          updated_at: string
        }
        Insert: {
          corum_activity?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          internal_notes?: string | null
          research_job_id: string
          updated_at?: string
        }
        Update: {
          corum_activity?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          internal_notes?: string | null
          research_job_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      source_credibility: {
        Row: {
          created_at: string
          credibility_score: number
          domain: string
          id: string
          last_verified_at: string | null
          metadata: Json | null
          source_type: string
          updated_at: string
          verification_count: number
        }
        Insert: {
          created_at?: string
          credibility_score: number
          domain: string
          id?: string
          last_verified_at?: string | null
          metadata?: Json | null
          source_type: string
          updated_at?: string
          verification_count?: number
        }
        Update: {
          created_at?: string
          credibility_score?: number
          domain?: string
          id?: string
          last_verified_at?: string | null
          metadata?: Json | null
          source_type?: string
          updated_at?: string
          verification_count?: number
        }
        Relationships: []
      }
      superadmin_templates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          script_type: string
          template_content: string
          template_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          script_type: string
          template_content: string
          template_name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          script_type?: string
          template_content?: string
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_baseline_templates: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          script_type: string
          template_content_html: string | null
          template_content_plain: string
          template_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          script_type: string
          template_content_html?: string | null
          template_content_plain: string
          template_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          script_type?: string
          template_content_html?: string | null
          template_content_plain?: string
          template_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      validation_logs: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          input_data: Json
          model_used: string | null
          processing_time_ms: number | null
          research_job_id: string
          validation_result: Json
          validation_type: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          input_data: Json
          model_used?: string | null
          processing_time_ms?: number | null
          research_job_id: string
          validation_result: Json
          validation_type: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          input_data?: Json
          model_used?: string | null
          processing_time_ms?: number | null
          research_job_id?: string
          validation_result?: Json
          validation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_logs_research_job_id_fkey"
            columns: ["research_job_id"]
            isOneToOne: false
            referencedRelation: "research_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_research_jobs_with_user_info: {
        Args: never
        Returns: {
          acquisition_signal: string
          additional_urls: string[]
          board_leadership_changes: string
          ceo_linkedin_url: string
          ceo_name: string
          city: string
          company_keywords: string[]
          company_name: string
          company_overview: string
          competitors: string
          contact_status: string
          country: string
          created_at: string
          display_name: string
          ebitda_amount: number
          employee_count: number
          financial_information: string
          funding_investment_news: string
          id: string
          industry_business_model: string
          key_partnerships: string
          key_products_customers: string
          last_contact_datetime: string
          likely_acquirers: string
          location: string
          market_position: string
          processed_at: string
          recent_developments: string
          revenue_amount: number
          state: string
          status: Database["public"]["Enums"]["research_status"]
          top_5: string
          updated_at: string
          user_email: string
          user_id: string
          website_url: string
        }[]
      }
      get_user_emails: {
        Args: never
        Returns: {
          email: string
          user_id: string
        }[]
      }
      get_user_profiles_with_emails: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          email: string
          linkedin_url: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          user_id: string
        }[]
      }
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
      match_research_embeddings: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content_text: string
          content_type: string
          id: string
          metadata: Json
          research_job_id: string
          similarity: number
        }[]
      }
      update_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      activity_status:
        | "new"
        | "in_progress"
        | "complete"
        | "cancelled"
        | "scheduled"
      activity_type: "email" | "phone" | "linkedin" | "meeting" | "other"
      app_role: "super_admin" | "editor" | "viewer"
      contact_status:
        | "never"
        | "contacted"
        | "connected"
        | "need_follow_up"
        | "not_interested"
        | "research only"
        | "research_only"
      research_status: "new" | "processing" | "complete" | "error" | "processed"
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
      activity_status: [
        "new",
        "in_progress",
        "complete",
        "cancelled",
        "scheduled",
      ],
      activity_type: ["email", "phone", "linkedin", "meeting", "other"],
      app_role: ["super_admin", "editor", "viewer"],
      contact_status: [
        "never",
        "contacted",
        "connected",
        "need_follow_up",
        "not_interested",
        "research only",
        "research_only",
      ],
      research_status: ["new", "processing", "complete", "error", "processed"],
    },
  },
} as const
