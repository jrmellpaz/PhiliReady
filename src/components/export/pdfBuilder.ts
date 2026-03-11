/**
 * pdfBuilder.ts
 * Builds a styled jsPDF document from city/simulator report data.
 *
 * Install dependency:  npm i jspdf
 */

import jsPDF from 'jspdf'
import type { ExplainInput } from '#/lib/ai-explain'
import type { ForecastPoint } from '#/lib/types'

/* ── Palette ────────────────────────────────────────────────────── */

const C = {
  navy:   [10,  26,  60]  as const,
  blue:   [30,  90, 180]  as const,
  teal:   [14, 164, 122]  as const,
  amber:  [214, 139,  10]  as const,
  red:    [208,  48,  80]  as const,
  muted:  [80, 100, 130]  as const,
  pale:   [200, 210, 225]  as const,
  white:  [255, 255, 255]  as const,
  offwht: [245, 248, 252]  as const,
}

/* ── Constants ──────────────────────────────────────────────────── */

const W        = 210
const H        = 297
const MAR      = 18          
const INNER    = W - MAR * 2 
const PARA_GAP = 3

type RGB = readonly [number, number, number]

/* ── Tiny helpers ───────────────────────────────────────────────── */

function setFill(doc: jsPDF, c: RGB) { doc.setFillColor(c[0], c[1], c[2]) }
function setDraw(doc: jsPDF, c: RGB) { doc.setDrawColor(c[0], c[1], c[2]) }
function setTxt (doc: jsPDF, c: RGB) { doc.setTextColor(c[0], c[1], c[2]) }

/** Returns the actual rendered line height in mm for the current font size. */
function getLineH(doc: jsPDF): number {
  return doc.getLineHeight() / doc.internal.scaleFactor
}

function formatNum(n: number, dp = 0): string {
  const [int, dec] = n.toFixed(dp).split('.')
  const intPart = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return dp > 0 ? `${intPart}.${dec}` : intPart
}

function ph(n: number, dp = 2): string {
  return `PHP ${formatNum(n, dp)}`
}

function pct(v: number): string {
  return `${(v * 100).toFixed(0)}%`
}

function textBlock(doc: jsPDF, text: string, x: number, y: number, maxW: number): number {
  const lines = doc.splitTextToSize(text, maxW) as string[]
  doc.text(lines, x, y)
  return y + lines.length * getLineH(doc)
}

/* ── Section label ──────────────────────────────────────────────── */

function sectionLabel(doc: jsPDF, label: string, y: number): number {
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  setTxt(doc, C.muted)
  doc.text(label.toUpperCase(), MAR, y)
  setDraw(doc, C.pale)
  doc.setLineWidth(0.3)
  doc.line(
    MAR + doc.getTextWidth(label.toUpperCase()) + 2,
    y - 0.5,
    W - MAR,
    y - 0.5,
  )
  return y + 4.5
}

/* ── Stats grid ─────────────────────────────────────────────────── */
// 2-column grid matching the UI: all-caps small label, large bold value,
// generous internal padding, clear gap between cards

function statsGrid(
  doc: jsPDF,
  stats: Array<{ label: string; value: string; color?: RGB }>,
  y: number,
): number {
  const cols   = 2
  const gap    = 3                              // gap between columns
  const colW   = (INNER - gap) / cols           // each card width
  const cardH  = 16                             // card height
  const rowGap = 3                              // gap between rows

  stats.forEach((s, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const cx  = MAR + col * (colW + gap)
    const cy  = y + row * (cardH + rowGap)

    // Card background + border
    setFill(doc, C.offwht)
    setDraw(doc, C.pale)
    doc.setLineWidth(0.2)
    doc.roundedRect(cx, cy, colW, cardH, 2, 2, 'FD')

    // ALL-CAPS label — matches UI style
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'bold')
    setTxt(doc, C.muted)
    doc.text(s.label.toUpperCase(), cx + 5, cy + 4.5)

    // Large bold value — tighter gap below label
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    setTxt(doc, s.color ?? C.navy)
    doc.text(s.value, cx + 5, cy + 11.5)
  })

  const rows = Math.ceil(stats.length / cols)
  return y + rows * (cardH + rowGap) - rowGap + 4
}

/* ── Demand bar — single line: LABEL ▏▓▓▓▓░░░░▏ VALUE ─────────── */

