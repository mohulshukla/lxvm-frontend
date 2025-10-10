'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { supabase, type PredictionMarket, type Vote } from '@/lib/supabase'

interface MarketStats {
  total_votes: number
  yes_votes: number
  no_votes: number
  weighted_yes: number
  weighted_no: number
  average_confidence: number
}

interface VoteWithUser extends Vote {
  user?: {
    wallet_address: string
    created_at: string
    last_vote_at?: string
  }
}

export default function LiveMarketMonitor() {
  const params = useParams()
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const [market, setMarket] = useState<PredictionMarket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [marketStats, setMarketStats] = useState<MarketStats | null>(null)
  const [votes, setVotes] = useState<VoteWithUser[]>([])
  const [isCreator, setIsCreator] = useState(false)

  const marketId = params.id as string
  const decodedMarketId = decodeURIComponent(marketId)

  const fetchMarket = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('prediction_markets')
        .select('*')
        .eq('shareable_id', decodedMarketId)
        .single()

      if (error || !data) {
        setError('Market not found')
        return
      }

      setMarket(data)
      setIsCreator(address === data.created_by)
    } catch (err) {
      console.error('Error loading market:', err)
      setError('Error loading market')
    } finally {
      setLoading(false)
    }
  }, [marketId, decodedMarketId, address])

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

  const fetchVotes = useCallback(async () => {
    if (!market) return

    try {
      const { data, error } = await supabase
        .from('votes')
        .select(`
          *,
          user:users(wallet_address, created_at, last_vote_at)
        `)
        .eq('market_id', market.id)
        .order('created_at', { ascending: false })

      if (data && !error) {
        setVotes(data)
      }
    } catch (err) {
      console.error('Error fetching votes:', err)
    }
  }, [market])

  useEffect(() => {
    if (marketId) {
      fetchMarket()
    }
  }, [marketId, fetchMarket])

  useEffect(() => {
    if (market) {
      fetchMarketStats()
      fetchVotes()
    }
  }, [market, fetchMarketStats, fetchVotes])

  // Real-time updates
  useEffect(() => {
    if (!market) return

    console.log('Setting up live monitoring for market:', market.id)

    const channel = supabase
      .channel(`live-monitor-${market.id}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `market_id=eq.${market.id}`
        },
        (payload) => {
          console.log('Live vote update:', payload)
          // Refresh stats and votes
          fetchMarketStats()
          fetchVotes()
        }
      )
      .subscribe()

    return () => {
      console.log('Cleaning up live monitoring subscription')
      supabase.removeChannel(channel)
    }
  }, [market, fetchMarketStats, fetchVotes])

  const getConsensusDirection = () => {
    if (!marketStats || marketStats.total_votes === 0) return 'neutral'
    
    const weightedSum = marketStats.weighted_yes - marketStats.weighted_no
    if (weightedSum > 0.5) return 'yes'
    if (weightedSum < -0.5) return 'no'
    return 'neutral'
  }

  const getConsensusColor = (direction: string) => {
    switch (direction) {
      case 'yes':
        return 'bg-green-500'
      case 'no':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getVoteColor = (vote: Vote) => {
    if (vote.vote_type === 'yes') {
      return `rgba(34, 197, 94, ${vote.prediction})` // Green with confidence opacity
    } else {
      return `rgba(239, 68, 68, ${vote.prediction})` // Red with confidence opacity
    }
  }

  const getConfidenceGradient = (confidence: number, voteType: string) => {
    const intensity = Math.min(confidence * 1.5, 1) // Moderate intensity for better visibility
    if (voteType === 'yes') {
      return {
        background: `linear-gradient(135deg, 
          rgba(34, 197, 94, ${intensity * 0.9}) 0%, 
          rgba(22, 163, 74, ${intensity * 0.7}) 100%)`
      }
    } else {
      return {
        background: `linear-gradient(135deg, 
          rgba(239, 68, 68, ${intensity * 0.9}) 0%, 
          rgba(220, 38, 38, ${intensity * 0.7}) 100%)`
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-xl text-gray-600 dark:text-gray-300">Loading live monitor...</p>
        </div>
      </div>
    )
  }

  if (error || !market) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Market Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            The market you're looking for doesn't exist or has been removed.
          </p>
          <Link
            href="/markets"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg transition-colors text-lg"
          >
            Back to Markets
          </Link>
        </div>
      </div>
    )
  }

  const consensus = getConsensusDirection()

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900">
      {/* Header */}
      <nav className="flex justify-between items-center p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-6">
          <Link href="/markets" className="text-2xl font-bold text-gray-900 dark:text-white">
            ← Markets
          </Link>
          <div className="hidden md:flex gap-4">
            <Link href="/admin" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Admin
            </Link>
            <span className="text-blue-600 dark:text-blue-400 font-medium">Live Monitor</span>
          </div>
        </div>
        <ConnectButton />
      </nav>

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Market Header */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 mb-8 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <span className={`px-4 py-2 rounded-full text-sm font-bold ${getConsensusColor(consensus)} text-white`}>
                    {market.status.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-600 dark:text-green-400 font-medium">LIVE</span>
                  </div>
                </div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  {market.title}
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
                  {market.description}
                </p>
                <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                  <span>Created: {new Date(market.created_at).toLocaleDateString()}</span>
                  <span>Threshold: {(market.resolution_threshold * 100).toFixed(0)}%</span>
                  {isCreator && <span className="text-blue-600 dark:text-blue-400 font-medium">👑 Your Market</span>}
                </div>
              </div>
            </div>

            {/* Live Statistics Grid */}
            {marketStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                  <div className="text-4xl font-bold text-slate-700 dark:text-slate-300 mb-2">
                    {marketStats.total_votes}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total Votes</div>
                </div>
                <div className="text-center bg-green-50 dark:bg-green-900/20 rounded-2xl p-6 border border-green-200 dark:border-green-800">
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {marketStats.yes_votes}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Yes Votes</div>
                </div>
                <div className="text-center bg-red-50 dark:bg-red-900/20 rounded-2xl p-6 border border-red-200 dark:border-red-800">
                  <div className="text-4xl font-bold text-red-600 mb-2">
                    {marketStats.no_votes}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">No Votes</div>
                </div>
                <div className="text-center bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {(marketStats.average_confidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Avg Confidence</div>
                </div>
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Consensus Visualization */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                Live Consensus
              </h2>
              
              {marketStats && marketStats.total_votes > 0 ? (
                <div className="space-y-6">
                  {/* Main Progress Bar */}
                  <div className="relative">
                    <div className="w-full h-10 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden border-2 border-gray-300 dark:border-gray-600">
                      <div 
                        className="h-full transition-all duration-1000 ease-out"
                        style={{
                          width: '100%',
                          background: `linear-gradient(to right, 
                            #22c55e 0%, 
                            #22c55e ${(marketStats.yes_votes / marketStats.total_votes) * 100}%, 
                            #ef4444 ${(marketStats.yes_votes / marketStats.total_votes) * 100}%, 
                            #ef4444 100%)`
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-sm font-medium">
                      <span className="text-green-600 dark:text-green-400">YES</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {((marketStats.yes_votes / marketStats.total_votes) * 100).toFixed(1)}%
                      </span>
                      <span className="text-red-600 dark:text-red-400">NO</span>
                    </div>
                  </div>

                  {/* Confidence Slider */}
                  <div className="space-y-3">
                    <label className="block text-lg font-semibold text-gray-900 dark:text-white">
                      Average Confidence: {((marketStats.average_confidence || 0) * 100).toFixed(1)}%
                    </label>
                    <div className="relative">
                      <div className="w-full h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden border-2 border-gray-300 dark:border-gray-600">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${(marketStats.average_confidence || 0) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-2 text-sm text-gray-500 dark:text-gray-400 font-medium">
                        <span>0%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>

                  {/* Consensus Indicator */}
                  <div className="text-center p-6 rounded-2xl bg-gradient-to-r from-slate-50 to-gray-100 dark:from-slate-700 dark:to-gray-600 border border-gray-200 dark:border-gray-600">
                    <div className="text-3xl font-bold mb-2">
                      {consensus === 'yes' && '✅ STRONG YES'}
                      {consensus === 'no' && '❌ STRONG NO'}
                      {consensus === 'neutral' && '⚖️ NEUTRAL'}
                    </div>
                    <div className="text-gray-600 dark:text-gray-300">
                      Weighted Sum: {((marketStats.weighted_yes - marketStats.weighted_no) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📊</div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    No Votes Yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Waiting for the first vote to appear...
                  </p>
                </div>
              )}
            </div>

            {/* Individual Voters */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                <span className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></span>
                Live Voters ({votes.length})
              </h2>
              
              {votes.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {votes.map((vote, index) => (
                    <div 
                      key={vote.id}
                      className="p-5 rounded-2xl border-2 transition-all duration-500 ease-out animate-fadeIn"
                      style={{
                        borderColor: getVoteColor(vote),
                        background: getConfidenceGradient(vote.prediction, vote.vote_type).background
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: getVoteColor(vote) }}
                          />
                          <span className="font-bold text-white">
                            {vote.vote_type.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-white font-bold">
                          {(vote.prediction * 100).toFixed(0)}%
                        </div>
                      </div>
                      
                      <div className="w-full bg-white/30 rounded-full h-4 mb-2 border border-white/20">
                        <div 
                          className="h-full bg-white rounded-full transition-all duration-1000 ease-out shadow-sm"
                          style={{ width: `${vote.prediction * 100}%` }}
                        />
                      </div>
                      
                      <div className="text-sm text-white/80">
                        {vote.user?.wallet_address.slice(0, 6)}...{vote.user?.wallet_address.slice(-4)} • 
                        {new Date(vote.created_at).toLocaleTimeString()}
                      </div>
                      
                      {vote.evidence && (
                        <div className="mt-2 text-sm text-white/90 italic">
                          "{vote.evidence.slice(0, 100)}{vote.evidence.length > 100 ? '...' : ''}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">👥</div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    No Voters Yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Share the market link to get started!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href={`/market/${marketId}`}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-2xl transition-colors text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Vote on This Market
            </Link>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/market/${market.shareable_id}`)
                alert('Market link copied to clipboard!')
              }}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-2xl transition-colors text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Share Market
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  )
}
