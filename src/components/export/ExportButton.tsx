/**
 * ExportButton.tsx
 * If cachedAiText is provided (e.g. already shown in DetailPanel),
 * the API is NOT called again — the cached text goes straight into the PDF.
 */

import { useState } from 'react'
import { FileDown, Loader2, Sparkles } from 'lucide-react'
import { generateExplanation } from '#/lib/ai-explain'
import { buildReportPDF, reportFileName } from '#/components/export/pdfBuilder'
import type { ExplainInput } from '#/lib/ai-explain'
import type { ForecastPoint } from '#/lib/types'

interface ExportButtonProps {
  input: ExplainInput
  forecast: ForecastPoint[]
  /** If provided, skips the API call entirely and uses this text in the PDF */
  cachedAiText?: string | null
  label?: string
  className?: string
}

type Stage = 'idle' | 'ai' | 'pdf' | 'error'

export function ExportButton({
  input,
  forecast,
  cachedAiText,
  label = 'Export PDF Report',
  className = '',
}: ExportButtonProps) {
  const [stage, setStage] = useState<Stage>('idle')
  const [errMsg, setErrMsg] = useState<string | null>(null)

  const handleExport = async () => {
    setStage(cachedAiText ? 'pdf' : 'ai')
    setErrMsg(null)

    try {
      // Use cached text if available — no API call
      const aiText = cachedAiText
        ?? (await generateExplanation(input)).text

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
    <div className={`export-btn-wrap ${className}`}>
      <button
        type="button"
        className={`export-btn ${stage === 'error' ? 'export-btn--error' : ''}`}
        onClick={handleExport}
        disabled={busy}
      >
        {busy
          ? <Loader2 size={14} className="export-btn-spin" />
          : <><FileDown size={14} /></>
        }
        {stageLabel}
      </button>

      {stage === 'error' && errMsg && (
        <p className="export-btn-error">{errMsg}</p>
      )}
    </div>
  )
}