export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          role: 'admin' | 'student'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          role: 'admin' | 'student'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          role?: 'admin' | 'student'
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          leader_id: string
          members: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          leader_id: string
          members: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          leader_id?: string
          members?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          team_id: string
          title: string
          description: string | null
          deadline: string
          status: 'pending' | 'completed'
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          title: string
          description?: string | null
          deadline: string
          status?: 'pending' | 'completed'
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          title?: string
          description?: string | null
          deadline?: string
          status?: 'pending' | 'completed'
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          team_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          content?: string
          created_at?: string
        }
      }
    }
  }
}
