import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, polygon, optimism, arbitrum, base, sepolia } from 'wagmi/chains'

// Configuration with proper WalletConnect project ID
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'e71d76489f1ae95bd0b9a6eb7e2ff7b9'

export const config = getDefaultConfig({
  appName: 'Prediction Market',
  projectId: projectId,
  chains: [mainnet, polygon, optimism, arbitrum, base, sepolia],
  ssr: true,
})

export { WagmiProvider, RainbowKitProvider } from '@rainbow-me/rainbowkit'
