import type { jsPDF as JsPDF } from 'jspdf'
import type { CellHookData } from 'jspdf-autotable'
import { formatDay, formatMonthYear } from '../../lib/dates'
import { formatMoneyAuto } from '../../lib/money'
import type { MonthlyReport } from '../../lib/monthlyReport'

// Palette from DESIGN.md (light). Goal colors → goal bars/dots only; person colors → people only.
const INK = '#1C1C1E'
const INK_2 = '#6C6C70'
const SEPARATOR = '#C6C6C8'
const TRACK = '#E5E5EA'

const MARGIN = 48
const FONT = 'helvetica'

/** Core fonts only cover WinAnsi: drop emoji and anything outside Latin-1 (plus a few typographic marks). */
const safe = (s: string) =>
  s
    .replace(/[^ -~ -ÿ–—‘’“”…€]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()

const mxn = (n: number) => formatMoneyAuto(n, 'MXN')
const signedMxn = (n: number) => formatMoneyAuto(n, 'MXN', { signed: true })
const pct = (share: number) => `${Math.round(share * 100)}%`

/** autoTable keeps header cells left-aligned; mirror the column's alignment on the header. */
const alignHead = (rightCols: number[]) => (d: CellHookData) => {
  if (d.section === 'head' && rightCols.includes(d.column.index)) d.cell.styles.halign = 'right'
}

function lastY(doc: JsPDF): number {
  return (doc as JsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 0
}

/** Draws the monthly report and returns the PDF as a Blob. jsPDF is loaded on demand. */
export async function renderMonthlyPdf(
  report: MonthlyReport,
  opts: { generatedAt?: Date } = {},
): Promise<Blob> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const generatedAt = opts.generatedAt ?? new Date()
  const doc = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' })
  doc.setLanguage('es-MX')
  doc.setProperties({ title: `Nuestras metas - ${report.monthLabel}` })

  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const contentW = pageW - MARGIN * 2
  const bottomLimit = pageH - MARGIN - 8
  let y = MARGIN

  const text = (
    s: string,
    x: number,
    yy: number,
    size: number,
    color: string,
    style: 'normal' | 'bold' = 'normal',
    align: 'left' | 'right' = 'left',
  ) => {
    doc.setFont(FONT, style)
    doc.setFontSize(size)
    doc.setTextColor(color)
    doc.text(s, x, yy, { align })
  }

  const ensure = (h: number) => {
    if (y + h > bottomLimit) {
      doc.addPage()
      y = MARGIN
    }
  }

  const sectionTitle = (title: string) => {
    ensure(70)
    text(title, MARGIN, y, 13, INK, 'bold')
    y += 12
  }

  const bar = (x: number, yy: number, w: number, h: number, fraction: number, color: string) => {
    doc.setFillColor(TRACK)
    doc.roundedRect(x, yy, w, h, h / 2, h / 2, 'F')
    const fw = Math.max(0, Math.min(1, fraction)) * w
    if (fw > 0) {
      doc.setFillColor(color)
      doc.roundedRect(x, yy, Math.max(fw, h), h, h / 2, h / 2, 'F')
    }
  }

  // 1. Header
  text('Nuestras metas', MARGIN, y + 8, 11, INK_2)
  text(`Generado el ${formatDay(generatedAt)}`, pageW - MARGIN, y + 8, 9, INK_2, 'normal', 'right')
  y += 38
  text(`Resumen de ${report.monthLabel}`, MARGIN, y, 26, INK, 'bold')
  y += 34

  // 2. Month at a glance
  const colW = contentW / 3
  const t = report.totals
  const deltaSub =
    t.deltaPct === null
      ? `Mes anterior: ${mxn(t.previousMonthMxn)}`
      : `${t.deltaPct > 0 ? '+' : ''}${Math.round(t.deltaPct * 100)}% sobre ${mxn(t.previousMonthMxn)}`
  const tiles = [
    {
      label: 'Ahorrado este mes',
      value: mxn(t.monthMxn),
      sub:
        t.monthUsd === null
          ? 'Sin tipo de cambio'
          : `${formatMoneyAuto(t.monthUsd, 'USD')} a $${report.fxRate!.toFixed(2)} por dólar`,
    },
    {
      label: 'Ahorrado juntos',
      value: mxn(t.allTimeMxn),
      sub: `Al cierre de ${report.monthLabel}`,
    },
    { label: 'Contra el mes anterior', value: signedMxn(t.deltaMxn), sub: deltaSub },
  ]
  tiles.forEach((tile, i) => {
    const x = MARGIN + i * colW
    text(tile.label, x, y, 9, INK_2)
    text(tile.value, x, y + 22, 19, INK, 'bold')
    text(tile.sub, x, y + 37, 8.5, INK_2)
  })
  y += 70

  // 3. Goals
  sectionTitle('Metas')
  const barCol = 2
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN, bottom: MARGIN },
    theme: 'plain',
    styles: {
      font: FONT,
      fontSize: 9,
      textColor: INK,
      cellPadding: { top: 7, bottom: 7, left: 4, right: 4 },
      lineColor: SEPARATOR,
      lineWidth: { bottom: 0.4 },
      valign: 'middle',
    },
    headStyles: { fontStyle: 'bold', fontSize: 8, textColor: INK_2 },
    head: [['Meta', 'Ahorrado / meta', 'Avance', 'En el mes', 'A este ritmo']],
    body: report.goals.map((g) => [
      safe(g.name),
      `${mxn(g.saved)} / ${mxn(g.targetMxn)}`,
      `${g.pct}%`,
      signedMxn(g.savedThisMonth),
      g.saved >= g.targetMxn
        ? 'Meta alcanzada'
        : g.projection
          ? formatMonthYear(g.projection.completion)
          : '-',
    ]),
    columnStyles: {
      0: {
        cellWidth: 100,
        cellPadding: { top: 7, bottom: 7, left: 16, right: 4 },
        fontStyle: 'bold',
      },
      1: { cellWidth: 132 },
      [barCol]: { cellWidth: 98 },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    didParseCell: alignHead([3, 4]),
    didDrawCell: (d: CellHookData) => {
      if (d.section !== 'body') return
      const g = report.goals[d.row.index]
      if (!g) return
      const { x, y: cy, height, width } = d.cell
      if (d.column.index === 0) {
        doc.setFillColor(g.color)
        doc.circle(x + 8, cy + height / 2, 3.2, 'F')
      } else if (d.column.index === barCol) {
        bar(x + 34, cy + height / 2 - 2.5, width - 34 - 6, 5, g.progress, g.color)
      }
    },
  })
  y = lastY(doc) + 28

  // 4. Who contributed
  sectionTitle('Quién ha aportado')
  y += 10
  const drawSplit = (label: string, pick: (p: MonthlyReport['people'][number]) => number) => {
    ensure(60)
    text(label, MARGIN, y, 9, INK_2)
    y += 9
    const parts = report.people.map((p) => ({ p, share: pick(p) }))
    doc.setFillColor(TRACK)
    doc.roundedRect(MARGIN, y, contentW, 8, 4, 4, 'F')
    let x = MARGIN
    parts.forEach(({ p, share }, i) => {
      const w = share * contentW
      if (w <= 0) return
      doc.setFillColor(p.color)
      doc.roundedRect(x, y, w, 8, 4, 4, 'F')
      // Square off the inner joint so the two colors meet cleanly.
      if (parts.length === 2 && parts.every((s) => s.share > 0)) {
        doc.rect(i === 0 ? x + w - 4 : x, y, 4, 8, 'F')
      }
      x += w
    })
    y += 24
    let lx = MARGIN
    parts.forEach(({ p, share }) => {
      const s = `${safe(p.name)} ${pct(share)}`
      doc.setFillColor(p.color)
      doc.circle(lx + 3, y - 3, 3, 'F')
      text(s, lx + 11, y, 10, INK, 'bold')
      lx += 11 + doc.getTextWidth(s) + 14
    })
    y += 24
  }
  drawSplit(report.monthLabel, (p) => p.month.share)
  drawSplit('Todo el tiempo, al cierre del mes', (p) => p.allTime.share)
  y += 4

  // 5. Movements
  ensure(90)
  sectionTitle(`Movimientos de ${report.monthLabel}`)
  if (report.movements.length === 0) {
    text('No hubo movimientos este mes.', MARGIN, y + 14, 10, INK_2)
    y += 36
  } else {
    const personColor = new Map(report.people.map((p) => [p.userId, p.color]))
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: MARGIN + 10 },
      theme: 'plain',
      showHead: 'everyPage',
      rowPageBreak: 'avoid',
      styles: {
        font: FONT,
        fontSize: 8.5,
        textColor: INK,
        cellPadding: { top: 5, bottom: 5, left: 3, right: 3 },
        lineColor: SEPARATOR,
        lineWidth: { bottom: 0.4 },
        valign: 'top',
        overflow: 'linebreak',
      },
      headStyles: { fontStyle: 'bold', fontSize: 8, textColor: INK_2 },
      head: [['Fecha', 'Persona', 'Meta', 'Monto', 'Equivalente MXN', 'T. cambio', 'Nota']],
      body: report.movements.map((m) => [
        formatDay(m.date),
        safe(m.person),
        safe(m.goal),
        formatMoneyAuto(m.amount, m.currency, { signed: true, entry: true }),
        signedMxn(m.amountMxn),
        m.currency === 'USD' ? `$${m.fx.toFixed(2)}` : '-',
        safe(m.note ?? ''),
      ]),
      columnStyles: {
        0: { cellWidth: 56 },
        1: { cellWidth: 62, cellPadding: { top: 5, bottom: 5, left: 11, right: 3 } },
        2: { cellWidth: 62 },
        3: { cellWidth: 62, halign: 'right' },
        4: { cellWidth: 70, halign: 'right' },
        5: { cellWidth: 44, halign: 'right' },
      },
      didParseCell: alignHead([3, 4, 5]),
      didDrawCell: (d: CellHookData) => {
        if (d.section === 'body' && d.column.index === 1) {
          const m = report.movements[d.row.index]
          const color = m && personColor.get(m.userId)
          if (color) {
            doc.setFillColor(color)
            doc.circle(d.cell.x + 6, d.cell.y + 8.3, 2.6, 'F')
          }
        }
      },
    })
    y = lastY(doc) + 20
  }

  // 6. Archived goals note
  if (report.archivedCount > 0) {
    ensure(24)
    const n = report.archivedCount
    text(
      `Se excluyen ${n} ${n === 1 ? 'meta archivada' : 'metas archivadas'} y sus movimientos.`,
      MARGIN,
      y,
      8.5,
      INK_2,
    )
  }

  // Page numbers, once the total is known.
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    text('Nuestras metas', MARGIN, pageH - MARGIN + 14, 8.5, INK_2)
    text(
      `Página ${i} de ${total}`,
      pageW - MARGIN,
      pageH - MARGIN + 14,
      8.5,
      INK_2,
      'normal',
      'right',
    )
  }

  return doc.output('blob')
}
