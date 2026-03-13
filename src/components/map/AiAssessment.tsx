// AiAssessment.tsx
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { ExplainInput } from '#/lib/ai-explain'

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

type Status = 'idle' | 'loading' | 'streaming' | 'done' | 'error'

interface Props {
  explainInput: ExplainInput
  onTextReady?: (text: string) => void
  regenKey?: number
}

export function AiAssessment({ explainInput, onTextReady, regenKey = 0 }: Props) {
  const [status, setStatus]           = useState<Status>('idle')
  const [completion, setCompletion]   = useState('')
  const [error, setError]             = useState<string | null>(null)
  const [expanded, setExpanded]       = useState(true)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const runCompletion = async (force = false) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    // Reset everything in one go before the async work starts
    setStatus('loading')
    setCompletion('')
    setGeneratedAt(null)
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/api/v1/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...explainInput, force }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) throw new Error(`API error ${res.status}`)
      if (!res.body) throw new Error('No response body')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText  = ''
      let firstChunk = true

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const lines = decoder.decode(value, { stream: true }).split('\n')
        for (const line of lines) {
          if (!line.startsWith('0:')) continue
          try {
            const chunk = JSON.parse(line.slice(2)) as string
            if (chunk) {
              if (firstChunk) {
                setStatus('streaming')  // ← skeleton hides, text appears
                firstChunk = false
              }
              fullText += chunk
              setCompletion(prev => prev + chunk)
            }
          } catch { /* skip malformed */ }
        }
      }

      setStatus('done')
      setGeneratedAt(new Date().toISOString())
      onTextReady?.(fullText)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to generate assessment.')
    }
  }

  useEffect(() => {
    runCompletion()
    return () => abortRef.current?.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explainInput.pcode, explainInput.hazard, explainInput.severity, explainInput.simActive])

  useEffect(() => {
    if (regenKey === 0) return
    runCompletion(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regenKey])

  return (
    <div className="panel-ai-section">
      <div className="panel-ai-header">
        <div>
          <p className="panel-section-label" style={{ margin: 0 }}>AI ASSESSMENT</p>
          {generatedAt && status === 'done' && (
            <p className="panel-ai-timestamp">
              Generated{' '}
              {new Date(generatedAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </p>
          )}
        </div>
        <div className="panel-ai-header-actions">
          {completion && status !== 'loading' && (
            <>
              <button type="button" className="panel-ai-icon-btn" onClick={() => setExpanded(v => !v)} title={expanded ? 'Collapse' : 'Expand'}>
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Skeleton — only while status is 'loading', i.e. before first chunk */}
      {status === 'loading' && (
        <div className="panel-ai-skeleton">
          <div className="panel-ai-skeleton-line" style={{ width: '92%' }} />
          <div className="panel-ai-skeleton-line" style={{ width: '85%' }} />
          <div className="panel-ai-skeleton-line" style={{ width: '88%' }} />
          <div className="panel-ai-skeleton-line" style={{ width: '40%' }} />
          <div className="panel-ai-skeleton-gap" />
          <div className="panel-ai-skeleton-line" style={{ width: '90%' }} />
          <div className="panel-ai-skeleton-line" style={{ width: '82%' }} />
          <div className="panel-ai-skeleton-line" style={{ width: '55%' }} />
        </div>
      )}

      {status === 'error' && (
        <div className="panel-ai-error">
          <p>{error}</p>
        </div>
      )}

      {completion && expanded && (
        <div className="panel-ai-body">
          {completion
            .split(/\n{2,}/)
            .filter(Boolean)
            .map((para, i) => (
              <p key={i} className="panel-ai-paragraph">
                {para.replace(/\n/g, ' ').trim()}
              </p>
            ))}
        </div>
      )}
    </div>
  )
}