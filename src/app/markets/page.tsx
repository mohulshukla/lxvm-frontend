'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { supabase, type PredictionMarket } from '@/lib/supabase'

interface MarketWithStats extends PredictionMarket {
  stats?: {
    total_votes: number
    yes_votes: number
    no_votes: number
    weighted_yes: number
    weighted_no: number
    average_confidence: number
  }
}

export default function MarketsPage() {
  const { address, isConnected } = useAccount()
  const [markets, setMarkets] = useState<MarketWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'ended' | 'resolved'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'created' | 'votes' | 'confidence'>('created')

  const fetchMarkets = useCallback(async () => {
    try {
      setLoading(true)
      
      // Fetch all markets
      const { data: marketsData, error: marketsError } = await supabase
        .from('prediction_markets')
        .select('*')
        .order('created_at', { ascending: false })

      if (marketsError) {
        console.error('Error fetching markets:', marketsError)
        setError('Failed to load markets')
        return
      }

      if (!marketsData) {
        setMarkets([])
        return
      }

      // Fetch statistics for all markets
      const marketsWithStats = await Promise.all(
        marketsData.map(async (market) => {
          try {
            const { data: statsData } = await supabase.rpc('get_market_stats', {
              market_uuid: market.id
            })

            return {
              ...market,
              stats: statsData && statsData.length > 0 ? statsData[0] : {
                total_votes: 0,
                yes_votes: 0,
                no_votes: 0,
                weighted_yes: 0,
                weighted_no: 0,
                average_confidence: 0
              }
            }
          } catch (err) {
            console.error('Error fetching stats for market:', market.id, err)
            return {
              ...market,
              stats: {
                total_votes: 0,
                yes_votes: 0,
                no_votes: 0,
                weighted_yes: 0,
                weighted_no: 0,
                average_confidence: 0
              }
            }
          }
        })
      )

      setMarkets(marketsWithStats)
      setError(null)
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  // Set up real-time updates for all markets
  useEffect(() => {
    if (markets.length === 0) return

    console.log('Setting up real-time updates for all markets')

    const channels = markets.map(market => {
      return supabase
        .channel(`markets-${market.id}`)
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'votes',
            filter: `market_id=eq.${market.id}`
          },
          (payload) => {
            console.log('Real-time vote update for market:', market.id, payload)
            // Refresh stats for the specific market
            refreshMarketStats(market.id)
          }
        )
        .subscribe()
    })

    return () => {
      console.log('Cleaning up real-time subscriptions')
      channels.forEach(channel => supabase.removeChannel(channel))
    }
  }, [markets])

  const refreshMarketStats = useCallback(async (marketId: string) => {
    try {
      const { data: statsData } = await supabase.rpc('get_market_stats', {
        market_uuid: marketId
      })

      if (statsData && statsData.length > 0) {
        setMarkets(prev => prev.map(market => 
          market.id === marketId 
            ? { ...market, stats: statsData[0] }
            : market
        ))
      }
    } catch (err) {
      console.error('Error refreshing stats for market:', marketId, err)
    }
  }, [])

  useEffect(() => {
    fetchMarkets()
  }, [fetchMarkets])

  // Filter and sort markets
  const filteredAndSortedMarkets = markets
    .filter(market => {
      // Filter by status
      if (filter !== 'all' && market.status !== filter) return false
      
      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        return (
          market.title.toLowerCase().includes(searchLower) ||
          market.description.toLowerCase().includes(searchLower)
        )
      }
      
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'votes':
          return (b.stats?.total_votes || 0) - (a.stats?.total_votes || 0)
        case 'confidence':
          return (b.stats?.average_confidence || 0) - (a.stats?.average_confidence || 0)
        case 'created':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'ended':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'resolved':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getConsensusDirection = (stats: MarketWithStats['stats']) => {
    if (!stats || stats.total_votes === 0) return 'neutral'
    
    const weightedSum = stats.weighted_yes - stats.weighted_no
    if (weightedSum > 0.5) return 'yes'
    if (weightedSum < -0.5) return 'no'
    return 'neutral'
  }

  const getConsensusColor = (direction: string) => {
    switch (direction) {
      case 'yes':
        return 'text-green-600 dark:text-green-400'
      case 'no':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading markets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <nav className="flex justify-between items-center p-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-2xl font-bold text-gray-900 dark:text-white">
            Prediction Market
          </Link>
          <div className="hidden md:flex gap-4">
            <Link href="/admin" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Admin
            </Link>
            <Link href="/markets" className="text-blue-600 dark:text-blue-400 font-medium">
              Markets
            </Link>
          </div>
        </div>
        <ConnectButton />
      </nav>
      
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Prediction Markets
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Browse and participate in prediction markets. Vote with confidence levels and see real-time results.
            </p>
          </div>

          {/* Filters and Search */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search Markets
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by title or description..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filter by Status
                </label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Markets</option>
                  <option value="active">Active</option>
                  <option value="ended">Ended</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="created">Most Recent</option>
                  <option value="votes">Most Votes</option>
                  <option value="confidence">Highest Confidence</option>
                </select>
              </div>
            </div>
          </div>

          {/* Markets Grid */}
          {error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={fetchMarkets}
                className="mt-4 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : filteredAndSortedMarkets.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                No Markets Found
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {searchTerm || filter !== 'all' 
                  ? 'No markets match your current filters. Try adjusting your search or filters.'
                  : 'No prediction markets have been created yet.'
                }
              </p>
              <Link
                href="/admin"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Create First Market
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedMarkets.map((market) => {
                const consensus = getConsensusDirection(market.stats)
                return (
                  <div key={market.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(market.status)}`}>
                        {market.status.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(market.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 line-clamp-2">
                      {market.title}
                    </h3>

                    {/* Description */}
                    <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                      {market.description}
                    </p>

                    {/* Statistics */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{market.stats?.total_votes || 0}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Total Votes</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-2xl font-bold ${getConsensusColor(consensus)}`}>
                          {(market.stats?.average_confidence || 0 * 100).toFixed(0)}%
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Avg Confidence</p>
                      </div>
                    </div>

                    {/* Vote Breakdown */}
                    {market.stats && market.stats.total_votes > 0 && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-green-600 dark:text-green-400">
                            Yes: {market.stats.yes_votes}
                          </span>
                          <span className="text-red-600 dark:text-red-400">
                            No: {market.stats.no_votes}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-red-500 h-2 rounded-full"
                            style={{
                              background: `linear-gradient(to right, 
                                green 0%, 
                                green ${(market.stats.yes_votes / market.stats.total_votes) * 100}%, 
                                red ${(market.stats.yes_votes / market.stats.total_votes) * 100}%, 
                                red 100%)`
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link
                        href={`/market/${encodeURIComponent(market.shareable_id)}`}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-center"
                      >
                        {market.status === 'active' ? 'Vote Now' : 'View Results'}
                      </Link>
                      {isConnected && market.created_by === address && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/market/${market.shareable_id}`)
                            alert('Shareable link copied to clipboard!')
                          }}
                          className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                          Share
                        </button>
                      )}
                    </div>

                    {/* Live indicator */}
                    {market.status === 'active' && (
                      <div className="flex items-center gap-2 mt-3 text-sm text-green-600 dark:text-green-400">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        Live updates
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Summary Stats */}
          {markets.length > 0 && (
            <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Market Summary
              </h3>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{markets.length}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Markets</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {markets.filter(m => m.status === 'active').length}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600">
                    {markets.reduce((sum, m) => sum + (m.stats?.total_votes || 0), 0)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Votes</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-orange-600">
                    {markets.filter(m => m.stats && m.stats.total_votes > 0).length}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">With Votes</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
