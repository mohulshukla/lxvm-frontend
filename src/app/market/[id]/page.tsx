'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { supabase, type PredictionMarket, type Vote } from '@/lib/supabase'

export default function MarketPage() {
  const params = useParams()
  const { address, isConnected } = useAccount()
  const [market, setMarket] = useState<PredictionMarket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userVote, setUserVote] = useState<Vote | null>(null)
  const [prediction, setPrediction] = useState(0.5)
  const [voteType, setVoteType] = useState<'yes' | 'no'>('yes')
  const [evidence, setEvidence] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [marketStats, setMarketStats] = useState<{
    total_votes: number
    yes_votes: number
    no_votes: number
    average_confidence: number
  } | null>(null)

  const marketId = params.id as string
  const decodedMarketId = decodeURIComponent(marketId)

  useEffect(() => {
    if (marketId) {
      fetchMarket()
    }
  }, [marketId, fetchMarket])

  useEffect(() => {
    if (market && address) {
      fetchUserVote()
      fetchMarketStats()
    }
  }, [market, address, fetchUserVote, fetchMarketStats])

  // Real-time updates for market stats
  useEffect(() => {
    if (!market) return

    console.log('Setting up real-time subscription for market:', market.id)

    const channel = supabase
      .channel(`market-${market.id}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'votes',
          filter: `market_id=eq.${market.id}`
        }, 
        (payload) => {
          console.log('Real-time vote update:', payload)
          // Refresh market stats when votes change
          fetchMarketStats()
          // Refresh user vote if it's the current user
          if (address && payload.new?.voter_address === address) {
            fetchUserVote()
          }
        }
      )
      .subscribe()

    return () => {
      console.log('Cleaning up real-time subscription')
      supabase.removeChannel(channel)
    }
  }, [market, address, fetchMarketStats, fetchUserVote])

  const fetchMarket = useCallback(async () => {
    try {
      console.log('Looking for market with shareable_id (raw):', marketId)
      console.log('Looking for market with shareable_id (decoded):', decodedMarketId)
      
      const { data, error } = await supabase
        .from('prediction_markets')
        .select('*')
        .eq('shareable_id', decodedMarketId)
        .single()

      console.log('Market query result:', { data, error })

      if (error) {
        console.error('Market not found error:', error)
        setError(`Market not found: ${error.message}`)
        return
      }

      if (!data) {
        setError('Market not found')
        return
      }

      setMarket(data)
    } catch (err) {
      console.error('Error loading market:', err)
      setError('Error loading market')
    } finally {
      setLoading(false)
    }
  }, [marketId, decodedMarketId])

  const fetchUserVote = useCallback(async () => {
    if (!market || !address) return

    try {
      const { data, error } = await supabase
        .from('votes')
        .select('*')
        .eq('market_id', market.id)
        .eq('voter_address', address)
        .single()

      if (data && !error) {
        setUserVote(data)
        setPrediction(data.prediction)
        setVoteType(data.vote_type)
        setEvidence(data.evidence || '')
      }
    } catch (err) {
      console.error('Error fetching user vote:', err)
    }
  }, [market, address])

  const fetchMarketStats = useCallback(async () => {
    if (!market) return

    try {
      const { data } = await supabase.rpc('get_market_stats', {
        market_uuid: market.id
      })

      if (data && data.length > 0) {
        setMarketStats(data[0])
      }
    } catch (err) {
      console.error('Error fetching market stats:', err)
    }
  }, [market])

  const handleSubmitVote = async () => {
    if (!isConnected || !address || !market) {
      alert('Please connect your wallet first')
      return
    }

    if (market.status !== 'active') {
      alert('This market is no longer accepting votes')
      return
    }

    setIsSubmitting(true)

    try {
      // Ensure the user exists in our database
      const { error: userError } = await supabase
        .from('users')
        .upsert({ wallet_address: address }, { onConflict: 'wallet_address' })

      if (userError) {
        console.error('Error creating user:', userError)
        // Continue anyway - user might already exist
      } else {
        console.log('User created/updated successfully for voting')
      }

      // Cast the vote
      const { error } = await supabase.rpc('cast_vote', {
        market_uuid: market.id,
        voter_addr: address,
        vote_prediction: prediction,
        vote_type_val: voteType,
        vote_evidence: evidence || null
      })

      if (error) {
        console.error('Error casting vote:', error)
        alert('Error casting vote: ' + error.message)
        return
      }

      // Refresh the user vote and stats
      await fetchUserVote()
      await fetchMarketStats()
      
      alert(userVote ? 'Vote updated successfully!' : 'Vote submitted successfully!')
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading market...</p>
        </div>
      </div>
    )
  }

  if (error || !market) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Market Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            The market you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <nav className="flex justify-between items-center p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Prediction Market
        </h1>
        <ConnectButton />
      </nav>
      
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Market Details */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    market.status === 'active' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : market.status === 'ended'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                  }`}>
                    {market.status.toUpperCase()}
                  </span>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                  {market.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {market.description}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Created: {new Date(market.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Market Statistics */}
              {marketStats && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                    Market Statistics
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{marketStats.total_votes}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Votes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{marketStats.yes_votes}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Yes Votes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{marketStats.no_votes}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">No Votes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {(marketStats.average_confidence * 100).toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Avg Confidence</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Voting Interface */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
              {!isConnected ? (
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Connect to Vote
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Please connect your wallet to participate in this prediction market
                  </p>
                  <ConnectButton />
                </div>
              ) : (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                    {userVote ? 'Update Your Vote' : 'Cast Your Vote'}
                  </h3>

                  <div className="space-y-6">
                    {/* Vote Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Your Prediction
                      </label>
                      <div className="flex gap-4">
                        <button
                          onClick={() => setVoteType('yes')}
                          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                            voteType === 'yes'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          YES
                        </button>
                        <button
                          onClick={() => setVoteType('no')}
                          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                            voteType === 'no'
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          NO
                        </button>
                      </div>
                    </div>

                    {/* Confidence Level */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Confidence Level: {(prediction * 100).toFixed(1)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={prediction}
                        onChange={(e) => setPrediction(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <span>0% (No confidence)</span>
                        <span>100% (Absolute certainty)</span>
                      </div>
                    </div>

                    {/* Evidence */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Evidence/Reasoning (Optional)
                      </label>
                      <textarea
                        value={evidence}
                        onChange={(e) => setEvidence(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="Explain your reasoning or provide evidence..."
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      onClick={handleSubmitVote}
                      disabled={isSubmitting || market.status !== 'active'}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                    >
                      {isSubmitting 
                        ? 'Submitting...' 
                        : userVote 
                        ? 'Update Vote' 
                        : 'Submit Vote'
                      }
                    </button>

                    {market.status !== 'active' && (
                      <p className="text-sm text-yellow-600 dark:text-yellow-400 text-center">
                        This market is no longer accepting votes
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
