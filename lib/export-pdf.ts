import itrackLogo from '@/media/itrackred.png'

type ExportColumn<T> = {
  header: string
  value: (row: T) => string
  spanFull?: boolean
}

type ExportPdfOptions<T> = {
  title: string
  subtitle?: string
  filename?: string
  columns: ExportColumn<T>[]
  rows: T[]
  layout?: 'table' | 'cards'
  recordTitle?: (row: T) => string
  recordSubtitle?: (row: T) => string
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function exportPdfReport<T>({
  title,
  subtitle,
  filename,
  columns,
  rows,
  layout = 'table',
  recordTitle,
  recordSubtitle,
}: ExportPdfOptions<T>) {
  if (typeof window === 'undefined') return

  const tableHeaders = columns.map((column) => `<th>${escapeHtml(column.header)}</th>`).join('')

  const tableRows =
    layout === 'table'
      ? rows.length
        ? rows
            .map(
              (row) =>
                `<tr>${columns
                  .map((column) => `<td>${escapeHtml(column.value(row))}</td>`)
                  .join('')}</tr>`
            )
            .join('')
        : `<tr><td colspan="${columns.length}" class="empty">No records available</td></tr>`
      : ''

  const cardsMarkup =
    layout === 'cards'
      ? rows.length
        ? rows
            .map((row, index) => {
              const titleValue = recordTitle?.(row) ?? `Record ${index + 1}`
              const subtitleValue = recordSubtitle?.(row)
              const fields = columns
                .map(
                  (column) => `
                    <div class="card-field${column.spanFull ? ' card-field-full' : ''}">
                      <div class="card-label">${escapeHtml(column.header)}</div>
                      <div class="card-value">${escapeHtml(column.value(row)) || '-'}</div>
                    </div>
                  `
                )
                .join('')

              return `
                <section class="record-card">
                  <div class="record-card-header">
                    <div>
                      <h2 class="record-card-title">${escapeHtml(titleValue)}</h2>
                      ${
                        subtitleValue
                          ? `<p class="record-card-subtitle">${escapeHtml(subtitleValue)}</p>`
                          : ''
                      }
                    </div>
                  </div>
                  <div class="record-grid">
                    ${fields}
                  </div>
                </section>
              `
            })
            .join('')
        : `<div class="empty-card">No records available</div>`
      : ''

  const documentTitle = filename ?? title
  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(documentTitle)}</title>
        <style>
          :root {
            color-scheme: light;
          }
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 28px;
            font-family: Inter, Arial, Helvetica, sans-serif;
            color: #111827;
            background:
              radial-gradient(circle at top right, rgba(220, 38, 38, 0.08), transparent 26%),
              linear-gradient(180deg, #fff7f7 0%, #ffffff 24%);
          }
          .header {
            margin-bottom: 24px;
            border: 1px solid #fecaca;
            border-radius: 18px;
            background: linear-gradient(135deg, #ffffff 0%, #fff1f2 100%);
            padding: 20px 22px;
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 20px;
          }
          .brand {
            display: flex;
            align-items: center;
            gap: 14px;
          }
          .brand-mark {
            width: 54px;
            height: 54px;
            border-radius: 14px;
            background: #ffffff;
            border: 1px solid #fecaca;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 8px 24px rgba(220, 38, 38, 0.08);
            overflow: hidden;
          }
          .brand-mark img {
            width: 36px;
            height: 36px;
            object-fit: contain;
          }
          .brand-copy {
            min-width: 0;
          }
          .eyebrow {
            margin: 0 0 6px;
            color: #b91c1c;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.18em;
            text-transform: uppercase;
          }
          .title {
            margin: 0;
            font-size: 26px;
            font-weight: 700;
            line-height: 1.1;
          }
          .subtitle {
            margin: 8px 0 0;
            color: #6b7280;
            font-size: 14px;
          }
          .meta {
            min-width: 190px;
            font-size: 12px;
            color: #6b7280;
            text-align: right;
            display: grid;
            gap: 6px;
          }
          .meta strong {
            color: #991b1b;
            font-weight: 700;
          }
          .table-shell {
            overflow: hidden;
            border: 1px solid #e5e7eb;
            border-radius: 18px;
            background: #ffffff;
            box-shadow: 0 14px 38px rgba(15, 23, 42, 0.04);
          }
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          th,
          td {
            border: 1px solid #e5e7eb;
            padding: 8px 9px;
            text-align: left;
            vertical-align: top;
            font-size: 11px;
            white-space: pre-line;
            word-break: break-word;
          }
          th {
            background: linear-gradient(180deg, #fef2f2 0%, #fee2e2 100%);
            color: #7f1d1d;
            font-weight: 700;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          tr:nth-child(even) td {
            background: #fffbfb;
          }
          .cards-shell {
            display: grid;
            gap: 14px;
          }
          .record-card {
            border: 1px solid #e5e7eb;
            border-radius: 18px;
            background: #ffffff;
            box-shadow: 0 14px 38px rgba(15, 23, 42, 0.04);
            overflow: hidden;
            page-break-inside: avoid;
          }
          .record-card-header {
            padding: 14px 16px;
            border-bottom: 1px solid #fee2e2;
            background: linear-gradient(180deg, #fff7f7 0%, #ffffff 100%);
          }
          .record-card-title {
            margin: 0;
            color: #991b1b;
            font-size: 16px;
            font-weight: 700;
          }
          .record-card-subtitle {
            margin: 4px 0 0;
            color: #6b7280;
            font-size: 11px;
          }
          .record-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0;
          }
          .card-field {
            padding: 12px 14px;
            border-right: 1px solid #f1f5f9;
            border-bottom: 1px solid #f1f5f9;
            min-height: 58px;
          }
          .card-field:nth-child(2n) {
            border-right: none;
          }
          .card-field-full {
            grid-column: 1 / -1;
            border-right: none;
          }
          .card-label {
            color: #7f1d1d;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            margin-bottom: 6px;
          }
          .card-value {
            color: #111827;
            font-size: 11px;
            line-height: 1.5;
            white-space: pre-line;
            word-break: break-word;
          }
          .empty-card {
            border: 1px solid #e5e7eb;
            border-radius: 18px;
            background: #ffffff;
            color: #6b7280;
            padding: 24px;
            text-align: center;
          }
          .empty {
            text-align: center;
            color: #6b7280;
            padding: 24px 12px;
          }
          .footer {
            margin-top: 12px;
            color: #6b7280;
            font-size: 11px;
            text-align: right;
          }
          @media print {
            @page {
              size: A4;
              margin: 10mm;
            }
            body {
              padding: 0;
              background: #ffffff;
            }
            .record-card,
            .table-shell {
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">
            <div class="brand-mark">
              <img src="${escapeHtml(itrackLogo.src)}" alt="I-TRACK logo" />
            </div>
            <div class="brand-copy">
              <p class="eyebrow">I-TRACK</p>
              <h1 class="title">${escapeHtml(title)}</h1>
              ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ''}
            </div>
          </div>
          <div class="meta">
            <div><strong>System</strong> Isuzu Pasig I-TRACK</div>
            <div><strong>Generated</strong> ${escapeHtml(new Date().toLocaleString())}</div>
          </div>
        </div>
        ${
          layout === 'cards'
            ? `<div class="cards-shell">${cardsMarkup}</div>`
            : `
              <div class="table-shell">
                <table>
                  <thead>
                    <tr>${tableHeaders}</tr>
                  </thead>
                  <tbody>
                    ${tableRows}
                  </tbody>
                </table>
              </div>
            `
        }
        <div class="footer">Prepared from the I-TRACK vehicle inventory and tracking system.</div>
      </body>
    </html>
  `

  const printFrame = document.createElement('iframe')
  printFrame.style.position = 'fixed'
  printFrame.style.right = '0'
  printFrame.style.bottom = '0'
  printFrame.style.width = '0'
  printFrame.style.height = '0'
  printFrame.style.border = '0'
  printFrame.setAttribute('aria-hidden', 'true')
  document.body.appendChild(printFrame)

  const frameWindow = printFrame.contentWindow
  if (!frameWindow) {
    printFrame.remove()
    return
  }

  frameWindow.document.open()
  frameWindow.document.write(html)
  frameWindow.document.close()

  const triggerPrint = async () => {
    const images = Array.from(frameWindow.document.images)
    if (images.length) {
      await Promise.all(
        images.map(
          (image) =>
            new Promise<void>((resolve) => {
              if (image.complete) {
                resolve()
                return
              }

              image.addEventListener('load', () => resolve(), { once: true })
              image.addEventListener('error', () => resolve(), { once: true })
            })
        )
      )
    }

    frameWindow.focus()
    frameWindow.print()
    window.setTimeout(() => {
      printFrame.remove()
    }, 1000)
  }

  if (printFrame.contentDocument?.readyState === 'complete') {
    triggerPrint()
    return
  }

  printFrame.onload = triggerPrint
}
