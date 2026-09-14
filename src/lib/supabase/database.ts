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
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
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
      roadmap_nodes: {
        Row: {
          id: string
          role_id: string
          parent_id: string | null
          kind: string
          title: string
          description: string | null
          notes: string | null
          icon: string
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
            foreignKeyName: "roadmap_nodes_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmap_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "roadmap_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          id: string
          node_id: string
          title: string
          description: string | null
          is_completed: boolean
          sort_order: number
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          node_id: string
          title: string
          description?: string | null
          is_completed?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          node_id?: string
          title?: string
          description?: string | null
          is_completed?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "roadmap_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      node_links: {
        Row: {
          id: string
          node_id: string
          label: string
          url: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          node_id: string
          label: string
          url: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          node_id?: string
          label?: string
          url?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "node_links_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "roadmap_nodes"
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