const DEMAND_LABEL_W = 26  
const DEMAND_VAL_W   = 34  
const DEMAND_GAP     = 3  
const DEMAND_BAR_W   = INNER - DEMAND_LABEL_W - DEMAND_VAL_W - DEMAND_GAP * 2
const DEMAND_ROW_H   = 7.5  
const DEMAND_BAR_H   = 3.0

function demandBar(
  doc: jsPDF,
  label: string,
  value: number,
  unit: string,
  color: RGB,
  max: number,
  y: number,
): number {
  const fill   = Math.min(value / max, 1)
  const midY   = y + DEMAND_ROW_H / 2        
  const textY  = midY + 1                   
  const barY   = midY - DEMAND_BAR_H / 2   

  const barX   = MAR + DEMAND_LABEL_W + DEMAND_GAP
  const valX   = barX + DEMAND_BAR_W + DEMAND_GAP

  // Label
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  setTxt(doc, C.navy)
  doc.text(label, MAR, textY)

  // Bar track
  setFill(doc, C.pale)
  doc.roundedRect(barX, barY, DEMAND_BAR_W, DEMAND_BAR_H, 1, 1, 'F')

  // Bar fill
  setFill(doc, color)
  if (fill > 0) doc.roundedRect(barX, barY, DEMAND_BAR_W * fill, DEMAND_BAR_H, 1, 1, 'F')

  // Value — right-aligned in its column
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  setTxt(doc, color)
  doc.text(`${formatNum(value)} ${unit}`, valX + DEMAND_VAL_W, textY, { align: 'right' })

  return y + DEMAND_ROW_H 
}

/* ── Forecast table — full content width ────────────────────────── */

function forecastTable(doc: jsPDF, data: ForecastPoint[], y: number): number {
  const cols = [
    { label: 'Day',       w: 24 },
    { label: 'Rice (kg)', w: 28 },
    { label: 'Water (L)', w: 28 },
    { label: 'Med Kits',  w: 24 },
    { label: 'Hygiene',   w: 24 },
    { label: 'Day Cost',  w: 34 },
  ]
  const totalW = cols.reduce((s, c) => s + c.w, 0)
  const startX = MAR + (INNER - totalW) / 2  // centred within margins

  // Header
  setFill(doc, C.navy)
  doc.rect(startX, y, totalW, 6, 'F')
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  setTxt(doc, C.white)
  let cx = startX
  for (const col of cols) {
    doc.text(col.label, cx + col.w / 2, y + 4, { align: 'center' })
    cx += col.w
  }
  y += 6

  // Rows
  data.forEach((row, ri) => {
    setFill(doc, ri % 2 === 0 ? C.offwht : C.white)
    doc.rect(startX, y, totalW, 5.5, 'F')
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    setTxt(doc, C.navy)

    const cells = [
      row.day,
      formatNum(row.rice),
      formatNum(row.water),
      formatNum(row.meds),
      formatNum(row.kits),
      ph(row.totalCost),
    ]
    cx = startX
    cells.forEach((cell, ci) => {
      doc.text(cell, cx + cols[ci].w / 2, y + 4, { align: 'center' })
      cx += cols[ci].w
    })
    y += 5.5
  })

  // Outer border
  setDraw(doc, C.pale)
  doc.setLineWidth(0.2)
  doc.rect(startX, y - data.length * 5.5 - 6, totalW, data.length * 5.5 + 6)
  return y + 3
}

/* ── Main builder ───────────────────────────────────────────────── */

