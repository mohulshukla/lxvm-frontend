import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, polygon, optimism, arbitrum, base, sepolia } from 'wagmi/chains'

// Simple configuration that works without WalletConnect project
export const config = getDefaultConfig({
  appName: 'Prediction Market',
  projectId: 'prediction-market-app', // Simple project name
  chains: [mainnet, polygon, optimism, arbitrum, base, sepolia],
  ssr: true,
})

export { WagmiProvider, RainbowKitProvider } from '@rainbow-me/rainbowkit'
