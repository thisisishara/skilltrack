export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          github_user_id: string
          github_username: string
          display_name: string | null
          avatar_url: string | null
          role: "admin" | "user"
          approval_status: "pending" | "approved" | "denied"
          approved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          github_user_id: string
          github_username: string
          display_name?: string | null
          avatar_url?: string | null
          role?: "admin" | "user"
          approval_status?: "pending" | "approved" | "denied"
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          github_user_id?: string
          github_username?: string
          display_name?: string | null
          avatar_url?: string | null
          role?: "admin" | "user"
          approval_status?: "pending" | "approved" | "denied"
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          user_id: string
          notifications_enabled: boolean
          tracky_enabled: boolean
          tracky_provider: "anthropic" | "openai" | "google" | "openrouter" | null
          tracky_model: string | null
          tracky_base_url: string | null
          tracky_api_key_ciphertext: string | null
          tracky_api_key_iv: string | null
          tracky_api_key_last4: string | null
          tracky_config: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          notifications_enabled?: boolean
          tracky_enabled?: boolean
          tracky_provider?: "anthropic" | "openai" | "google" | "openrouter" | null
          tracky_model?: string | null
          tracky_base_url?: string | null
          tracky_api_key_ciphertext?: string | null
          tracky_api_key_iv?: string | null
          tracky_api_key_last4?: string | null
          tracky_config?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          notifications_enabled?: boolean
          tracky_enabled?: boolean
          tracky_provider?: "anthropic" | "openai" | "google" | "openrouter" | null
          tracky_model?: string | null
          tracky_base_url?: string | null
          tracky_api_key_ciphertext?: string | null
          tracky_api_key_iv?: string | null
          tracky_api_key_last4?: string | null
          tracky_config?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tracky_model_catalog: {
        Row: {
          provider: "anthropic" | "openai" | "google" | "openrouter"
          model_id: string
          created_at: string
        }
        Insert: {
          provider: "anthropic" | "openai" | "google" | "openrouter"
          model_id: string
          created_at?: string
        }
        Update: {
          provider?: "anthropic" | "openai" | "google" | "openrouter"
          model_id?: string
          created_at?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          id: string
          role_id: string
          parent_id: string | null
          kind: string
          title: string
          description: string | null
          icon: string
          color: string | null
          handle_kind: string
          incoming_edge_animated: boolean
          position_x: number
          position_y: number
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          role_id: string
          parent_id?: string | null
          kind?: string
          title: string
          description?: string | null
          icon?: string
          color?: string | null
          handle_kind?: string
          incoming_edge_animated?: boolean
          position_x?: number
          position_y?: number
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role_id?: string
          parent_id?: string | null
          kind?: string
          title?: string
          description?: string | null
          icon?: string
          color?: string | null
          handle_kind?: string
          incoming_edge_animated?: boolean
          position_x?: number
          position_y?: number
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_notes: {
        Row: {
          id: string
          topic_id: string
          title: string
          body: string
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          topic_id: string
          title: string
          body?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          topic_id?: string
          title?: string
          body?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_notes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          id: string
          topic_id: string
          title: string
          description: string | null
          completed: boolean
          sort_order: number
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          topic_id: string
          title: string
          description?: string | null
          completed?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          topic_id?: string
          title?: string
          description?: string | null
          completed?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      links: {
        Row: {
          id: string
          role_id: string
          topic_id: string | null
          label: string
          url: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          role_id: string
          topic_id?: string | null
          label: string
          url: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role_id?: string
          topic_id?: string | null
          label?: string
          url?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "links_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "links_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      job_descriptions: {
        Row: {
          id: string
          user_id: string
          role_id: string
          company_name: string
          role_title: string
          source: string | null
          source_url: string | null
          description: string
          posted_at: string | null
          captured_at: string
          created_at: string
          updated_at: string
          external_id: string | null
          company_url: string | null
          location: string | null
          locations: string[]
          seniority_level: string | null
          employment_type: string | null
          job_functions: string[]
          industries: string[]
          workplace_type: "on_site" | "hybrid" | "remote" | "unknown"
          applicant_count: number | null
          salary_text: string | null
          compensation: Json
          posted_relative: string | null
          posted_at_precision: "exact" | "estimated" | "unknown"
          extraction_method: "rules" | "ai" | "mixed" | "manual"
          extracted_at: string | null
          field_confidence: Json
          description_html: string | null
          sections: Json
          extras: Json
          analysis: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          role_id: string
          company_name: string
          role_title: string
          source?: string | null
          source_url?: string | null
          description: string
          posted_at?: string | null
          captured_at?: string
          created_at?: string
          updated_at?: string
          external_id?: string | null
          company_url?: string | null
          location?: string | null
          locations?: string[]
          seniority_level?: string | null
          employment_type?: string | null
          job_functions?: string[]
          industries?: string[]
          workplace_type?: "on_site" | "hybrid" | "remote" | "unknown"
          applicant_count?: number | null
          salary_text?: string | null
          compensation?: Json
          posted_relative?: string | null
          posted_at_precision?: "exact" | "estimated" | "unknown"
          extraction_method?: "rules" | "ai" | "mixed" | "manual"
          extracted_at?: string | null
          field_confidence?: Json
          description_html?: string | null
          sections?: Json
          extras?: Json
          analysis?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          role_id?: string
          company_name?: string
          role_title?: string
          source?: string | null
          source_url?: string | null
          description?: string
          posted_at?: string | null
          captured_at?: string
          created_at?: string
          updated_at?: string
          external_id?: string | null
          company_url?: string | null
          location?: string | null
          locations?: string[]
          seniority_level?: string | null
          employment_type?: string | null
          job_functions?: string[]
          industries?: string[]
          workplace_type?: "on_site" | "hybrid" | "remote" | "unknown"
          applicant_count?: number | null
          salary_text?: string | null
          compensation?: Json
          posted_relative?: string | null
          posted_at_precision?: "exact" | "estimated" | "unknown"
          extraction_method?: "rules" | "ai" | "mixed" | "manual"
          extracted_at?: string | null
          field_confidence?: Json
          description_html?: string | null
          sections?: Json
          extras?: Json
          analysis?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "job_descriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_descriptions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_requirements: {
        Row: {
          id: string
          job_description_id: string
          skill_name: string
          importance: "required" | "preferred" | "unknown"
          notes: string | null
          created_at: string
          source_section:
            | "minimum_qualifications"
            | "preferred_qualifications"
            | "responsibilities"
            | "skills"
            | "other"
        }
        Insert: {
          id?: string
          job_description_id: string
          skill_name: string
          importance?: "required" | "preferred" | "unknown"
          notes?: string | null
          created_at?: string
          source_section?:
            | "minimum_qualifications"
            | "preferred_qualifications"
            | "responsibilities"
            | "skills"
            | "other"
        }
        Update: {
          id?: string
          job_description_id?: string
          skill_name?: string
          importance?: "required" | "preferred" | "unknown"
          notes?: string | null
          created_at?: string
          source_section?:
            | "minimum_qualifications"
            | "preferred_qualifications"
            | "responsibilities"
            | "skills"
            | "other"
        }
        Relationships: [
          {
            foreignKeyName: "job_requirements_job_description_id_fkey"
            columns: ["job_description_id"]
            isOneToOne: false
            referencedRelation: "job_descriptions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      latest_role_content_activity: {
        Args: { p_role_ids: string[] }
        Returns: {
          role_id: string
          last_activity_at: string
        }[]
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
