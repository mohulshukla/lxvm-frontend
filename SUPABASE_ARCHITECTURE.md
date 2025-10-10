# Supabase Architecture & Implementation Guide

## Overview

This prediction market platform uses Supabase as the backend database and real-time system. Here's how everything works together.

## 🗄️ Database Schema

### Tables

#### 1. `users` Table
```sql
CREATE TABLE users (
  wallet_address TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_vote_at TIMESTAMP WITH TIME ZONE
);
```
- **Purpose**: Store wallet addresses of users
- **Primary Key**: `wallet_address` (unique wallet identifier)
- **Auto-populated**: When users create markets or vote

#### 2. `prediction_markets` Table
```sql
CREATE TABLE prediction_markets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT NOT NULL REFERENCES users(wallet_address),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'resolved')),
  resolution_threshold DECIMAL DEFAULT 0.1,
  shareable_id TEXT UNIQUE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE
);
```
- **Purpose**: Store prediction market data
- **Key Features**:
  - Unique shareable IDs for public links
  - Resolution thresholds for auto-resolution
  - Status tracking (active/ended/resolved)
  - Creator wallet address reference

#### 3. `votes` Table
```sql
CREATE TABLE votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  market_id UUID NOT NULL REFERENCES prediction_markets(id) ON DELETE CASCADE,
  voter_address TEXT NOT NULL REFERENCES users(wallet_address),
  prediction DECIMAL NOT NULL CHECK (prediction >= 0 AND prediction <= 1),
  vote_type TEXT NOT NULL CHECK (vote_type IN ('yes', 'no')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  evidence TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(market_id, voter_address)
);
```
- **Purpose**: Store individual votes with confidence levels
- **Key Features**:
  - Confidence levels (0-1 scale)
  - Yes/No vote types
  - Optional evidence/reasoning
  - One vote per user per market
  - Auto-updating timestamps

## 🔧 Database Functions

### 1. `generate_shareable_id()`
```sql
CREATE OR REPLACE FUNCTION generate_shareable_id()
RETURNS TEXT AS $$
BEGIN
    RETURN replace(replace(encode(gen_random_bytes(8), 'base64'), '+', '-'), '/', '_');
END;
$$ LANGUAGE plpgsql;
```
- **Purpose**: Generate URL-safe unique IDs for markets
- **Output**: Base64-encoded strings like `y6SfsYGXXPU=`

### 2. `create_prediction_market()`
```sql
CREATE OR REPLACE FUNCTION create_prediction_market(
    market_title TEXT,
    market_description TEXT,
    creator_address TEXT,
    threshold DECIMAL DEFAULT 0.1
)
RETURNS UUID AS $$
DECLARE
    new_market_id UUID;
    new_shareable_id TEXT;
BEGIN
    -- Generate unique shareable ID
    LOOP
        new_shareable_id := generate_shareable_id();
        EXIT WHEN NOT EXISTS (SELECT 1 FROM prediction_markets WHERE shareable_id = new_shareable_id);
    END LOOP;
    
    -- Insert the new market
    INSERT INTO prediction_markets (title, description, created_by, resolution_threshold, shareable_id)
    VALUES (market_title, market_description, creator_address, threshold, new_shareable_id)
    RETURNING id INTO new_market_id;
    
    RETURN new_market_id;
END;
$$ LANGUAGE plpgsql;
```
- **Purpose**: Create new markets with unique shareable IDs
- **Returns**: Market UUID for further operations