export function buildReportPDF(
  input: ExplainInput,
  forecast: ForecastPoint[],
  aiText: string,
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  /* ── Page header ──────────────────────────────────────────────── */
  setFill(doc, C.navy)
  doc.rect(0, 0, W, 24, 'F')
  setFill(doc, C.blue)
  doc.rect(0, 0, 6, 24, 'F')

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  setTxt(doc, C.white)
  doc.text('PhiliReady', MAR, 11)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  setTxt(doc, C.pale)
  doc.text('Relief Demand Analysis Report', MAR, 17)

  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  doc.setFontSize(7.5)
  doc.text(dateStr, W - MAR, 17, { align: 'right' })

  let y = 32

  /* ── City title ───────────────────────────────────────────────── */
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  setTxt(doc, C.navy)
  doc.text(input.cityName, MAR, y)
  y += 6

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  setTxt(doc, C.muted)
  const subLine = [input.province, input.region].filter(Boolean).join(' - ')
  if (subLine) { doc.text(subLine, MAR, y); y += 5 }

  if (input.simActive && input.hazard) {
    const sevLabel = ['', 'Minor', 'Moderate', 'Major', 'Catastrophic'][input.severity ?? 1]
    setFill(doc, C.red)
    doc.roundedRect(MAR, y, 90, 7, 2, 2, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    setTxt(doc, C.white)
    doc.text(
      `SIM ACTIVE: ${input.hazard.toUpperCase()} - Severity ${input.severity}/4 (${sevLabel})`,
      MAR + 4, y + 4.8,
    )
    y += 11
  }

  y += 2

  /* ── Stats grid ───────────────────────────────────────────────── */
  y = sectionLabel(doc, 'Key Indicators', y)
  y = statsGrid(doc, [
    { label: 'Population',     value: formatNum(input.population) },
    { label: 'Households',     value: formatNum(input.households) },
    {
      label: 'Risk Score',
      value: input.riskScore != null ? pct(input.riskScore) : 'N/A',
      color: input.riskScore != null && input.riskScore > 0.6
        ? C.red
        : input.riskScore != null && input.riskScore > 0.35
          ? C.amber
          : C.teal,
    },
    { label: '7-Day Est. Cost', value: ph(input.totalWeekCost), color: C.amber },
    ...(input.povertyPct != null
      ? [{ label: 'Poverty Rate', value: pct(input.povertyPct) }]
      : []),
    ...(input.floodZone
      ? [{ label: 'Flood Zone', value: input.floodZone.charAt(0).toUpperCase() + input.floodZone.slice(1) }]
      : []),
  ], y)
  y += 2

  y += 2
  /* ── Demand bars ──────────────────────────────────────────────── */
  y = sectionLabel(doc, 'Peak Demand Estimates', y)
  const maxDemand = Math.max(input.demand.rice, input.demand.water, 20000)
  y = demandBar(doc, 'Rice',         input.demand.rice,  'kg',    C.blue,  maxDemand, y)
  y = demandBar(doc, 'Water',        input.demand.water, 'L',     C.teal,  maxDemand, y)
  y = demandBar(doc, 'Medical Kits', input.demand.meds,  'units', C.amber, maxDemand, y)
  y = demandBar(doc, 'Hygiene Kits', input.demand.kits,  'units', C.red,   maxDemand, y)
  y += 2

  y += 2
  /* ── Forecast table ───────────────────────────────────────────── */
  if (forecast.length > 0) {
    y = sectionLabel(doc, '7-Day Forecast Breakdown', y)
    y = forecastTable(doc, forecast, y)
    y += 2
  }

  /* ── AI Assessment ────────────────────────────────────────────── */
  if (y > H - 60) {
    doc.addPage()
    y = 20
  }

  y = sectionLabel(doc, 'AI-Generated Assessment', y)

  // Italic label
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  setTxt(doc, C.muted)
  doc.text('Generated by Llama 3.1 via Groq. For planning purposes only.', MAR, y)
  y += getLineH(doc) + 2

  // Body text — split on blank lines into paragraphs
  const paragraphs = aiText
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter(Boolean)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  setTxt(doc, C.navy)

  for (const para of paragraphs) {
    const lines   = doc.splitTextToSize(para, INNER) as string[]
    const lineH   = getLineH(doc)
    const neededH = lines.length * lineH + PARA_GAP

    if (y + neededH > H - 15) {
      doc.addPage()
      y = 20
    }

    y = textBlock(doc, para, MAR, y, INNER)
    y += PARA_GAP
  }

  /* ── Footer ───────────────────────────────────────────────────── */
  const footY = H - 10
  setDraw(doc, C.pale)
  doc.setLineWidth(0.3)
  doc.line(MAR, footY - 3, W - MAR, footY - 3)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  setTxt(doc, C.muted)
  doc.text(
    'PhiliReady v1.0 - ASEAN Hackathon Prototype - For planning purposes only',
    MAR,
    footY,
  )
  doc.text(
    `Generated ${new Date().toISOString()}`,
    W - MAR,
    footY,
    { align: 'right' },
  )

  return doc
}

/* ── Filename helper ────────────────────────────────────────────── */

export function reportFileName(cityName: string, hazard?: string): string {
  const slug = cityName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  const hazardPart = hazard ? `-${hazard}` : ''
  const date = new Date().toISOString().slice(0, 10)
  return `philiready-${slug}${hazardPart}-${date}.pdf`
}