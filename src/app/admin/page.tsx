'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { supabase, type PredictionMarket } from '@/lib/supabase'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { Plus, TrendingUp, Users, Target, Copy, ExternalLink } from 'lucide-react'

export default function AdminDashboard() {
  const { address, isConnected } = useAccount()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [threshold, setThreshold] = useState(0.1)
  const [isCreating, setIsCreating] = useState(false)
  const [createdMarket, setCreatedMarket] = useState<PredictionMarket | null>(null)
  const [marketStats, setMarketStats] = useState<{
    total_votes: number
    yes_votes: number
    no_votes: number
    average_confidence: number
  } | null>(null)

  const handleCreateMarket = async () => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first')
      return
    }

    if (!title.trim() || !description.trim()) {
      alert('Please fill in all fields')
      return
    }

    setIsCreating(true)
    
    try {
      // First, ensure the user exists in our database
      const { error: userError } = await supabase
        .from('users')
        .upsert({ wallet_address: address }, { onConflict: 'wallet_address' })

      if (userError) {
        console.error('Error creating user:', userError)
      } else {
        console.log('User created/updated successfully')
      }

      // Create the market using our database function
      const { data, error } = await supabase.rpc('create_prediction_market', {
        market_title: title,
        market_description: description,
        creator_address: address,
        threshold: threshold
      })

      if (error) {
        console.error('Error creating market:', error)
        alert('Error creating market: ' + error.message)
        return
      }

      // Fetch the created market details
      const { data: marketData, error: marketError } = await supabase
        .from('prediction_markets')
        .select('*')
        .eq('id', data)
        .single()

      if (marketError) {
        console.error('Error fetching market:', marketError)
        alert('Market created but error fetching details')
        return
      }

      setCreatedMarket(marketData)
      setTitle('')
      setDescription('')
      setThreshold(0.1)
      
      // Set up real-time updates for the created market
      if (marketData) {
        setupRealtimeUpdates(marketData.id)
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      alert('An unexpected error occurred')
    } finally {
      setIsCreating(false)
    }
  }

  const setupRealtimeUpdates = (marketId: string) => {
    console.log('Setting up real-time updates for market:', marketId)
    
    const channel = supabase
      .channel(`admin-market-${marketId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'votes',
          filter: `market_id=eq.${marketId}`
        }, 
        (payload) => {
          console.log('Real-time vote update in admin:', payload)
          fetchMarketStats(marketId)
        }
      )
      .subscribe()

    return () => {
      console.log('Cleaning up admin real-time subscription')
      supabase.removeChannel(channel)
    }
  }

  const fetchMarketStats = async (marketId?: string) => {
    const targetMarketId = marketId || createdMarket?.id
    if (!targetMarketId) return

    try {
      const { data } = await supabase.rpc('get_market_stats', {
        market_uuid: targetMarketId
      })

      if (data && data.length > 0) {
        setMarketStats(data[0])
      }
    } catch (err) {
      console.error('Error fetching market stats:', err)
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <Navigation />
        
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-md mx-auto">
            <Card>
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  Connect Your Wallet
                </h2>
                <p className="text-muted-foreground mb-6">
                  Please connect your wallet to access the admin dashboard
                </p>
                <Button asChild>
                  <span>Connect Wallet</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Navigation />
      
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Create and manage prediction markets with real-time monitoring
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Create Market Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create New Market
                </CardTitle>
                <CardDescription>
                  Set up a new prediction market with custom parameters
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Market Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Will Bitcoin reach $100k by end of 2024?"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Provide detailed context about the prediction market..."
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="threshold">
                    Resolution Threshold: {threshold}
                  </Label>
                  <input
                    id="threshold"
                    type="range"
                    min="0.05"
                    max="0.5"
                    step="0.05"
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground">
                    Auto-resolve when weighted vote sum is below {threshold} or above {1 - threshold}
                  </p>
                </div>

                <Button
                  onClick={handleCreateMarket}
                  disabled={isCreating}
                  className="w-full"
                  size="lg"
                >
                  {isCreating ? 'Creating...' : 'Create Market'}
                </Button>
              </CardContent>
            </Card>

            {/* Created Market Display */}
            {createdMarket && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Market Created!
                  </CardTitle>
                  <CardDescription>
                    Your market is now live and ready for participants
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Title:</Label>
                      <p className="text-foreground">{createdMarket.title}</p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Description:</Label>
                      <p className="text-muted-foreground">{createdMarket.description}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Shareable Link:</Label>
                      <div className="bg-muted p-3 rounded-md">
                        <code className="text-sm break-all">
                          {typeof window !== 'undefined' ? window.location.origin : ''}/market/{createdMarket.shareable_id}
                        </code>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              navigator.clipboard.writeText(`${window.location.origin}/market/${createdMarket.shareable_id}`)
                              alert('Link copied to clipboard!')
                            }
                          }}
                          className="flex-1"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Link
                        </Button>
                        <Link href={`/market/${encodeURIComponent(createdMarket.shareable_id)}/live`}>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Market ID:</Label>
                      <p className="text-xs text-muted-foreground font-mono">{createdMarket.shareable_id}</p>
                    </div>
                  </div>

                  {/* Real-time Statistics */}
                  {marketStats && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Live Statistics
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <Card>
                            <CardContent className="p-4 text-center">
                              <div className="text-2xl font-bold text-primary">{marketStats.total_votes}</div>
                              <div className="text-xs text-muted-foreground">Total Votes</div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4 text-center">
                              <div className="text-2xl font-bold text-green-600">{marketStats.yes_votes}</div>
                              <div className="text-xs text-muted-foreground">Yes Votes</div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4 text-center">
                              <div className="text-2xl font-bold text-red-600">{marketStats.no_votes}</div>
                              <div className="text-xs text-muted-foreground">No Votes</div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4 text-center">
                              <div className="text-2xl font-bold text-blue-600">
                                {(marketStats.average_confidence * 100).toFixed(1)}%
                              </div>
                              <div className="text-xs text-muted-foreground">Avg Confidence</div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Market Management */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Manage Markets
                </CardTitle>
                <CardDescription>
                  View and manage all markets, monitor voting progress, and resolve markets.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/markets">
                  <Button className="w-full" size="lg">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View All Markets
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}