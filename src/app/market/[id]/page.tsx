'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { supabase, type PredictionMarket, type Vote } from '@/lib/supabase'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { Target, TrendingUp, Users, Activity, Share2, ArrowLeft } from 'lucide-react'

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
          fetchMarketStats()
          if (address && (payload.new as any)?.voter_address === address) {
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

  const handleSubmitVote = async () => {
    if (!isConnected || !address || !market) {
      alert('Please connect your wallet first')
      return
    }

    if (market.status !== 'active') {
      alert('This market is no longer accepting votes')
      return
    }

    if (prediction === 0.5) {
      alert('Cannot vote at exactly 50%. Please move the slider or click YES/NO buttons.')
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
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading market...</p>
        </div>
      </div>
    )
  }

  if (error || !market) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Market Not Found
          </h2>
          <p className="text-muted-foreground mb-6">
            The market you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link href="/">
            <Button>
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Navigation />
      
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Market Details */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={market.status === 'active' ? 'default' : 'secondary'}>
                    {market.status.toUpperCase()}
                  </Badge>
                  {market.status === 'active' && (
                    <Badge variant="outline">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        LIVE
                      </div>
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-2xl">
                  {market.title}
                </CardTitle>
                <CardDescription className="text-base">
                  {market.description}
                </CardDescription>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4">
                  <span>Created: {new Date(market.created_at).toLocaleDateString()}</span>
                  <span>Threshold: {(market.resolution_threshold * 100).toFixed(0)}%</span>
                </div>
              </CardHeader>

              {/* Market Statistics */}
              {marketStats && (
                <CardContent>
                  <Separator className="mb-6" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Market Statistics
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-primary">{marketStats.total_votes}</div>
                          <div className="text-sm text-muted-foreground">Total Votes</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">{marketStats.yes_votes}</div>
                          <div className="text-sm text-muted-foreground">Yes Votes</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-red-600">{marketStats.no_votes}</div>
                          <div className="text-sm text-muted-foreground">No Votes</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {(marketStats.average_confidence * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Avg Confidence</div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Voting Interface */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  {!isConnected ? 'Connect to Vote' : (userVote ? 'Update Your Vote' : 'Cast Your Vote')}
                </CardTitle>
                <CardDescription>
                  {!isConnected 
                    ? 'Please connect your wallet to participate in this prediction market'
                    : 'Vote with confidence and provide evidence for your prediction'
                  }
                </CardDescription>
              </CardHeader>

              <CardContent>
                {!isConnected ? (
                  <div className="text-center py-8">
                    <Button size="lg">
                      Connect Wallet to Vote
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Vote Type */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Your Prediction</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          onClick={() => {
                            setVoteType('yes')
                            setPrediction(1.0) // 100% confidence for manual YES
                          }}
                          variant={voteType === 'yes' ? 'default' : 'outline'}
                          className="h-12"
                        >
                          YES
                        </Button>
                        <Button
                          onClick={() => {
                            setVoteType('no')
                            setPrediction(0.0) // 0% confidence for manual NO
                          }}
                          variant={voteType === 'no' ? 'destructive' : 'outline'}
                          className="h-12"
                        >
                          NO
                        </Button>
                      </div>
                    </div>

                    {/* Confidence Level */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">
                        Confidence Level: {(prediction * 100).toFixed(1)}%
                        {prediction === 0.5 && (
                          <span className="text-destructive text-sm ml-2">(Cannot vote at 50%)</span>
                        )}
                      </Label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={prediction}
                        onChange={(e) => {
                          const newPrediction = parseFloat(e.target.value)
                          setPrediction(newPrediction)
                          
                          // Auto-select vote type based on confidence
                          if (newPrediction > 0.5) {
                            setVoteType('yes')
                          } else if (newPrediction < 0.5) {
                            setVoteType('no')
                          }
                          // At exactly 0.5, don't change vote type (user must choose manually)
                        }}
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>0% (Certain NO)</span>
                        <span className="text-destructive font-medium">50% (Cannot vote)</span>
                        <span>100% (Certain YES)</span>
                      </div>
                      
                      {/* Current selection indicator */}
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-lg font-semibold">
                          {prediction > 0.5 ? (
                            <span className="text-green-600">✅ YES - {(prediction * 100).toFixed(1)}% confident</span>
                          ) : prediction < 0.5 ? (
                            <span className="text-red-600">❌ NO - {((1 - prediction) * 100).toFixed(1)}% confident</span>
                          ) : (
                            <span className="text-destructive">⚠️ Cannot vote at exactly 50%</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Evidence */}
                    <div className="space-y-3">
                      <Label htmlFor="evidence" className="text-base font-medium">
                        Evidence/Reasoning (Optional)
                      </Label>
                      <textarea
                        id="evidence"
                        value={evidence}
                        onChange={(e) => setEvidence(e.target.value)}
                        rows={3}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Explain your reasoning or provide evidence..."
                      />
                    </div>

                    <Separator />

                    {/* Submit Button */}
                    <Button
                      onClick={handleSubmitVote}
                      disabled={isSubmitting || market.status !== 'active' || prediction === 0.5}
                      className="w-full"
                      size="lg"
                    >
                      {isSubmitting 
                        ? 'Submitting...' 
                        : prediction === 0.5
                        ? 'Cannot Vote at 50%'
                        : userVote 
                        ? 'Update Vote' 
                        : 'Submit Vote'
                      }
                    </Button>

                    {market.status !== 'active' && (
                      <p className="text-sm text-destructive text-center">
                        This market is no longer accepting votes
                      </p>
                    )}
                    
                    {prediction === 0.5 && market.status === 'active' && (
                      <p className="text-sm text-destructive text-center">
                        Move the slider or click YES/NO to vote
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="mt-8 flex justify-center gap-4">
            <Link href={`/market/${marketId}/live`}>
              <Button variant="outline" size="lg" className="gap-2">
                <Activity className="h-4 w-4" />
                Live Monitor
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/market/${market.shareable_id}`)
                alert('Market link copied to clipboard!')
              }}
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share Market
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}