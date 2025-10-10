'use client'

import { Navigation } from '@/components/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { marketAPI, signatureHelpers, type Market, type MarketStats, type Vote } from '@/lib/apiService'
import { Activity, ArrowLeft, Share2, Target, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useAccount, useWalletClient } from 'wagmi'

export default function MarketPage() {
  const params = useParams()
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [market, setMarket] = useState<Market | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userVote, setUserVote] = useState<Vote | null>(null)
  const [prediction, setPrediction] = useState(0.5)
  const [voteType, setVoteType] = useState<'yes' | 'no'>('yes')
  const [evidence, setEvidence] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [marketStats, setMarketStats] = useState<MarketStats | null>(null)

  const marketId = params.id as string
  const decodedMarketId = decodeURIComponent(marketId)

  const fetchMarket = useCallback(async () => {
    try {
      console.log('Fetching market:', decodedMarketId)
      const data = await marketAPI.getMarket(decodedMarketId)
      setMarket(data)
      setError(null)
    } catch (err: any) {
      console.error('Error loading market:', err)
      setError(err.message || 'Market not found')
    } finally {
      setLoading(false)
    }
  }, [decodedMarketId])

  const fetchUserVote = useCallback(async () => {
    if (!market || !address) return

    try {
      const hasVoted = await marketAPI.hasVoted(market.market_id, address)
      if (hasVoted) {
        const votes = await marketAPI.getVotes(market.market_id)
        const myVote = votes.find(v => v.voter.toLowerCase() === address.toLowerCase())
        if (myVote) {
          setUserVote(myVote)
          setPrediction(myVote.value)
          setVoteType(myVote.value > 0.5 ? 'yes' : 'no')
        }
      }
    } catch (err) {
      console.error('Error fetching user vote:', err)
    }
  }, [market, address])

  const fetchMarketStats = useCallback(async () => {
    if (!market) return

    try {
      const votes = await marketAPI.getVotes(market.market_id)
      const stats = marketAPI.calculateStats(votes)
      setMarketStats(stats)
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

  // Poll for stats updates every 5 seconds
  useEffect(() => {
    if (!market) return

    const interval = setInterval(() => {
      fetchMarketStats()
      fetchUserVote()
    }, 5000)

    return () => clearInterval(interval)
  }, [market, fetchMarketStats, fetchUserVote])

  const handleSubmitVote = async () => {
    if (!isConnected || !address || !walletClient || !market) {
      alert('Please connect your wallet first')
      return
    }

    const now = Math.floor(Date.now() / 1000)
    if (now < market.end_date) {
      alert('Voting has not started yet. Wait until the market ends.')
      return
    }

    if (now > market.voting_deadline) {
      alert('Voting period has ended for this market')
      return
    }

    if (prediction === 0.5) {
      alert('Cannot vote at exactly 50%. Please move the slider or click YES/NO buttons.')
      return
    }

    setIsSubmitting(true)

    try {
      // Create message to sign
      const message = signatureHelpers.getVoteMessage(market.market_id, prediction)
      
      // Sign the message
      const signature = await walletClient.signMessage({ message })

      // Cast vote via API
      await marketAPI.castVote({
        marketId: market.market_id,
        voter: address,
        value: prediction,
        signature
      })

      // Refresh data
      await fetchUserVote()
      await fetchMarketStats()
      
      alert(userVote ? 'Vote updated successfully!' : 'Vote submitted successfully!')
    } catch (err: any) {
      console.error('Error casting vote:', err)
      alert('Error casting vote: ' + (err.message || 'Unknown error'))
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
            {error || "The market you're looking for doesn't exist or has been removed."}
          </p>
          <Link href="/markets">
            <Button>
              Browse Markets
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const now = Math.floor(Date.now() / 1000)
  const isVotingOpen = now >= market.end_date && now <= market.voting_deadline

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
                  {market.resolved ? (
                    <Badge variant="outline">RESOLVED</Badge>
                  ) : now < market.end_date ? (
                    <Badge variant="default">ACTIVE</Badge>
                  ) : now < market.voting_deadline ? (
                    <>
                      <Badge variant="secondary">VOTING</Badge>
                      <Badge variant="outline">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          LIVE
                        </div>
                      </Badge>
                    </>
                  ) : (
                    <Badge variant="outline">ENDED</Badge>
                  )}
                  <Badge variant="outline">{market.category}</Badge>
                </div>
                <CardTitle className="text-2xl">
                  {market.question}
                </CardTitle>
                <CardDescription className="text-base">
                  {market.description}
                </CardDescription>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground mt-4">
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{new Date(market.created_at * 1000).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Market Ends:</span>
                    <span>{new Date(market.end_date * 1000).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Voting Ends:</span>
                    <span>{new Date(market.voting_deadline * 1000).toLocaleString()}</span>
                  </div>
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
                      {isVotingOpen && (
                        <Badge variant="outline" className="ml-auto">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
                          Live
                        </Badge>
                      )}
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
                            {(marketStats.average_vote * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Avg Confidence</div>
                        </CardContent>
                      </Card>
                    </div>

                    {marketStats.total_votes > 0 && (
                      <div className="mt-4">
                        <Progress 
                          value={(marketStats.yes_votes / marketStats.total_votes) * 100}
                          className="h-3"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>No ({marketStats.no_votes})</span>
                          <span>Yes ({marketStats.yes_votes})</span>
                        </div>
                      </div>
                    )}
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
                    : !isVotingOpen
                    ? now < market.end_date
                      ? 'Voting opens after the market ends'
                      : 'Voting period has ended'
                    : 'Vote with confidence - 0 = Definitely No, 1 = Definitely Yes'
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
                            setPrediction(1.0)
                          }}
                          variant={voteType === 'yes' ? 'default' : 'outline'}
                          className="h-12"
                          disabled={!isVotingOpen}
                        >
                          YES
                        </Button>
                        <Button
                          onClick={() => {
                            setVoteType('no')
                            setPrediction(0.0)
                          }}
                          variant={voteType === 'no' ? 'destructive' : 'outline'}
                          className="h-12"
                          disabled={!isVotingOpen}
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
                          
                          if (newPrediction > 0.5) {
                            setVoteType('yes')
                          } else if (newPrediction < 0.5) {
                            setVoteType('no')
                          }
                        }}
                        disabled={!isVotingOpen}
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer disabled:opacity-50"
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

                    {userVote && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <p className="text-sm text-blue-900 dark:text-blue-100">
                          <strong>Your current vote:</strong> {(userVote.value * 100).toFixed(1)}% ({userVote.value > 0.5 ? 'YES' : 'NO'})
                        </p>
                      </div>
                    )}

                    <Separator />

                    {/* Submit Button */}
                    <Button
                      onClick={handleSubmitVote}
                      disabled={isSubmitting || !isVotingOpen || prediction === 0.5}
                      className="w-full"
                      size="lg"
                    >
                      {isSubmitting 
                        ? 'Submitting...' 
                        : prediction === 0.5
                        ? 'Cannot Vote at 50%'
                        : !isVotingOpen
                        ? now < market.end_date
                          ? 'Voting Not Started'
                          : 'Voting Ended'
                        : userVote 
                        ? 'Update Vote' 
                        : 'Submit Vote'
                      }
                    </Button>

                    {!isVotingOpen && (
                      <p className="text-sm text-destructive text-center">
                        {now < market.end_date
                          ? `Voting opens ${new Date(market.end_date * 1000).toLocaleString()}`
                          : `Voting ended ${new Date(market.voting_deadline * 1000).toLocaleString()}`
                        }
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
                navigator.clipboard.writeText(`${window.location.origin}/market/${market.market_id}`)
                alert('Market link copied to clipboard!')
              }}
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share Market
            </Button>
            <Link href="/markets">
              <Button variant="outline" size="lg" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                All Markets
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
