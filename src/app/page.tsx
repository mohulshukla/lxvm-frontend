'use client'

import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Navigation />
      
      <main className="container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            Market Resolution with EigenCloud
          </Badge>
          <h1 className="text-5xl font-bold text-foreground mb-6">
            Vote on the Outcome
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Create and participate in prediction markets with real-time voting, confidence levels, and instant results.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto mb-16">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                {/* <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary font-bold">📊</span>
                </div> */}
                Create Markets
              </CardTitle>
              <CardDescription className="text-center">
                Generate shareable links for voters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin">
                <Button className="w-full" size="lg">
                  Admin Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                {/* <div className="w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold">🗳️</span>
                </div> */}
                Participate
              </CardTitle>
              <CardDescription className="text-center">
                Use your wallet and start voting with confidence
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/markets">
                <Button className="w-full" size="lg" variant="default">
                  Browse All Markets
                </Button>
              </Link>
              {/* <p className="text-center text-sm text-muted-foreground">
                Or use a shareable link to join a specific market
              </p> */}
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground mb-8">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <h3 className="font-semibold text-foreground mb-2">Create</h3>
                <p className="text-muted-foreground">Admin creates a prediction market with a question</p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">2</span>
                </div>
                <h3 className="font-semibold text-foreground mb-2">Share</h3>
                <p className="text-muted-foreground">Share the link with participants to vote</p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
                <h3 className="font-semibold text-foreground mb-2">Vote</h3>
                <p className="text-muted-foreground">Participants vote with confidence levels and evidence</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}