### 3. `cast_vote()`
```sql
CREATE OR REPLACE FUNCTION cast_vote(
    market_uuid UUID,
    voter_addr TEXT,
    vote_prediction DECIMAL,
    vote_type_val TEXT,
    vote_evidence TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    vote_id UUID;
BEGIN
    -- Insert or update the vote
    INSERT INTO votes (market_id, voter_address, prediction, vote_type, evidence)
    VALUES (market_uuid, voter_addr, vote_prediction, vote_type_val, vote_evidence)
    ON CONFLICT (market_id, voter_address)
    DO UPDATE SET
        prediction = vote_prediction,
        vote_type = vote_type_val,
        evidence = vote_evidence,
        updated_at = NOW()
    RETURNING id INTO vote_id;
    
    -- Update user's last vote time
    UPDATE users SET last_vote_at = NOW() WHERE wallet_address = voter_addr;
    
    RETURN vote_id;
END;
$$ LANGUAGE plpgsql;
```
- **Purpose**: Handle vote submission with upsert logic
- **Features**: Updates existing votes, tracks user activity

### 4. `get_market_stats()`
```sql
CREATE OR REPLACE FUNCTION get_market_stats(market_uuid UUID)
RETURNS TABLE (
    total_votes BIGINT,
    yes_votes BIGINT,
    no_votes BIGINT,
    weighted_yes DECIMAL,
    weighted_no DECIMAL,
    average_confidence DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_votes,
        COUNT(*) FILTER (WHERE v.vote_type = 'yes') as yes_votes,
        COUNT(*) FILTER (WHERE v.vote_type = 'no') as no_votes,
        COALESCE(SUM(v.prediction) FILTER (WHERE v.vote_type = 'yes'), 0) as weighted_yes,
        COALESCE(SUM(v.prediction) FILTER (WHERE v.vote_type = 'no'), 0) as weighted_no,
        COALESCE(AVG(v.prediction), 0) as average_confidence
    FROM votes v
    WHERE v.market_id = market_uuid;
END;
$$ LANGUAGE plpgsql;
```
- **Purpose**: Calculate real-time market statistics
- **Returns**: Vote counts, weighted sums, confidence averages

## 🔐 Row Level Security (RLS)

### Policies

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Read access for all users
CREATE POLICY "Allow read access to users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow read access to prediction_markets" ON prediction_markets FOR SELECT USING (true);
CREATE POLICY "Allow read access to votes" ON votes FOR SELECT USING (true);

-- Insert access for all users
CREATE POLICY "Allow insert own user" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert prediction_markets" ON prediction_markets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert own votes" ON votes FOR INSERT WITH CHECK (true);

-- Update access for market creators
CREATE POLICY "Allow market creators to update" ON prediction_markets FOR UPDATE 
USING (created_by = auth.jwt() ->> 'wallet_address');
```

### Security Model
- **Public Read**: Anyone can view markets, votes, and users
- **Public Write**: Anyone can create markets and vote
- **Restricted Update**: Only market creators can modify their markets

## ⚡ Real-time Features

### Supabase Realtime Subscriptions

#### Market Voting Page
```typescript
const channel = supabase
  .channel(`market-${market.id}`)
  .on('postgres_changes', 
    { 
      event: '*', 
      schema: 'public', 
      table: 'votes',
      filter: `market_id=eq.${market.id}`
    }, 
    (payload) => {
      // Refresh market stats when votes change
      fetchMarketStats()
      // Refresh user vote if it's the current user
      if (address && payload.new?.voter_address === address) {
        fetchUserVote()
      }
    }
  )
  .subscribe()
```

#### Admin Dashboard
```typescript
const channel = supabase
  .channel(`admin-market-${marketId}`)
  .on('postgres_changes', 
    { 
      event: '*', 
      schema: 'public', 
      table: 'votes',
      filter: `market_id=eq.${marketId}`
    }, 
    (payload) => {
      fetchMarketStats(marketId)
    }
  )
  .subscribe()
```

### Real-time Updates
- **Vote Statistics**: Update instantly when new votes are cast
- **User Votes**: Refresh when users change their votes
- **Admin Dashboard**: Live monitoring of market activity

## 🔗 Frontend Integration

### Supabase Client Setup
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### TypeScript Types
```typescript
export interface PredictionMarket {
  id: string
  title: string
  description: string
  created_at: string
  created_by: string
  status: 'active' | 'ended' | 'resolved'
  resolution_threshold: number
  shareable_id: string
}

