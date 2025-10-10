'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { supabase, type PredictionMarket } from '@/lib/supabase'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { Search, TrendingUp, Users, Target } from 'lucide-react'

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

  useEffect(() => {
    if (markets.length === 0) return

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
            refreshMarketStats(market.id)
          }
        )
        .subscribe()
    })

    return () => {
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

  const filteredAndSortedMarkets = markets
    .filter(market => {
      if (filter !== 'all' && market.status !== filter) return false
      
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

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default' as const
      case 'ended':
        return 'secondary' as const
      case 'resolved':
        return 'outline' as const
      default:
        return 'secondary' as const
    }
  }

  const getConsensusDirection = (stats: MarketWithStats['stats']) => {
    if (!stats || stats.total_votes === 0) return 'neutral'
    
    const weightedSum = stats.weighted_yes - stats.weighted_no
    if (weightedSum > 0.5) return 'yes'
    if (weightedSum < -0.5) return 'no'
    return 'neutral'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading markets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Navigation />
      
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Prediction Markets
            </h1>
            <p className="text-muted-foreground">
              Browse and participate in prediction markets. Vote with confidence levels and see real-time results.
            </p>
          </div>

          {/* Filters and Search */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Search Markets
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search by title or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Filter by Status
                  </label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="all">All Markets</option>
                    <option value="active">Active</option>
                    <option value="ended">Ended</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>

                {/* Sort By */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="created">Most Recent</option>
                    <option value="votes">Most Votes</option>
                    <option value="confidence">Highest Confidence</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Markets Grid */}
          {error ? (
            <Card className="border-destructive">
              <CardContent className="p-6 text-center">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={fetchMarkets} variant="outline">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : filteredAndSortedMarkets.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  No Markets Found
                </h3>
                <p className="text-muted-foreground mb-6">
                  {searchTerm || filter !== 'all' 
                    ? 'No markets match your current filters. Try adjusting your search or filters.'
                    : 'No prediction markets have been created yet.'
                  }
                </p>
                <Link href="/admin">
                  <Button>
                    Create First Market
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedMarkets.map((market) => {
                const consensus = getConsensusDirection(market.stats)
                return (
                  <Card key={market.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <Badge variant={getStatusVariant(market.status)}>
                          {market.status.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(market.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <CardTitle className="line-clamp-2">
                        {market.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-3">
                        {market.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Statistics */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{market.stats?.total_votes || 0}</div>
                          <div className="text-xs text-muted-foreground">Total Votes</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {((market.stats?.average_confidence || 0) * 100).toFixed(0)}%
                          </div>
                          <div className="text-xs text-muted-foreground">Avg Confidence</div>
                        </div>
                      </div>

                      {/* Vote Breakdown */}
                      {market.stats && market.stats.total_votes > 0 && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-green-600">
                              Yes: {market.stats.yes_votes}
                            </span>
                            <span className="text-red-600">
                              No: {market.stats.no_votes}
                            </span>
                          </div>
                          <Progress 
                            value={(market.stats.yes_votes / market.stats.total_votes) * 100}
                            className="h-2"
                          />
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Link href={`/market/${encodeURIComponent(market.shareable_id)}`} className="flex-1">
                          <Button className="w-full" variant={market.status === 'active' ? 'default' : 'outline'}>
                            {market.status === 'active' ? 'Vote Now' : 'View Results'}
                          </Button>
                        </Link>
                        <Link href={`/market/${encodeURIComponent(market.shareable_id)}/live`}>
                          <Button variant="secondary" size="icon">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          </Button>
                        </Link>
                        {isConnected && market.created_by === address && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/market/${market.shareable_id}`)
                              alert('Shareable link copied to clipboard!')
                            }}
                          >
                            📤
                          </Button>
                        )}
                      </div>

                      {/* Live indicator */}
                      {market.status === 'active' && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          Live updates
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Summary Stats */}
          {markets.length > 0 && (
            <Card className="mt-12">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Market Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">{markets.length}</div>
                    <div className="text-sm text-muted-foreground">Total Markets</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {markets.filter(m => m.status === 'active').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Active</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {markets.reduce((sum, m) => sum + (m.stats?.total_votes || 0), 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Votes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600 mb-2">
                      {markets.filter(m => m.stats && m.stats.total_votes > 0).length}
                    </div>
                    <div className="text-sm text-muted-foreground">With Votes</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}