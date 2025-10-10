# Voter Network Graph - User Guide

## Overview
The live page now includes an interactive network graph that visualizes all voters and their relationships in real-time.

## How to Use

### Viewing the Graph
1. Navigate to any market's live page: `/market/[market-id]/live`
2. The network graph appears above the consensus visualization section
3. Each circle (node) represents one voter

### Understanding the Visualization

#### Node Colors & Opacity
- **Bright Green** = Strong Yes vote (>70% confidence)
- **Dim Green** = Weak Yes vote (50-70% confidence)
- **Semi-transparent** = Moderate vote (30-70% confidence) - these are "bridge" voters
- **Dim Red** = Weak No vote (30-50% confidence)
- **Bright Red** = Strong No vote (<30% confidence)

#### Node Labels
Each node shows:
- Voter number (e.g., "Voter 3")
- Confidence percentage (e.g., "75%")

#### Connection Lines (Edges)
Lines between nodes show relationships:
- **Strong Yes voters** connect to each other (forming a cluster)
- **Strong No voters** connect to each other (forming a cluster)
- **Moderate voters** (30-70% confidence) connect to EVERYONE - they bridge the two camps
- This creates a connected graph that never has isolated nodes

### Interactive Features

#### Zoom & Pan
- **Zoom In/Out**: Use the +/- buttons in bottom-left OR scroll wheel
- **Pan**: Click and drag the background
- **Reset View**: Click the fit-view button (square icon) to recenter

#### Node Interaction
- **Hover**: Shows node details
- **Drag**: Click and drag individual nodes to reposition them
- **The graph auto-layouts** when new votes are added

### Real-time Updates
The graph automatically updates when:
- New votes are submitted (either via real-time or 3-second polling)
- Existing votes are updated
- The graph smoothly animates node additions

### Visual Patterns to Look For

#### Polarized Market
- Two distinct clusters (bright green and bright red)
- Few or no moderate voters
- Minimal connections between clusters

#### Consensus Building
- Many nodes of the same color
- Dense clustering on one side
- Few dissenting votes

#### Mixed/Uncertain Market
- Many semi-transparent nodes in the middle
- Heavy interconnection between all nodes
- No clear clustering

#### Bridge Voters
- Moderate voters (30-70%) appear as bridge nodes
- They connect to both Yes and No clusters
- Help maintain graph connectivity

## Technical Details

### Graph Layout
- Uses **Dagre** algorithm for automatic node positioning
- Nodes arranged to minimize edge crossings
- Optimizes for visual clarity

### Performance
- Handles up to 100+ voters smoothly
- Optimized edge calculation
- Smooth animations for new nodes

### Legend
At the bottom of the graph card:
- Strong Yes (>70%) - Bright green circle
- Weak Yes - Dim green circle
- Moderate (Bridge) - Semi-transparent circle
- Strong No (<30%) - Bright red circle

## Testing the Graph

### Quick Test
1. Open live page in one browser window
2. Open voting page in another window
3. Cast different types of votes:
   - Vote YES with 100% confidence → Bright green node
   - Vote YES with 60% confidence → Moderate green node (bridges)
   - Vote NO with 20% confidence → Bright red node
   - Vote NO with 50% confidence → Moderate node (bridges)
4. Watch the graph update in real-time

### Expected Behavior
- New nodes appear smoothly
- Graph re-layouts automatically
- Connections update based on clustering rules
- Colors and opacity match vote confidence

## Troubleshooting

### Graph Not Showing
- Check that there are votes in the market
- Look for "No votes yet" message
- Verify browser console for errors

### Graph Not Updating
- Check the connection status indicator at top
- Should show "LIVE" (green) or "POLLING" (blue)
- If polling, updates every 3 seconds

### Layout Issues
- Click the fit-view button (square icon) to reset
- Zoom out to see all nodes
- Try refreshing the page

## Use Cases

### For Market Creators
- Monitor voter participation in real-time
- See voting patterns emerge
- Identify consensus or polarization
- Spot bridge voters who might be uncertain

### For Participants
- See how your vote relates to others
- Understand the voting landscape
- Visualize consensus strength
- Track vote distribution

## Future Enhancements (Possible)
- Hover tooltips showing voter wallet address
- Filter by vote type (show only Yes or No)
- Different layout algorithms
- Export graph as image
- Highlight your own vote

The network graph provides an intuitive, visual way to understand the collective intelligence and consensus forming in the prediction market!
