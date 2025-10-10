# Enable Supabase Realtime

## Step-by-Step Instructions

To enable real-time updates on your live page, you need to enable Realtime for the `votes` table in your Supabase dashboard:

### 1. Access Supabase Dashboard
1. Go to: https://vbtbwwwahcwuqksvqqen.supabase.co
2. Sign in to your Supabase account

### 2. Navigate to Replication Settings
1. In the left sidebar, click **Database**
2. Click **Replication** (under Database section)

### 3. Enable Realtime for Votes Table
1. Find the `votes` table in the list
2. Toggle the switch to **ON** for the `votes` table
3. Optionally, also enable for `prediction_markets` table (for future features)

### 4. Verify Setup
1. Save the changes
2. Go back to your live page
3. Check the browser console for connection status messages
4. The connection status should show "LIVE" with a green indicator

## What to Look For

After enabling Realtime, you should see:
- ✅ Green "LIVE" badge in the top-right of the live page
- 📡 Console messages showing "Successfully connected to real-time updates"
- 🔄 Real-time updates when votes are cast (without page refresh)

## Testing Real-time Updates

1. Open the live page in one browser window/tab
2. Open the voting page in another window/tab
3. Cast a vote on the voting page
4. Watch the live page update automatically without refreshing

## Troubleshooting

If real-time updates still don't work:
1. Check browser console for error messages
2. Verify your Supabase project is active
3. Make sure you're using the correct API keys
4. Try refreshing the live page after enabling Realtime

## Console Messages to Expect

When working correctly, you should see:
```
🔴 Setting up live monitoring for market: [market-id]
📡 Subscription status: SUBSCRIBED
✅ Successfully connected to real-time updates
🟢 Live vote update received: [vote data]
```
