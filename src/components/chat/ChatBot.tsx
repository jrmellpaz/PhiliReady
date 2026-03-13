// LeftPanelAssistant.tsx
// Standalone AI assistant card — drop it anywhere as a sibling of SimulateContent.
// Uses the same /api/v1/chat backend + `0:` stream format as ChatBot.tsx.
// On desktop it lives in .map-panel-left; on mobile it's its own sheet page.

import { useEffect, useRef, useState, useCallback } from 'react'
import { Bot, Send, Trash2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AssistantContext {
  simActive?: boolean
  hazard?: string      // 'typhoon' | 'flood' | 'earthquake' | 'volcanic'
  severity?: number    // 1–4
  selectedCity?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

interface Props {
  context?: AssistantContext
  /** Start collapsed. Useful when panel space is tight. */
  defaultCollapsed?: boolean
}

// ─── Constants ───────────────────────────────────────────────────────────────

const HAZARD_LABELS: Record<string, string> = {
  typhoon:    'Typhoon',
  flood:      'Flood',
  earthquake: 'Earthquake',
  volcanic:   'Volcanic Eruption',
}

const SEVERITY_LABELS: Record<number, string> = {
  1: 'Minor', 2: 'Moderate', 3: 'Major', 4: 'Catastrophic',
}

const STARTERS = [
  'How is demand calculated?',
  'What does severity 3 mean?',
  'Explain SPHERE standards',
  'Which cities are highest risk?',
]

// ─── Rendering helpers ────────────────────────────────────────────────────────

/** Renders streamed text with basic paragraph + list support. */
function renderContent(text: string) {
  return text
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((block, i) => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
      const isNumbered = lines.every(l => /^\d+[.):\-]\s/.test(l))
      const isBullet   = lines.every(l => /^[*\-•]\s/.test(l))

      if (isNumbered) return (
        <ol key={i} className="lpa-ol">
          {lines.map((l, j) => (
            <li key={j} className="lpa-li">{l.replace(/^\d+[.):\-]\s*/, '')}</li>
          ))}
        </ol>
      )

      if (isBullet) return (
        <ul key={i} className="lpa-ul">
          {lines.map((l, j) => (
            <li key={j} className="lpa-li">
              <span className="lpa-bullet">•</span>
              {l.replace(/^[*\-•]\s*/, '')}
            </li>
          ))}
        </ul>
      )

      return <p key={i} className="lpa-para">{lines.join(' ')}</p>
    })
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ChatBot({ context, defaultCollapsed = false }: Props) {
  const [messages, setMessages]     = useState<Message[]>([])
  const [input, setInput]           = useState('')
  const [streaming, setStreaming]   = useState(false)
  const [collapsed, setCollapsed]   = useState(defaultCollapsed)
  const [error, setError]           = useState<string | null>(null)

  const abortRef       = useRef<AbortController | null>(null)
  const bottomRef      = useRef<HTMLDivElement>(null)
  const textareaRef    = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!collapsed) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, collapsed])

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || streaming) return

    setError(null)

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: trimmed }
    const asstId           = crypto.randomUUID()
    const asstMsg: Message = { id: asstId, role: 'assistant', content: '', streaming: true }

    setMessages(prev => [...prev, userMsg, asstMsg])
    setInput('')
    setStreaming(true)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    // Build history for API (all confirmed messages + new user msg)
    const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    try {
      const res = await fetch(`${API_BASE}/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
        signal: abortRef.current.signal,
      })

      if (!res.ok)    throw new Error(`Server error ${res.status}`)
      if (!res.body)  throw new Error('No response body')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('0:')) continue
          try {
            const chunk = JSON.parse(line.slice(2)) as string
            if (chunk) {
              setMessages(prev =>
                prev.map(m =>
                  m.id === asstId ? { ...m, content: m.content + chunk } : m
                )
              )
            }
          } catch { /* skip malformed */ }
        }
      }

      setMessages(prev =>
        prev.map(m => m.id === asstId ? { ...m, streaming: false } : m)
      )
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setMessages(prev => prev.filter(m => m.id !== asstId))
    } finally {
      setStreaming(false)
    }
  }, [messages, streaming])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 88)}px`
  }

  const clear = () => {
    abortRef.current?.abort()
    setMessages([])
    setError(null)
    setStreaming(false)
  }

  const hasMessages = messages.length > 0
  const simLabel    = context?.simActive && context.hazard
    ? `${HAZARD_LABELS[context.hazard] ?? context.hazard} · Sev. ${context.severity ?? ''} ${context.severity ? `(${SEVERITY_LABELS[context.severity] ?? ''})` : ''}`
    : null

  return (
    <div className="lpa-card">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <button type="button" className="lpa-header" onClick={() => setCollapsed(v => !v)}>
        <div className="lpa-header-left">
          <span className="lpa-header-icon">
            <Bot size={11} />
          </span>
          <span className="lpa-header-label">PHILIREADY ASSISTANT</span>
          {context?.simActive && <span className="lpa-sim-dot" />}
        </div>
        <div className="lpa-header-right">
          {hasMessages && !collapsed && (
            <span
              role="button"
              tabIndex={0}
              className="lpa-clear-btn"
              title="Clear conversation"
              onClick={e => { e.stopPropagation(); clear() }}
              onKeyDown={e => e.key === 'Enter' && (e.stopPropagation(), clear())}
            >
              <Trash2 size={10} />
            </span>
          )}
          {collapsed ? <ChevronDown size={12} className="lpa-chevron" /> : <ChevronUp size={12} className="lpa-chevron" />}
        </div>
      </button>

      {/* ── Body ───────────────────────────────────────────────────── */}
      {!collapsed && (
        <div className="lpa-body">

          {/* Context pill (sim active or city selected) */}
          {simLabel && (
            <div className="lpa-ctx-pill">
              <span className="lpa-ctx-dot" />
              {simLabel}
              {context?.selectedCity && ` · ${context.selectedCity}`}
            </div>
          )}

          {/* Messages */}
          <div className="lpa-messages">
            {!hasMessages && (
              <div className="lpa-empty">
                <div className="lpa-empty-icon"><Sparkles size={15} /></div>
                <p className="lpa-empty-text">
                  Ask about demand forecasts, SPHERE standards, risk scores, or the current simulation.
                </p>
                <div className="lpa-starters">
                  {STARTERS.map(s => (
                    <button
                      key={s}
                      type="button"
                      className="lpa-starter"
                      onClick={() => send(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`lpa-bubble lpa-bubble--${msg.role}`}>
                {msg.role === 'assistant' && (
                  <span className="lpa-bubble-avatar"><Bot size={9} /></span>
                )}
                <div className="lpa-bubble-body">
                  {msg.content
                    ? renderContent(msg.content)
                    : msg.streaming
                      ? <span className="lpa-cursor" />
                      : null
                  }
                  {msg.streaming && msg.content && <span className="lpa-cursor" />}
                </div>
              </div>
            ))}

            {error && (
              <div className="lpa-error">
                <span>{error}</span>
                <button
                  type="button"
                  className="lpa-retry"
                  onClick={() => {
                    setError(null)
                    const last = [...messages].reverse().find(m => m.role === 'user')
                    if (last) { setMessages(p => p.filter(m => m.id !== last.id)); send(last.content) }
                  }}
                >
                  Retry
                </button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="lpa-input-row">
            <textarea
              ref={textareaRef}
              className="lpa-input"
              rows={1}
              placeholder={simLabel ? `Ask about this ${HAZARD_LABELS[context?.hazard ?? ''] ?? 'event'}…` : 'Ask about forecasts, risk, logistics…'}
              value={input}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              disabled={streaming}
            />
            <button
              type="button"
              className="lpa-send"
              onClick={() => send(input)}
              disabled={streaming || !input.trim()}
              title="Send (Enter)"
            >
              <Send size={11} />
            </button>
          </div>

        </div>
      )}
    </div>
  )
}