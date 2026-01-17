// Supabase에서 자동 생성된 타입을 여기에 추가하세요
// Supabase CLI를 사용하여 타입을 생성할 수 있습니다:
// npx supabase gen types typescript --project-id your-project-id > lib/supabase/types.ts

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
      agent_master: {
        Row: {
          id: number
          agent_name: string
          agent_number: string
          agent_type: string | null
          road_address: string | null
          lot_address: string | null
          phone_number: string | null
          registration_date: string | null
          insurance_joined: boolean
          representative_name: string | null
          latitude: number | null
          longitude: number | null
          assistant_count: number
          agent_count: number
          website_url: string | null
          data_reference_date: string | null
          provider_code: string | null
          provider_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          agent_name: string
          agent_number: string
          agent_type?: string | null
          road_address?: string | null
          lot_address?: string | null
          phone_number?: string | null
          registration_date?: string | null
          insurance_joined?: boolean
          representative_name?: string | null
          latitude?: number | null
          longitude?: number | null
          assistant_count?: number
          agent_count?: number
          website_url?: string | null
          data_reference_date?: string | null
          provider_code?: string | null
          provider_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          agent_name?: string
          agent_number?: string
          agent_type?: string | null
          road_address?: string | null
          lot_address?: string | null
          phone_number?: string | null
          registration_date?: string | null
          insurance_joined?: boolean
          representative_name?: string | null
          latitude?: number | null
          longitude?: number | null
          assistant_count?: number
          agent_count?: number
          website_url?: string | null
          data_reference_date?: string | null
          provider_code?: string | null
          provider_name?: string | null
          created_at?: string
          updated_at?: string
        }
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
  }
}
