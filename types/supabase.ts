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
      web3_users: {
        Row: {
          wallet_address: string
          nonce: string
          nonce_expires_at: string
          nickname: string | null
          points: number
          created_at: string | null
          updated_at: string | null
          kakao_id: string | null
          real_name: string | null
          profile_image_url: string | null
        }
        Insert: {
          wallet_address: string
          nonce: string
          nonce_expires_at: string
          nickname?: string | null
          points?: number
          created_at?: string | null
          updated_at?: string | null
          kakao_id?: string | null
          real_name?: string | null
          profile_image_url?: string | null
        }
        Update: {
          wallet_address?: string
          nonce?: string
          nonce_expires_at?: string
          nickname?: string | null
          points?: number
          created_at?: string | null
          updated_at?: string | null
          kakao_id?: string | null
          real_name?: string | null
          profile_image_url?: string | null
        }
        Relationships: []
      }
      emojis: {
        Row: {
          id: number
          uuid: string
          creator_wallet: string | null
          owner_wallet: string | null
          style_type: string
          file_path: string
          is_nft: boolean | null
          nft_token_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: number
          uuid?: string
          creator_wallet?: string | null
          owner_wallet?: string | null
          style_type: string
          file_path: string
          is_nft?: boolean | null
          nft_token_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          uuid?: string
          creator_wallet?: string | null
          owner_wallet?: string | null
          style_type?: string
          file_path?: string
          is_nft?: boolean | null
          nft_token_id?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emojis_creator_wallet_fkey"
            columns: ["creator_wallet"]
            isOneToOne: false
            referencedRelation: "web3_users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "emojis_owner_wallet_fkey"
            columns: ["owner_wallet"]
            isOneToOne: false
            referencedRelation: "web3_users"
            referencedColumns: ["wallet_address"]
          }
        ]
      }
      preorders: {
        Row: {
          id: number
          wallet_address: string
          email: string | null
          created_at: string | null
        }
        Insert: {
          id?: number
          wallet_address: string
          email?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          wallet_address?: string
          email?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      point_transactions: {
        Row: {
          id: number
          wallet_address: string
          amount: number
          transaction_type: string
          description: string
          created_at: string
        }
        Insert: {
          id?: number
          wallet_address: string
          amount: number
          transaction_type: string
          description: string
          created_at?: string
        }
        Update: {
          id?: number
          wallet_address?: string
          amount?: number
          transaction_type?: string
          description?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_wallet_address_fkey"
            columns: ["wallet_address"]
            referencedRelation: "web3_users"
            referencedColumns: ["wallet_address"]
          }
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
