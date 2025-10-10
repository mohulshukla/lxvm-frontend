import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, polygon, optimism, arbitrum, base, sepolia } from 'wagmi/chains'

// Generate a simple project ID if none is provided
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'prediction-market-app'

export const config = getDefaultConfig({
  appName: 'Prediction Market',
  projectId: projectId,
  chains: [mainnet, polygon, optimism, arbitrum, base, sepolia],
  ssr: true,
})

export { WagmiProvider, RainbowKitProvider } from '@rainbow-me/rainbowkit'
