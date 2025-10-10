'use client'

import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NavigationProps {
  className?: string
}

export function Navigation({ className }: NavigationProps) {
  return (
    <nav className={cn("flex justify-between items-center p-6 bg-background/80 backdrop-blur-sm border-b border-border", className)}>
      <div className="flex items-center gap-6">
        <Link href="/" className="text-2xl font-bold text-foreground hover:text-primary transition-colors">
          Prediction Market
        </Link>
        <div className="hidden md:flex gap-4">
          <Link href="/markets">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              Markets
            </Button>
          </Link>
          <Link href="/admin">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              Admin
            </Button>
          </Link>
        </div>
      </div>
      <ConnectButton />
    </nav>
  )
}
