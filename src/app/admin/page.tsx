'use client'

import { Navigation } from '@/components/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { marketAPI, signatureHelpers, type Market, type MarketStats } from '@/lib/apiService'
import { Copy, ExternalLink, Plus, Target, TrendingUp, Users } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAccount, useWalletClient } from 'wagmi'

export default function AdminDashboard() {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Crypto')
  const [endDate, setEndDate] = useState('')
  const [votingPeriod, setVotingPeriod] = useState(86400) // 24 hours default
  const [isCreating, setIsCreating] = useState(false)
  const [createdMarket, setCreatedMarket] = useState<Market | null>(null)
  const [marketStats, setMarketStats] = useState<MarketStats | null>(null)
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null)

  const handleCreateMarket = async () => {
    console.log('🔵 Create Market clicked!')
    console.log('Wallet status:', { isConnected, address, hasWalletClient: !!walletClient })
    
    if (!isConnected || !address || !walletClient) {
      console.log('❌ Wallet not connected')
      alert('Please connect your wallet first')
      return
    }

    console.log('Form values:', { title, description, endDate, category })
    
    if (!title.trim() || !description.trim() || !endDate.trim()) {
      console.log('❌ Missing required fields')
      alert('Please fill in all required fields')
      return
    }

    // Validate question length (backend requires at least 10 characters)
    if (title.trim().length < 10) {
      console.log('❌ Question too short')
      alert('Market question must be at least 10 characters long')
      return
    }

    // Validate end date
    const endDateTimestamp = Math.floor(new Date(endDate).getTime() / 1000)
    
    console.log('Date validation:', { 
      endDateTimestamp,
      isValid: !isNaN(endDateTimestamp) && endDateTimestamp > 0
    })
    
    if (isNaN(endDateTimestamp) || endDateTimestamp <= 0) {
      console.log('❌ Invalid end date')
      alert('Please select a valid end date')
      return
    }
    
    // Note: We don't check if the date is in the future here anymore
    // The smart contract will handle that validation when creating the market

    console.log('✅ All validations passed, requesting signature...')
    setIsCreating(true)
    
    try {
      
      // Create message to sign
      const message = signatureHelpers.getCreateMarketMessage(title, endDateTimestamp)
      console.log('📝 Message to sign:', message)
      
      // Sign the message with the connected wallet
      console.log('🔐 Requesting wallet signature...')
      const signature = await walletClient.signMessage({ message })
      console.log('✅ Signature received:', signature.slice(0, 20) + '...')

      // Create market via API
      const result = await marketAPI.createMarket({
        question: title,
        description,
        category,
        endDate: endDateTimestamp,
        votingPeriod,
        creator: address,
        signature
      })

      console.log('Market created successfully:', result)

      // Fetch the created market details
      const market = await marketAPI.getMarket(result.marketId)
      setCreatedMarket(market)

      // Clear form
      setTitle('')
      setDescription('')
      setEndDate('')
      
      // Start polling for stats
      startStatsPolling(market.market_id)
      
      alert('Market created successfully!')
    } catch (error: any) {
      console.error('Error creating market:', error)
      alert('Error creating market: ' + (error.message || 'Unknown error'))
    } finally {
      setIsCreating(false)
    }
  }

  const startStatsPolling = (marketId: string) => {
    // Clear any existing interval
    if (pollInterval) {
      clearInterval(pollInterval)
    }

    // Initial fetch
    fetchMarketStats(marketId)

    // Poll every 5 seconds for updates
    const interval = setInterval(() => {
      fetchMarketStats(marketId)
    }, 5000)

    setPollInterval(interval)
  }

  const fetchMarketStats = async (marketId?: string) => {
    const targetMarketId = marketId || createdMarket?.market_id
    if (!targetMarketId) return

    try {
      const votes = await marketAPI.getVotes(targetMarketId)
      const stats = marketAPI.calculateStats(votes)
      setMarketStats(stats)
    } catch (err) {
      console.error('Error fetching market stats:', err)
    }
  }

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [pollInterval])

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
                  <Label htmlFor="title">Market Question</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Will Bitcoin reach $100k by end of 2025?"
                    minLength={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 10 characters ({title.length}/10)
                  </p>
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
                  <p className="text-xs text-muted-foreground">
                    Maximum 2000 characters ({description.length}/2000)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="Crypto">Crypto</option>
                    <option value="Politics">Politics</option>
                    <option value="Sports">Sports</option>
                    <option value="Technology">Technology</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">Market End Date</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    When the market closes for predictions (select any future time)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="votingPeriod">
                    Voting Period: {votingPeriod / 3600} hours
                  </Label>
                  <input
                    id="votingPeriod"
                    type="range"
                    min="3600"
                    max="604800"
                    step="3600"
                    value={votingPeriod}
                    onChange={(e) => setVotingPeriod(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Time allowed for voting after market ends (1 hour to 7 days)
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
                      <Label className="text-sm font-medium">Question:</Label>
                      <p className="text-foreground">{createdMarket.question}</p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Description:</Label>
                      <p className="text-muted-foreground">{createdMarket.description}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Category:</Label>
                      <Badge>{createdMarket.category}</Badge>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">End Date:</Label>
                      <p className="text-sm">{new Date(createdMarket.end_date * 1000).toLocaleString()}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Shareable Link:</Label>
                      <div className="bg-muted p-3 rounded-md">
                        <code className="text-sm break-all">
                          {typeof window !== 'undefined' ? window.location.origin : ''}/market/{createdMarket.market_id}
                        </code>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              navigator.clipboard.writeText(`${window.location.origin}/market/${createdMarket.market_id}`)
                              alert('Link copied to clipboard!')
                            }
                          }}
                          className="flex-1"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Link
                        </Button>
                        <Link href={`/market/${encodeURIComponent(createdMarket.market_id)}/live`}>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Market ID:</Label>
                      <p className="text-xs text-muted-foreground font-mono">{createdMarket.market_id}</p>
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
                          <Badge variant="outline" className="ml-auto">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
                            Live
                          </Badge>
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
                                {(marketStats.average_vote * 100).toFixed(1)}%
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