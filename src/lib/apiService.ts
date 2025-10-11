// API base URL - configure this in your .env.local file
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export interface Market {
  market_id: string
  question: string
  description: string
  category: string
  outcomes: string[]
  end_date: number
  voting_deadline: number
  created_at: number
  creator: string
  resolved: boolean
  on_chain: boolean
  tx_hash?: string
}

export interface Vote {
  voter: string
  value: number // 0-1 scale
  timestamp: number
  tx_hash?: string
}

export interface MarketStats {
  total_votes: number
  yes_votes: number
  no_votes: number
  average_vote: number
}

// Market API functions
export const marketAPI = {
  // Create a new market
  async createMarket(params: {
    question: string
    description: string
    category: string
    endDate: number // Unix timestamp
    votingPeriod?: number
    creator: string
    signature: string
  }): Promise<{ success: boolean; marketId: string; txHash: string }> {
    const response = await fetch(`${API_BASE_URL}/api/markets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: params.question,
        description: params.description,
        category: params.category,
        outcomes: ['Yes', 'No'],
        endDate: params.endDate,
        votingPeriod: params.votingPeriod || 86400, // Default 24 hours
        creator: params.creator,
        signature: params.signature
      })
    })

    if (!response.ok) {
      const error = await response.json()
      // Handle validation errors with detailed messages
      if (error.details && Array.isArray(error.details)) {
        // Zod validation errors with details
        const errorMessages = error.details.map((err: any) => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ')
        throw new Error(`Validation error: ${errorMessages}`)
      }
      if (error.error && typeof error.error === 'string') {
        throw new Error(error.error)
      }
      throw new Error('Failed to create market')
    }

    return await response.json()
  },

  // Get all markets
  async getAllMarkets(params?: {
    limit?: number
    offset?: number
    category?: string
  }): Promise<Market[]> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.set('limit', params.limit.toString())
    if (params?.offset) queryParams.set('offset', params.offset.toString())
    if (params?.category) queryParams.set('category', params.category)

    const response = await fetch(`${API_BASE_URL}/api/markets?${queryParams}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch markets')
    }

    const data = await response.json()
    return data.markets || []
  },

  // Get active markets
  async getActiveMarkets(): Promise<Market[]> {
    const response = await fetch(`${API_BASE_URL}/api/markets/active`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch active markets')
    }

    const data = await response.json()
    return data.markets || []
  },

  // Get markets ready for voting
  async getVotingMarkets(): Promise<Market[]> {
    const response = await fetch(`${API_BASE_URL}/api/markets/voting`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch voting markets')
    }

    const data = await response.json()
    return data.markets || []
  },

  // Get market by ID
  async getMarket(marketId: string): Promise<Market> {
    const response = await fetch(`${API_BASE_URL}/api/markets/${marketId}`)
    
    if (!response.ok) {
      throw new Error('Market not found')
    }

    return await response.json()
  },

  // Cast a vote
  async castVote(params: {
    marketId: string
    voter: string
    value: number // 0-1 scale
    signature: string
  }): Promise<{ success: boolean; txHash: string }> {
    const response = await fetch(`${API_BASE_URL}/api/markets/${params.marketId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voter: params.voter,
        value: params.value,
        signature: params.signature
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to cast vote')
    }

    return await response.json()
  },

  // Get votes for a market
  async getVotes(marketId: string): Promise<Vote[]> {
    const response = await fetch(`${API_BASE_URL}/api/markets/${marketId}/votes`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch votes')
    }

    const data = await response.json()
    return data.votes || []
  },

  // Check if an address has voted
  async hasVoted(marketId: string, voter: string): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/api/markets/${marketId}/has-voted/${voter}`)
    
    if (!response.ok) {
      return false
    }

    const data = await response.json()
    return data.hasVoted || false
  },

  // Calculate market statistics from votes
  calculateStats(votes: Vote[]): MarketStats {
    if (votes.length === 0) {
      return {
        total_votes: 0,
        yes_votes: 0,
        no_votes: 0,
        average_vote: 0
      }
    }

    const yesVotes = votes.filter(v => v.value > 0.5).length
    const noVotes = votes.filter(v => v.value < 0.5).length
    const totalVote = votes.reduce((sum, v) => sum + v.value, 0)
    const averageVote = totalVote / votes.length

    return {
      total_votes: votes.length,
      yes_votes: yesVotes,
      no_votes: noVotes,
      average_vote: averageVote
    }
  }
}

// Helper functions for signing
export const signatureHelpers = {
  // Get message for creating a market
  getCreateMarketMessage(question: string, endDate: number): string {
    return `Create market: ${question} ending at ${endDate}`
  },

  // Get message for voting
  getVoteMessage(marketId: string, value: number): string {
    return `Vote on market ${marketId} with value ${value}`
  }
}

