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
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          github_user_id: string
          github_username: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          github_user_id?: string
          github_username?: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
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
          notes: string | null
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
          notes?: string | null
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
          notes?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