export interface Vote {
  id: string
  market_id: string
  voter_address: string
  prediction: number // 0-1 confidence level
  vote_type: 'yes' | 'no'
  created_at: string
  evidence?: string
}

export interface User {
  wallet_address: string
  created_at: string
  last_vote_at?: string
}
```

## 🚀 Application Flow

### 1. Market Creation (Admin)
```typescript
// 1. Ensure user exists
await supabase.from('users').upsert({ wallet_address: address })

// 2. Create market using database function
const { data } = await supabase.rpc('create_prediction_market', {
  market_title: title,
  market_description: description,
  creator_address: address,
  threshold: threshold
})

// 3. Fetch created market details
const { data: marketData } = await supabase
  .from('prediction_markets')
  .select('*')
  .eq('id', data)
  .single()
```

### 2. Market Access (Public)
```typescript
// 1. Decode URL parameter
const decodedMarketId = decodeURIComponent(marketId)

// 2. Fetch market by shareable ID
const { data, error } = await supabase
  .from('prediction_markets')
  .select('*')
  .eq('shareable_id', decodedMarketId)
  .single()

// 3. Get market statistics
const { data: stats } = await supabase.rpc('get_market_stats', {
  market_uuid: market.id
})
```

### 3. Voting Process
```typescript
// 1. Ensure user exists
await supabase.from('users').upsert({ wallet_address: address })

// 2. Cast vote using database function
const { error } = await supabase.rpc('cast_vote', {
  market_uuid: market.id,
  voter_addr: address,
  vote_prediction: prediction,
  vote_type_val: voteType,
  vote_evidence: evidence || null
})

// 3. Real-time updates trigger automatically
```

## 🛠️ Environment Configuration

### Required Environment Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# WalletConnect (optional)
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your-project-id
```

### Setup Process
1. Create Supabase project
2. Run `supabase-schema.sql` in SQL Editor
3. Copy API keys to environment variables
4. Deploy to production with environment variables

## 🔧 Common Issues & Solutions

### URL Encoding Issues
- **Problem**: Double-encoded shareable IDs in URLs
- **Solution**: Use `decodeURIComponent()` in frontend
- **Example**: `y6SfsYGXXPU%253D` → `y6SfsYGXXPU=`

### RLS Policy Errors
- **Problem**: "Row violates row-level security policy"
- **Solution**: Ensure INSERT policies exist for all tables
- **Fix**: Add missing policies for `prediction_markets`

### Real-time Connection Issues
- **Problem**: "Connection interrupted while trying to subscribe"
- **Solution**: Check Supabase project status and API keys
- **Debug**: Monitor browser console for specific errors

### Database Function Errors
- **Problem**: "Unrecognized encoding: base64url"
- **Solution**: Use standard base64 encoding with character replacement
- **Fix**: Update `generate_shareable_id()` function

## 📊 Performance Optimizations

### Database Indexes
```sql
CREATE INDEX idx_prediction_markets_shareable_id ON prediction_markets(shareable_id);
CREATE INDEX idx_prediction_markets_status ON prediction_markets(status);
CREATE INDEX idx_votes_market_id ON votes(market_id);
CREATE INDEX idx_votes_voter_address ON votes(voter_address);
```

### Real-time Efficiency
- **Channel Names**: Use unique identifiers (`market-${marketId}`)
- **Cleanup**: Properly remove channels on component unmount
- **Filtering**: Use specific filters to reduce unnecessary updates

## 🎯 Key Benefits

1. **Real-time Updates**: Instant vote count updates across all clients
2. **Scalable**: PostgreSQL handles large numbers of markets and votes
3. **Secure**: Row Level Security prevents unauthorized access
4. **Type-safe**: Full TypeScript integration with generated types
5. **Serverless**: No backend server required - direct database access
6. **URL-friendly**: Shareable links work across different devices/browsers

This architecture provides a robust, scalable foundation for the prediction market platform with real-time capabilities and strong security.
