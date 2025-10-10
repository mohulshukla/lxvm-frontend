# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and create an account
2. Click "New Project"
3. Fill in the project details:
   - **Organization**: Choose or create an organization
   - **Name**: `prediction-market` (or any name you prefer)
   - **Database Password**: Set a strong password (save this!)
   - **Region**: Choose a region close to you
4. Click "Create new project"
5. Wait 2-3 minutes for the project to be ready

## Step 2: Get Your API Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these three values:

### Project URL
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
```
*This looks like: `https://abcdefghijklmnop.supabase.co`*

### Anon Key
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
*This is the "anon public" key - it's safe to use in frontend code*

### Service Role Key
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
*This is the "service_role" key - KEEP THIS SECRET!*

## Step 3: Create Environment File

Create a `.env.local` file in your project root with:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# WalletConnect Project ID (optional)
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your-project-id-here
```

## Step 4: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase-schema.sql` from your project
4. Paste it into the SQL Editor
5. Click **"Run"** to execute the SQL
6. You should see "Success. No rows returned" message

This creates:
- `users` table for wallet addresses
- `prediction_markets` table for market data
- `votes` table for voting data
- Database functions for creating markets and casting votes
- Indexes for better performance
- Row Level Security policies

## Step 5: Test Your Setup

1. Run your development server:
   ```bash
   npm run dev
   ```

2. Go to [http://localhost:3000/admin](http://localhost:3000/admin)

3. Connect your wallet and try creating a market

4. Check your Supabase dashboard → **Table Editor** to see if data was created

## Step 6: Deploy to Vercel (Production)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. In Vercel dashboard, go to **Settings** → **Environment Variables**
4. Add all your environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` (optional)
5. Deploy your application

## Troubleshooting

### "Invalid API key" error
- Double-check your environment variables
- Make sure there are no extra spaces or quotes
- Restart your development server after changing `.env.local`

### "Relation does not exist" error
- Make sure you ran the SQL schema in Supabase
- Check that all tables were created in the Table Editor

### Wallet connection issues
- Make sure you have MetaMask installed
- Try refreshing the page
- Check browser console for errors

### Can't create markets
- Verify your Supabase service role key is correct
- Check that the database functions were created
- Look at the browser network tab for API errors

## Security Notes

- **Never commit `.env.local` to version control**
- The anon key is safe for frontend use
- The service role key should only be used server-side
- Supabase handles authentication and authorization automatically

## Next Steps

Once your Supabase setup is working:
1. Create your first prediction market
2. Test the shareable link functionality
3. Try voting on a market
4. Check real-time statistics updates
