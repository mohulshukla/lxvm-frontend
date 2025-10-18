# Prediction Market Platform
A decentralized prediction market platform built with Next.js, Supabase, and RainbowKit for MetaMask wallet integration.

## Note on Deployment
Head to http://10.40.197.61:3001/ for a working blockchain implementation, since Vercel cannot interface with the server. This link will work when our server is up and running.


## Features

- **Admin Dashboard**: Create prediction markets with custom questions and descriptions
- **Shareable Links**: Generate unique links for each market to share with participants
- **Wallet Integration**: Connect with MetaMask using RainbowKit
- **Confidence Voting**: Vote with confidence levels from 0 to 1 (0% to 100%)
- **Real-time Statistics**: View live voting results and market statistics
- **Auto-resolution**: Markets automatically resolve based on weighted vote thresholds

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# WalletConnect Project ID (optional)
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id_here
```

### 2. Supabase Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor in your Supabase dashboard
3. Run the SQL schema from `supabase-schema.sql` to create the necessary tables and functions
4. Copy your project URL and anon key to the environment variables

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Usage

### Admin Dashboard (`/admin`)
- Connect your wallet
- Create new prediction markets
- Set resolution thresholds
- Generate shareable links
- Monitor voting progress

### Market Voting (`/market/[id]`)
- Access markets via shareable links
- Connect wallet to vote
- Vote YES or NO with confidence levels
- Provide optional evidence/reasoning
- View real-time market statistics

## Database Schema

The application uses the following main tables:
- `users`: Wallet addresses and user information
- `prediction_markets`: Market details and metadata
- `votes`: Individual votes with confidence levels and evidence

## Deployment

Deploy to Vercel:

```bash
npm run build
```

Make sure to set your environment variables in the Vercel dashboard.

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Wallet**: RainbowKit + Wagmi
- **Deployment**: Vercel
