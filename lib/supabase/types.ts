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
      users: {
        Row: {
          supabase_user_id: string
          email: string | null
          provider: string | null
          provider_user_id: string | null
          nickname: string | null
          profile_image_url: string | null
          user_type: string | null
          user_grade: string | null
          created_at: string
          updated_at: string
          last_login_at: string | null
        }
        Insert: {
          supabase_user_id: string
          email?: string | null
          provider?: string | null
          provider_user_id?: string | null
          nickname?: string | null
          profile_image_url?: string | null
          user_type?: string | null
          user_grade?: string | null
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
        }
        Update: {
          supabase_user_id?: string
          email?: string | null
          provider?: string | null
          provider_user_id?: string | null
          nickname?: string | null
          profile_image_url?: string | null
          user_type?: string | null
          user_grade?: string | null
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
        }
      }
      access_logs: {
        Row: {
          id: string
          supabase_user_id: string | null
          ip_address: string | null
          user_agent: string | null
          device_type: string | null
          browser: string | null
          os: string | null
          action: string
          endpoint: string | null
          status_code: number | null
          created_at: string
        }
        Insert: {
          id?: string
          supabase_user_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          device_type?: string | null
          browser?: string | null
          os?: string | null
          action: string
          endpoint?: string | null
          status_code?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          supabase_user_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          device_type?: string | null
          browser?: string | null
          os?: string | null
          action?: string
          endpoint?: string | null
          status_code?: number | null
          created_at?: string
        }
      }
      favorite_agents: {
        Row: {
          id: string
          supabase_user_id: string
          agent_id: number
          created_at: string
        }
        Insert: {
          id?: string
          supabase_user_id: string
          agent_id: number
          created_at?: string
        }
        Update: {
          id?: string
          supabase_user_id?: string
          agent_id?: number
          created_at?: string
        }
      }
      agent_comments: {
        Row: {
          id: string
          agent_id: number
          supabase_user_id: string | null
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: number
          supabase_user_id?: string | null
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: number
          supabase_user_id?: string | null
          content?: string
          created_at?: string
        }
      }
      agent_reviews: {
        Row: {
          id: string
          agent_id: number
          supabase_user_id: string | null
          transaction_tag: string | null
          agent_address: string | null
          agent_name: string | null
          confience_score: string | null
          contract_type: string | null
          doc_title: string | null
          reason: string | null
          praise_tags: string[] | null
          regret_tags: string[] | null
          fee_satisfaction: number | null
          expertise: number | null
          kindness: number | null
          property_reliability: number | null
          response_speed: number | null
          review_text: string | null
          contract_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: number
          supabase_user_id?: string | null
          transaction_tag?: string | null
          agent_address?: string | null
          agent_name?: string | null
          confience_score?: string | null
          contract_type?: string | null
          doc_title?: string | null
          reason?: string | null
          praise_tags?: string[] | null
          regret_tags?: string[] | null
          fee_satisfaction?: number | null
          expertise?: number | null
          kindness?: number | null
          property_reliability?: number | null
          response_speed?: number | null
          review_text?: string | null
          contract_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: number
          supabase_user_id?: string | null
          transaction_tag?: string | null
          agent_address?: string | null
          agent_name?: string | null
          confience_score?: string | null
          contract_type?: string | null
          doc_title?: string | null
          reason?: string | null
          praise_tags?: string[] | null
          regret_tags?: string[] | null
          fee_satisfaction?: number | null
          expertise?: number | null
          kindness?: number | null
          property_reliability?: number | null
          response_speed?: number | null
          review_text?: string | null
          contract_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      common_code_master: {
        Row: {
          code_group: string
          code_group_name: string
          description: string | null
          sta_ymd: string
          end_ymd: string | null
          sort_order: number
          use_yn: string
          created_at: string
          updated_at: string
        }
        Insert: {
          code_group: string
          code_group_name: string
          description?: string | null
          sta_ymd?: string
          end_ymd?: string | null
          sort_order?: number
          use_yn?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          code_group?: string
          code_group_name?: string
          description?: string | null
          sta_ymd?: string
          end_ymd?: string | null
          sort_order?: number
          use_yn?: string
          created_at?: string
          updated_at?: string
        }
      }
      common_code_detail: {
        Row: {
          id: number
          code_group: string
          code_value: string
          code_name: string
          description: string | null
          sta_ymd: string
          end_ymd: string | null
          sort_order: number
          use_yn: string
          extra_value1: string | null
          extra_value2: string | null
          extra_value3: string | null
          extra_value4: string | null
          extra_value5: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          code_group: string
          code_value: string
          code_name: string
          description?: string | null
          sta_ymd?: string
          end_ymd?: string | null
          sort_order?: number
          use_yn?: string
          extra_value1?: string | null
          extra_value2?: string | null
          extra_value3?: string | null
          extra_value4?: string | null
          extra_value5?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          code_group?: string
          code_value?: string
          code_name?: string
          description?: string | null
          sta_ymd?: string
          end_ymd?: string | null
          sort_order?: number
          use_yn?: string
          extra_value1?: string | null
          extra_value2?: string | null
          extra_value3?: string | null
          extra_value4?: string | null
          extra_value5?: string | null
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
