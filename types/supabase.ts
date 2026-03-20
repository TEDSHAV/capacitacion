// Supabase types and utilities
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
      [key: string]: {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
      }
    }
    Views: {
      [key: string]: {
        Row: Record<string, any>
      }
    }
    Functions: {
      [key: string]: {
        Args: Record<string, any>
        Returns: Json
      }
    }
    Enums: {
      [key: string]: string
    }
    CompositeTypes: {
      [key: string]: {
        [key: string]: Json
      }
    }
  }
} 