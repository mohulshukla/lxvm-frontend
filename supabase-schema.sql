-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  wallet_address TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_vote_at TIMESTAMP WITH TIME ZONE
);

-- Create prediction_markets table
CREATE TABLE IF NOT EXISTS prediction_markets (
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

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  market_id UUID NOT NULL REFERENCES prediction_markets(id) ON DELETE CASCADE,
  voter_address TEXT NOT NULL REFERENCES users(wallet_address),
  prediction DECIMAL NOT NULL CHECK (prediction >= 0 AND prediction <= 1),
  vote_type TEXT NOT NULL CHECK (vote_type IN ('yes', 'no')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  evidence TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(market_id, voter_address) -- One vote per user per market
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prediction_markets_shareable_id ON prediction_markets(shareable_id);
CREATE INDEX IF NOT EXISTS idx_prediction_markets_status ON prediction_markets(status);
CREATE INDEX IF NOT EXISTS idx_votes_market_id ON votes(market_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter_address ON votes(voter_address);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on votes
CREATE TRIGGER update_votes_updated_at 
    BEFORE UPDATE ON votes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to generate shareable ID
CREATE OR REPLACE FUNCTION generate_shareable_id()
RETURNS TEXT AS $$
BEGIN
    RETURN replace(replace(encode(gen_random_bytes(8), 'base64'), '+', '-'), '/', '_');
END;
$$ LANGUAGE plpgsql;

-- Function to create a new prediction market
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

-- Function to cast a vote
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
    calculated_vote_type TEXT;
BEGIN
    -- Validate that prediction is not exactly 0.5
    IF vote_prediction = 0.5 THEN
        RAISE EXCEPTION 'Cannot vote at exactly 50%% confidence. Please choose a side.';
    END IF;
    
    -- Calculate the correct vote type based on prediction
    IF vote_prediction > 0.5 THEN
        calculated_vote_type := 'yes';
    ELSE
        calculated_vote_type := 'no';
    END IF;
    
    -- Ensure vote_type matches the prediction
    IF vote_type_val != calculated_vote_type THEN
        RAISE EXCEPTION 'Vote type does not match prediction. Prediction %.1f%% should be %s vote.', 
            vote_prediction * 100, calculated_vote_type;
    END IF;
    
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

-- Function to get market statistics
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

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can read all data
CREATE POLICY "Allow read access to users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow read access to prediction_markets" ON prediction_markets FOR SELECT USING (true);
CREATE POLICY "Allow read access to votes" ON votes FOR SELECT USING (true);

-- Users can insert their own data
CREATE POLICY "Allow insert own user" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert prediction_markets" ON prediction_markets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert own votes" ON votes FOR INSERT WITH CHECK (true);

-- Market creators can update their markets
CREATE POLICY "Allow market creators to update" ON prediction_markets FOR UPDATE 
USING (created_by = auth.jwt() ->> 'wallet_address');
