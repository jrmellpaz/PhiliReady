/**
 * ExportButton.tsx
 * Exports a PDF report for a city assessment.
 *
 * If cachedAiText is provided (streamed in by AiAssessment via onTextReady),
 * no API call is made — the text goes straight into the PDF builder.
 *
 * If cachedAiText is null (user clicks export before stream finishes),
 * it fetches the assessment from the backend directly.
 */

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { buildReportPDF, reportFileName } from '#/components/export/pdfBuilder'
import type { ExplainInput } from '#/lib/ai-explain'
import type { ForecastPoint } from '#/lib/types'

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

interface ExportButtonProps {
  input: ExplainInput
  forecast: ForecastPoint[]
  /** Text already streamed in by AiAssessment — skips the API call if present */
  cachedAiText?: string | null
  label?: string
  className?: string
}

type Stage = 'idle' | 'ai' | 'pdf' | 'error'

/** Fetch the full assessment text from the backend */
async function fetchAssessmentText(input: ExplainInput): Promise<string> {
  const res = await fetch(`${API_BASE}/api/v1/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!res.ok) throw new Error(`Assessment API error ${res.status}`)

  // Collect all text chunks from the data-stream (lines starting with 0:)
  const raw = await res.text()
  const text = raw
    .split('\n')
    .filter(line => line.startsWith('0:'))
    .map(line => {
      try { return JSON.parse(line.slice(2)) as string }
      catch { return '' }
    })
    .join('')

  return text || 'No assessment could be generated.'
}

export function ExportButton({
  input,
  forecast,
  cachedAiText,
  label = 'Export PDF Report',
  className = 'export-btn-wrap',
}: ExportButtonProps) {
  const [stage, setStage] = useState<Stage>('idle')
  const [errMsg, setErrMsg] = useState<string | null>(null)

  const handleExport = async () => {
    setStage(cachedAiText ? 'pdf' : 'ai')
    setErrMsg(null)

    try {
      const aiText = cachedAiText ?? await fetchAssessmentText(input)

      setStage('pdf')
      const doc = buildReportPDF(input, forecast, aiText)
      doc.save(reportFileName(input.cityName, input.simActive ? input.hazard : undefined))
      setStage('idle')
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Export failed.')
      setStage('error')
    }
  }

  const busy = stage === 'ai' || stage === 'pdf'

  const stageLabel =
    stage === 'ai'  ? 'Generating analysis...' :
    stage === 'pdf' ? 'Building PDF...' :
    stage === 'error' ? 'Retry Export' :
    label

  return (
    <div className={`${className}`}>
      <button
        type="button"
        className={`simulate-activate-btn ${stage === 'error' ? 'export-btn--error' : ''}`}
        onClick={handleExport}
        disabled={busy}
      >
        {busy
          ? <Loader2 size={14} className="export-btn-spin" />
          : <FileDown size={14} />
        }
        {stageLabel && <span className="export-btn-label">{stageLabel}</span>}
      </button>

      {stage === 'error' && errMsg && (
        <p className="export-btn-error">{errMsg}</p>
      )}
    </div>
  )
}