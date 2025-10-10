'use client'

import { useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { supabase } from '@/lib/supabase'

export default function AdminDashboard() {
  const { address, isConnected } = useAccount()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [threshold, setThreshold] = useState(0.1)
  const [isCreating, setIsCreating] = useState(false)
  const [createdMarket, setCreatedMarket] = useState<any>(null)

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
    } catch (error) {
      console.error('Unexpected error:', error)
      alert('An unexpected error occurred')
    } finally {
      setIsCreating(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <nav className="flex justify-between items-center p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <ConnectButton />
        </nav>
        
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Please connect your wallet to access the admin dashboard
            </p>
            <ConnectButton />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <nav className="flex justify-between items-center p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Admin Dashboard
        </h1>
        <ConnectButton />
      </nav>
      
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Create Market Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                Create New Market
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Market Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Will Bitcoin reach $100k by end of 2024?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Provide detailed context about the prediction market..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Resolution Threshold ({threshold})
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="0.5"
                    step="0.05"
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Auto-resolve when weighted vote sum is below {threshold} or above {1 - threshold}
                  </p>
                </div>

                <button
                  onClick={handleCreateMarket}
                  disabled={isCreating}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  {isCreating ? 'Creating...' : 'Create Market'}
                </button>
              </div>
            </div>

            {/* Created Market Display */}
            {createdMarket && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                  Market Created!
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">Title:</h3>
                    <p className="text-gray-600 dark:text-gray-300">{createdMarket.title}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">Description:</h3>
                    <p className="text-gray-600 dark:text-gray-300">{createdMarket.description}</p>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">Shareable Link:</h3>
                    <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                      <code className="text-sm break-all">
                        {typeof window !== 'undefined' ? window.location.origin : ''}/market/{createdMarket.shareable_id}
                      </code>
                    </div>
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          navigator.clipboard.writeText(`${window.location.origin}/market/${createdMarket.shareable_id}`)
                          alert('Link copied to clipboard!')
                        }
                      }}
                      className="mt-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Copy Link
                    </button>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">Market ID:</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{createdMarket.shareable_id}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Market Management */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                Manage Markets
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                View and manage your created markets, monitor voting progress, and resolve markets.
              </p>
              <button className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg transition-colors">
                View All Markets
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
