# Polymarket Resolver API Integration

This frontend has been integrated with the polymarket-resolver API backend for creating markets, viewing markets, and voting.

## Changes Made

### 1. New API Service (`src/lib/apiService.ts`)
- Replaced Supabase calls with REST API calls to the polymarket-resolver backend
- Handles wallet signature generation for market creation and voting
- Provides helper functions for all market operations:
  - `createMarket()` - Create a new prediction market
  - `getAllMarkets()` - Get all markets
  - `getActiveMarkets()` - Get active markets
  - `getVotingMarkets()` - Get markets in voting period
  - `getMarket()` - Get a specific market
  - `castVote()` - Submit a vote
  - `getVotes()` - Get all votes for a market
  - `hasVoted()` - Check if an address has voted
  - `calculateStats()` - Calculate market statistics

### 2. Updated Components

#### Admin Dashboard (`src/app/admin/page.tsx`)
- Uses `useWalletClient` from wagmi to sign messages
- Creates markets via API with wallet signatures
- Polls for stats updates every 5 seconds
- Added fields for category, end date, and voting period

#### Markets Listing (`src/app/markets/page.tsx`)
- Fetches markets from API endpoints
- Polls for updates every 10 seconds
- Filters by status: all, active, voting, resolved
- Shows real-time vote counts and statistics

#### Individual Market Page (`src/app/market/[id]/page.tsx`)
- Displays market details from API
- Handles voting with wallet signatures
- Shows voting period status
- Polls for stats updates every 5 seconds
- Prevents voting outside of voting period

## Configuration

### Environment Variables

Create a `.env.local` file in the frontend root:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
```

For production:
```bash
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

### Backend Setup

The polymarket-resolver API must be running and accessible. See `../polymarket-resolver/api/README.md` for backend setup instructions.

#### Required Backend Endpoints:
- `POST /api/markets` - Create market
- `GET /api/markets` - List all markets
- `GET /api/markets/active` - List active markets
- `GET /api/markets/voting` - List markets in voting period
- `GET /api/markets/:id` - Get market details
- `POST /api/markets/:id/vote` - Cast vote
- `GET /api/markets/:id/votes` - Get votes
- `GET /api/markets/:id/has-voted/:voter` - Check if voted

## How It Works

### Market Creation Flow

1. User fills out form on `/admin` page
2. User's wallet signs a message: `Create market: {question} ending at {endDate}`
3. Frontend sends signed message + market data to API
4. API verifies signature and submits transaction to blockchain (TEE pays gas)
5. Market is created and stored in API's database
6. Frontend displays shareable link

### Voting Flow

1. User navigates to market page via shareable link
2. User moves confidence slider (0 = No, 1 = Yes)
3. User's wallet signs message: `Vote on market {marketId} with value {value}`
4. Frontend sends signed vote + signature to API
5. API verifies signature and submits vote transaction (TEE pays gas)
6. Vote is recorded on-chain and cached in database
7. Frontend shows updated statistics

### Real-time Updates

- Markets page: Polls every 10 seconds for new markets and vote counts
- Individual market page: Polls every 5 seconds for vote updates
- Admin dashboard: Polls every 5 seconds after creating a market

## Key Differences from Supabase Version

### Before (Supabase):
- Direct database access from frontend
- Real-time subscriptions via Supabase
- Users needed Supabase setup

### After (API Integration):
- RESTful API calls to polymarket-resolver
- Polling for updates (simpler, no WebSocket setup needed)
- Users only need the API URL
- TEE handles all gas payments
- Wallet signatures for authentication
- On-chain verification via smart contracts

## Data Models

### Market
```typescript
{
  market_id: string
  question: string
  description: string
  category: string
  outcomes: string[]
  end_date: number // Unix timestamp
  voting_deadline: number // Unix timestamp
  created_at: number // Unix timestamp
  creator: string // Wallet address
  resolved: boolean
  on_chain: boolean
  tx_hash?: string
}
```

### Vote
```typescript
{
  voter: string // Wallet address
  value: number // 0-1 scale (0=No, 1=Yes)
  timestamp: number // Unix timestamp
  tx_hash?: string
}
```

### MarketStats
```typescript
{
  total_votes: number
  yes_votes: number // votes > 0.5
  no_votes: number // votes < 0.5
  average_vote: number // mean of all votes
}
```

## Development

### Install Dependencies
```bash
cd lxvm-frontend
npm install
```

### Run Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:3001` (or next available port).

### Build for Production
```bash
npm run build
npm start
```

## Testing

1. **Start the API backend:**
   ```bash
   cd ../polymarket-resolver/api
   npm run dev
   ```

2. **Start the frontend:**
   ```bash
   npm run dev
   ```

3. **Connect your wallet** (MetaMask, etc.)

4. **Create a test market** on `/admin`

5. **Vote on the market** using the shareable link

6. **View real-time updates** as votes come in

## Deployment

### Frontend (Vercel/Netlify)
1. Set `NEXT_PUBLIC_API_URL` environment variable to your deployed API URL
2. Deploy the frontend to Vercel or Netlify

### API Backend (EigenCompute TEE)
See `../polymarket-resolver/DEPLOYMENT_GUIDE.md` for backend deployment instructions.

## Troubleshooting

### "Failed to fetch markets"
- Check that the API backend is running
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check browser console for CORS errors

### "Invalid signature"
- Ensure wallet is connected
- Check that the message format matches API expectations
- Verify the wallet client is properly initialized

### "Voting period ended"
- Market voting period has expired
- Check market details for voting_deadline

### Stats not updating
- Frontend polls every 5-10 seconds
- Wait a few seconds for next poll
- Refresh the page manually if needed

## Security

- All transactions require wallet signatures
- API verifies signatures before submitting to blockchain
- TEE wallet pays all gas fees (users don't need ETH)
- On-chain votes are immutable and transparent
- Real-time updates use simple polling (no WebSocket auth needed)

## Future Enhancements

- [ ] Add WebSocket support for real-time updates (instead of polling)
- [ ] Implement caching with React Query
- [ ] Add optimistic UI updates
- [ ] Support for multiple chains
- [ ] Market categories and filtering
- [ ] User profiles and vote history
- [ ] Market analytics dashboard


