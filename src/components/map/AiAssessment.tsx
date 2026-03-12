import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { getCachedExplanation } from '#/lib/ai-explain'
import type { ExplainInput } from '#/lib/ai-explain'

interface Props {
  explainInput: ExplainInput
  resolvedAiText: string | null
  aiLoading: boolean
  aiError: string | null
  aiExpanded: boolean
  onRegenerate: () => void
  onRetry: () => void
  onToggleExpand: () => void
}

export function AiAssessment({
  explainInput,
  resolvedAiText,
  aiLoading,
  aiError,
  aiExpanded,
  onRegenerate,
  onRetry,
  onToggleExpand,
}: Props) {
  const cached = resolvedAiText ? getCachedExplanation(explainInput) : null

  return (
    <div className="panel-ai-section">
      <div className="panel-ai-header">
        <div>
          <p className="panel-section-label" style={{ margin: 0 }}>
            AI ASSESSMENT
          </p>
          {cached && (
            <p className="panel-ai-timestamp">
              Generated {new Date(cached.generatedAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </p>
          )}
        </div>
        <div className="panel-ai-header-actions">
          {resolvedAiText && !aiLoading && (
            <>
              <button
                type="button"
                className="panel-ai-icon-btn"
                onClick={onRegenerate}
                title="Regenerate"
              >
                <RefreshCw size={12} />
              </button>
              <button
                type="button"
                className="panel-ai-icon-btn"
                onClick={onToggleExpand}
                title={aiExpanded ? 'Collapse' : 'Expand'}
              >
                {aiExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Skeleton while loading */}
      {aiLoading && (
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

      {/* Error with retry */}
      {aiError && !aiLoading && (
        <div className="panel-ai-error">
          <p>{aiError}</p>
          <button
            type="button"
            className="panel-ai-retry-btn"
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      )}

      {/* Result */}
      {resolvedAiText && !aiLoading && aiExpanded && (
        <div className="panel-ai-body">
          {resolvedAiText
            .split(/\n{2,}/)
            .map((p, i) => (
              <p key={i} className="panel-ai-paragraph">
                {p.replace(/\n/g, ' ').trim()}
              </p>
            ))}
        </div>
      )}
    </div>
  )
}