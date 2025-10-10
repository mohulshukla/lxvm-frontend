# Test Real-time Updates

## Quick Test Setup

### Step 1: Open Two Browser Windows
1. **Window 1**: Open the live page (`/market/[market-id]/live`)
2. **Window 2**: Open the voting page (`/market/[market-id]`)

### Step 2: Check Connection Status
On the live page, look for the status badge in the top-right:
- 🟢 **LIVE** = Real-time working perfectly
- 🟡 **CONNECTING** = Trying to establish connection
- 🔄 **POLLING** = Real-time failed, using 3-second polling
- 🔴 **ERROR** = Connection failed

### Step 3: Test Updates
1. On the voting page, cast a vote
2. Watch the live page - it should update within 3 seconds (or instantly if real-time works)
3. Check browser console for debug messages

## Expected Console Messages

### If Real-time Works:
```
🔴 Setting up live monitoring for market: [market-id]
📡 Subscription status: SUBSCRIBED
✅ Successfully connected to real-time updates
🟢 Live vote update received: [vote data]
```

### If Using Polling Fallback:
```
🔴 Setting up live monitoring for market: [market-id]
📡 Subscription status: CHANNEL_ERROR (or TIMED_OUT)
🔄 Real-time failed, starting polling fallback...
🔄 Polling for updates...
```

## Troubleshooting

### If Updates Don't Work At All:
1. Check browser console for errors
2. Try the "Refresh Data" button
3. Try the "Retry Connection" button
4. Refresh the page

### If Only Polling Works (no real-time):
1. Go to Supabase Dashboard: https://vbtbwwwahcwuqksvqqen.supabase.co
2. Navigate to **Database** → **Replication**
3. Enable Realtime for the `votes` table
4. Refresh the live page

### If Nothing Works:
1. Check your internet connection
2. Verify Supabase project is active
3. Check if API keys are correct in `.env` file

## What You Should See

- **Live Page**: Status badge, vote counts, individual votes
- **Console**: Debug messages with emojis
- **Updates**: Either instant (real-time) or within 3 seconds (polling)

The system now has a **polling fallback**, so even if real-time doesn't work, you'll still get updates every 3 seconds automatically!
