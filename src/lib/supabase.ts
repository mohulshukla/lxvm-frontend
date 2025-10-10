import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface PredictionMarket {
  id: string
  title: string
  description: string
  created_at: string
  created_by: string
  status: 'active' | 'ended' | 'resolved'
  resolution_threshold: number
  shareable_id: string
}

export interface Vote {
  id: string
  market_id: string
  voter_address: string
  prediction: number // 0-1 confidence level
  vote_type: 'yes' | 'no'
  created_at: string
  evidence?: string
}

export interface User {
  wallet_address: string
  created_at: string
  last_vote_at?: string
}
