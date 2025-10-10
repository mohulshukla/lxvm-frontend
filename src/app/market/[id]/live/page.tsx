'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { supabase, type PredictionMarket, type Vote } from '@/lib/supabase'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { TrendingUp, Users, Activity, Target, Share2, ArrowLeft } from 'lucide-react'

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
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

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

    console.log('🔴 Setting up live monitoring for market:', market.id)
    setConnectionStatus('connecting')

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
          console.log('🟢 Live vote update received:', payload)
          setLastUpdate(new Date())
          fetchMarketStats()
          fetchVotes()
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status)
        switch (status) {
          case 'SUBSCRIBED':
            setConnectionStatus('connected')
            console.log('✅ Successfully connected to real-time updates')
            break
          case 'CHANNEL_ERROR':
          case 'TIMED_OUT':
            setConnectionStatus('error')
            console.error('❌ Subscription error:', status)
            break
          case 'CLOSED':
            setConnectionStatus('disconnected')
            console.log('🔴 Subscription closed')
            break
          default:
            console.log('📊 Subscription status:', status)
        }
      })

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up live monitoring subscription')
      setConnectionStatus('disconnected')
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

  const getConsensusVariant = (direction: string) => {
    switch (direction) {
      case 'yes':
        return 'default' as const
      case 'no':
        return 'destructive' as const
      default:
        return 'secondary' as const
    }
  }

  const getConsensusIcon = (direction: string) => {
    switch (direction) {
      case 'yes':
        return '✅'
      case 'no':
        return '❌'
      default:
        return '⚖️'
    }
  }

  const getConsensusText = (direction: string) => {
    switch (direction) {
      case 'yes':
        return 'STRONG YES'
      case 'no':
        return 'STRONG NO'
      default:
        return 'NEUTRAL'
    }
  }

  const getConnectionStatusInfo = (status: typeof connectionStatus) => {
    switch (status) {
      case 'connected':
        return {
          text: 'LIVE',
          color: 'bg-green-500',
          textColor: 'text-green-600',
          icon: '🟢'
        }
      case 'connecting':
        return {
          text: 'CONNECTING',
          color: 'bg-yellow-500',
          textColor: 'text-yellow-600',
          icon: '🟡'
        }
      case 'disconnected':
        return {
          text: 'DISCONNECTED',
          color: 'bg-gray-500',
          textColor: 'text-gray-600',
          icon: '⚪'
        }
      case 'error':
        return {
          text: 'ERROR',
          color: 'bg-red-500',
          textColor: 'text-red-600',
          icon: '🔴'
        }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-6"></div>
          <p className="text-xl text-muted-foreground">Loading live monitor...</p>
        </div>
      </div>
    )
  }

  if (error || !market) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Market Not Found
          </h2>
          <p className="text-muted-foreground mb-8">
            The market you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/markets">
            <Button>
              Back to Markets
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const consensus = getConsensusDirection()

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Navigation />
      
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Market Header */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <Badge variant={getConsensusVariant(consensus)} className="text-sm">
                      {market.status.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className={`text-sm ${getConnectionStatusInfo(connectionStatus).textColor}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                          connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                          connectionStatus === 'error' ? 'bg-red-500 animate-pulse' :
                          'bg-gray-500'
                        }`}></div>
                        {getConnectionStatusInfo(connectionStatus).text}
                      </div>
                    </Badge>
                    {lastUpdate && connectionStatus === 'connected' && (
                      <Badge variant="secondary" className="text-xs">
                        Updated {lastUpdate.toLocaleTimeString()}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-4xl mb-4">
                    {market.title}
                  </CardTitle>
                  <CardDescription className="text-xl mb-6">
                    {market.description}
                  </CardDescription>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>Created: {new Date(market.created_at).toLocaleDateString()}</span>
                    <span>Threshold: {(market.resolution_threshold * 100).toFixed(0)}%</span>
                    {isCreator && (
                      <Badge variant="secondary">
                        👑 Your Market
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            {/* Live Statistics Grid */}
            {marketStats && (
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <Card className="text-center">
                    <CardContent className="p-6">
                      <div className="text-4xl font-bold text-primary mb-2">
                        {marketStats.total_votes}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Votes</div>
                    </CardContent>
                  </Card>
                  <Card className="text-center">
                    <CardContent className="p-6">
                      <div className="text-4xl font-bold text-green-600 mb-2">
                        {marketStats.yes_votes}
                      </div>
                      <div className="text-sm text-muted-foreground">Yes Votes</div>
                    </CardContent>
                  </Card>
                  <Card className="text-center">
                    <CardContent className="p-6">
                      <div className="text-4xl font-bold text-red-600 mb-2">
                        {marketStats.no_votes}
                      </div>
                      <div className="text-sm text-muted-foreground">No Votes</div>
                    </CardContent>
                  </Card>
                  <Card className="text-center">
                    <CardContent className="p-6">
                      <div className="text-4xl font-bold text-blue-600 mb-2">
                        {(marketStats.average_confidence * 100).toFixed(0)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Confidence</div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Connection Status Card */}
          {connectionStatus === 'error' && (
            <Card className="mb-8 border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🔴</div>
                  <div>
                    <h3 className="font-semibold text-red-800 dark:text-red-200">
                      Real-time Connection Error
                    </h3>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Unable to connect to live updates. Please check your internet connection and refresh the page.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Consensus Visualization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Live Consensus
                </CardTitle>
              </CardHeader>
              <CardContent>
                {marketStats && marketStats.total_votes > 0 ? (
                  <div className="space-y-6">
                    {/* Main Progress Bar */}
                    <div className="space-y-3">
                      <div className="relative">
                        <div className="w-full h-12 bg-muted rounded-full overflow-hidden border-2 border-border">
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
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-green-600">YES</span>
                        <span className="text-muted-foreground">
                          {((marketStats.yes_votes / marketStats.total_votes) * 100).toFixed(1)}%
                        </span>
                        <span className="text-red-600">NO</span>
                      </div>
                    </div>

                    {/* Confidence Slider */}
                    <div className="space-y-3">
                      <div className="text-lg font-semibold text-foreground">
                        Average Confidence: {((marketStats.average_confidence || 0) * 100).toFixed(1)}%
                      </div>
                      <Progress 
                        value={(marketStats.average_confidence || 0) * 100} 
                        className="h-3"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>0%</span>
                        <span>100%</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Consensus Indicator */}
                    <Card className="text-center">
                      <CardContent className="p-6">
                        <div className="text-3xl font-bold mb-2">
                          {getConsensusIcon(consensus)} {getConsensusText(consensus)}
                        </div>
                        <div className="text-muted-foreground">
                          Weighted Sum: {((marketStats.weighted_yes - marketStats.weighted_no) * 100).toFixed(1)}%
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      No Votes Yet
                    </h3>
                    <p className="text-muted-foreground">
                      Waiting for the first vote to appear...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Individual Voters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Live Voters ({votes.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {votes.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {votes.map((vote, index) => (
                      <Card 
                        key={vote.id}
                        className={cn(
                          "transition-all duration-500 ease-out animate-fadeIn",
                          vote.vote_type === 'yes' 
                            ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20" 
                            : "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-4 h-4 rounded-full",
                                vote.vote_type === 'yes' ? "bg-green-500" : "bg-red-500"
                              )} />
                              <Badge variant={vote.vote_type === 'yes' ? 'default' : 'destructive'}>
                                {vote.vote_type.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="font-bold">
                              {(vote.prediction * 100).toFixed(0)}%
                            </div>
                          </div>
                          
                          <Progress 
                            value={vote.prediction * 100} 
                            className="h-3 mb-3"
                          />
                          
                          <div className="text-sm text-muted-foreground">
                            {vote.user?.wallet_address.slice(0, 6)}...{vote.user?.wallet_address.slice(-4)} • 
                            {new Date(vote.created_at).toLocaleTimeString()}
                            {vote.prediction === 1.0 && vote.vote_type === 'yes' && (
                              <span className="text-green-600 ml-2">(Certain YES)</span>
                            )}
                            {vote.prediction === 0.0 && vote.vote_type === 'no' && (
                              <span className="text-red-600 ml-2">(Certain NO)</span>
                            )}
                          </div>
                          
                          {vote.evidence && (
                            <div className="mt-2 text-sm italic text-muted-foreground">
                              "{vote.evidence.slice(0, 100)}{vote.evidence.length > 100 ? '...' : ''}"
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">👥</div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      No Voters Yet
                    </h3>
                    <p className="text-muted-foreground">
                      Share the market link to get started!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="mt-8 flex justify-center gap-4">
            <Link href={`/market/${marketId}`}>
              <Button size="lg" className="gap-2">
                <Target className="h-4 w-4" />
                Vote on This Market
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/market/${market.shareable_id}`)
                alert('Market link copied to clipboard!')
              }}
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share Market
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => {
                console.log('🔄 Manual refresh triggered')
                fetchMarketStats()
                fetchVotes()
              }}
              className="gap-2"
            >
              <Activity className="h-4 w-4" />
              Refresh Data
            </Button>
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