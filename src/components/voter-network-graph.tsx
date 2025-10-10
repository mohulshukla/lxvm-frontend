'use client'

import { useEffect, useMemo } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ConnectionLineType,
} from 'reactflow'
import dagre from 'dagre'
import 'reactflow/dist/style.css'
import { Vote } from '@/lib/supabase'

interface VoterNetworkGraphProps {
  votes: Array<Vote & { user?: { wallet_address: string } }>
}

// Auto-layout using dagre
const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({ 
    rankdir: 'TB',
    nodesep: 100,
    ranksep: 100,
    marginx: 50,
    marginy: 50
  })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 70, height: 70 })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 35,
        y: nodeWithPosition.y - 35,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

// Get node color based on vote type and confidence
const getNodeColor = (vote: Vote) => {
  if (vote.vote_type === 'yes') {
    // Green with opacity based on confidence
    return `rgba(34, 197, 94, ${vote.prediction})`
  } else {
    // Red with opacity based on inverted confidence
    // For NO votes, higher prediction = more certain NO = brighter red
    return `rgba(239, 68, 68, ${1 - vote.prediction})`
  }
}

// Determine if two votes should be connected
const shouldConnect = (vote1: Vote, vote2: Vote): boolean => {
  const pred1 = vote1.prediction
  const pred2 = vote2.prediction

  // Strong Yes cluster (>0.7)
  if (pred1 > 0.7 && pred2 > 0.7) return true

  // Strong No cluster (<0.3)
  if (pred1 < 0.3 && pred2 < 0.3) return true

  // Moderate voters (0.3-0.7) connect to everyone (bridge nodes)
  if ((pred1 >= 0.3 && pred1 <= 0.7) || (pred2 >= 0.3 && pred2 <= 0.7)) {
    return true
  }

  return false
}

export function VoterNetworkGraph({ votes }: VoterNetworkGraphProps) {
  // Create nodes from votes
  const initialNodes: Node[] = useMemo(() => {
    return votes.map((vote, index) => ({
      id: vote.id,
      type: 'default',
      data: {
        label: (
          <div style={{ textAlign: 'center', lineHeight: '1.2' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>
              Voter {index + 1}
            </div>
            <div style={{ fontSize: '10px' }}>
              {(vote.prediction * 100).toFixed(0)}%
            </div>
          </div>
        ),
      },
      position: { x: 0, y: 0 },
      style: {
        background: getNodeColor(vote),
        border: '2px solid #fff',
        borderRadius: '50%',
        width: 70,
        height: 70,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        fontWeight: 'bold',
        color: '#fff',
        padding: '5px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      },
    }))
  }, [votes])

  // Create edges based on clustering logic
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = []

    for (let i = 0; i < votes.length; i++) {
      for (let j = i + 1; j < votes.length; j++) {
        if (shouldConnect(votes[i], votes[j])) {
          edges.push({
            id: `e-${votes[i].id}-${votes[j].id}`,
            source: votes[i].id,
            target: votes[j].id,
            type: 'straight',
            style: {
              stroke: '#888',
              strokeWidth: 1,
              opacity: 0.3,
            },
            animated: false,
          })
        }
      }
    }

    return edges
  }, [votes])

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Apply layout when votes change
  useEffect(() => {
    if (initialNodes.length > 0) {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        initialNodes,
        initialEdges
      )
      setNodes(layoutedNodes)
      setEdges(layoutedEdges)
    } else {
      setNodes([])
      setEdges([])
    }
  }, [initialNodes, initialEdges, setNodes, setEdges])

  if (votes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p>No votes yet. Graph will appear as votes are cast.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        connectionLineType={ConnectionLineType.Straight}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'straight',
          animated: false,
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#aaa" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  )
}

