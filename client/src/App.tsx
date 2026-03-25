import { useCallback, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  type Edge,
  type Node,
  type NodeProps,
} from 'reactflow'

type PromptNodeData = {
  prompt: string
  disabled: boolean
  onChange: (value: string) => void
}

type ResultNodeData = {
  response: string
  status: 'idle' | 'loading' | 'done' | 'error'
  error: string
}

function PromptNode({ data }: NodeProps<PromptNodeData>) {
  return (
    <div className="flow-node flow-node-prompt">
      <div className="node-header">
        <span className="node-kicker">Input</span>
        <strong>Prompt Node</strong>
      </div>
      <textarea
        className="node-textarea"
        value={data.prompt}
        disabled={data.disabled}
        onChange={(e) => data.onChange(e.target.value)}
        placeholder="Type a prompt for the model..."
      />
      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  )
}

function ResultNode({ data }: NodeProps<ResultNodeData>) {
  const content =
    data.status === 'loading'
      ? 'Generating response...'
      : data.status === 'error'
        ? data.error
        : data.response || 'The AI response will appear here.'

  return (
    <div className="flow-node flow-node-result">
      <Handle type="target" position={Position.Left} className="node-handle" />
      <div className="node-header">
        <span className="node-kicker">Output</span>
        <strong>Result Node</strong>
      </div>
      <div className={`result-box result-${data.status}`}>{content}</div>
    </div>
  )
}

const nodeTypes = { promptNode: PromptNode, resultNode: ResultNode }

const edges: Edge[] = [
  {
    id: 'prompt-to-result',
    source: 'prompt-node',
    target: 'result-node',
    animated: true,
    style: { stroke: '#b24c2f', strokeWidth: 2 },
  },
]

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export default function App() {
  const [prompt, setPrompt] = useState('What is the capital of France?')
  const [response, setResponse] = useState('')
  const [model, setModel] = useState('')
  const [status, setStatus] = useState<ResultNodeData['status']>('idle')
  const [error, setError] = useState('')
  const [savedRunId, setSavedRunId] = useState('')
  const [saving, setSaving] = useState(false)

  const runFlow = useCallback(async () => {
    const trimmed = prompt.trim()
    if (!trimmed) {
      setStatus('error')
      setError('Enter a prompt before running the flow.')
      return
    }

    setStatus('loading')
    setError('')
    setSavedRunId('')

    try {
      const res = await fetch(`${API_BASE}/api/ask-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed }),
      })

      const data = await res.json()

      if (!res.ok || !data.output) {
        throw new Error(data.error ?? 'The backend returned an unexpected error.')
      }

      setResponse(data.output)
      setModel(data.model ?? '')
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to run the flow.')
      setStatus('error')
    }
  }, [prompt])

  const saveResult = useCallback(async () => {
    if (!response) return
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), response, model }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save.')
      setSavedRunId(data.savedRunId)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }, [prompt, response, model])

  const nodes: Node[] = [
    {
      id: 'prompt-node',
      type: 'promptNode',
      position: { x: 80, y: 140 },
      draggable: false,
      data: { prompt, disabled: status === 'loading', onChange: setPrompt } satisfies PromptNodeData,
    },
    {
      id: 'result-node',
      type: 'resultNode',
      position: { x: 540, y: 140 },
      draggable: false,
      data: { response, status, error } satisfies ResultNodeData,
    },
  ]

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">OpenRouter + React Flow</p>
        <h1>Prompt-to-response flow</h1>
        <p className="hero-copy">
          Type a prompt in the left node, run the flow, and save the exchange to MongoDB.
        </p>
        <div className="toolbar">
          <div className="toolbar-buttons">
            <button className="run-button" type="button" onClick={runFlow} disabled={status === 'loading'}>
              {status === 'loading' ? 'Running...' : 'Run Flow'}
            </button>
            <button
              className="save-button"
              type="button"
              onClick={saveResult}
              disabled={status !== 'done' || saving || !!savedRunId}
            >
              {saving ? 'Saving...' : savedRunId ? 'Saved ✓' : 'Save'}
            </button>
          </div>
          <div className="meta">
            <span>Status: {status}</span>
            {savedRunId ? <span>Run ID: {savedRunId}</span> : null}
          </div>
        </div>
      </section>

      <section className="canvas-panel">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#d9c7bb" gap={20} />
          <MiniMap pannable zoomable />
          <Controls />
        </ReactFlow>
      </section>
    </main>
  )
}
