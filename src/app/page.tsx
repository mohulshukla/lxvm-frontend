'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <nav className="flex justify-between items-center p-6">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Prediction Market
          </h1>
          <div className="hidden md:flex gap-4">
            <Link href="/markets" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Markets
            </Link>
            <Link href="/admin" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Admin
            </Link>
          </div>
        </div>
        <ConnectButton />
      </nav>
      
      <main className="container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Decentralized Prediction Markets
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Create and participate in prediction markets with real-time voting and results
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Create Markets
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              As an admin, create prediction markets and generate shareable links for participants.
            </p>
            <Link
              href="/admin"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Admin Dashboard
            </Link>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Participate
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Vote on prediction markets using your wallet with confidence levels from 0 to 1.
            </p>
            <div className="space-y-4">
              <Link
                href="/markets"
                className="block w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors text-center"
              >
                Browse All Markets
              </Link>
              <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                Or use a shareable link to join a specific market
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-8">
            How it works
          </h3>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">1</span>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Create</h4>
              <p className="text-gray-600 dark:text-gray-300">Admin creates a prediction market with a question</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">2</span>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Share</h4>
              <p className="text-gray-600 dark:text-gray-300">Share the link with participants to vote</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">3</span>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Vote</h4>
              <p className="text-gray-600 dark:text-gray-300">Participants vote with confidence levels and evidence</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
