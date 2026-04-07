import { Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

type ShareExportMetadataItem = {
  label: string;
  value: string;
};

export type ShareExportColumn<T> = {
  header: string;
  value: (row: T, index: number) => string;
  spanFull?: boolean;
};

type ShareExportBaseOptions = {
  title: string;
  subtitle?: string;
  filename?: string;
  metadata?: ShareExportMetadataItem[];
  errorTitle?: string;
  errorMessage?: string;
};

export type ShareExportTextOptions = ShareExportBaseOptions & {
  message: string;
};

export type ShareExportStructuredOptions<T> = ShareExportBaseOptions & {
  columns: ShareExportColumn<T>[];
  rows: T[];
  layout?: 'table' | 'cards';
  recordTitle?: (row: T, index: number) => string;
  recordSubtitle?: (row: T, index: number) => string;
  emptyStateMessage?: string;
};

type ShareExportOptions<T> =
  | ShareExportTextOptions
  | ShareExportStructuredOptions<T>;

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const formatDisplayValue = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : '-';
};

const buildMetadataMarkup = (
  metadata: ShareExportMetadataItem[],
  generatedAt: string
) =>
  [
    ...metadata.map(
      (item) => `
        <div class="meta-item">
          <span class="meta-label">${escapeHtml(item.label)}</span>
          <span class="meta-value">${escapeHtml(formatDisplayValue(item.value))}</span>
        </div>
      `
    ),
    `
      <div class="meta-item">
        <span class="meta-label">Generated</span>
        <span class="meta-value">${escapeHtml(generatedAt)}</span>
      </div>
    `,
  ].join('');

const buildShellHtml = ({
  title,
  subtitle,
  filename,
  metadata,
  contentMarkup,
}: {
  title: string;
  subtitle?: string;
  filename?: string;
  metadata: ShareExportMetadataItem[];
  contentMarkup: string;
}) => {
  const generatedAt = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(filename ?? title)}</title>
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
            font-family: Helvetica, Arial, sans-serif;
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
          }
          .brand {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 18px;
          }
          .brand-copy {
            min-width: 0;
            flex: 1;
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
            line-height: 1.12;
            font-weight: 700;
            color: #111827;
          }
          .subtitle {
            margin: 8px 0 0;
            color: #6b7280;
            font-size: 14px;
            line-height: 1.45;
          }
          .meta {
            min-width: 220px;
            display: grid;
            gap: 8px;
          }
          .meta-item {
            display: grid;
            gap: 2px;
            text-align: right;
          }
          .meta-label {
            color: #991b1b;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }
          .meta-value {
            color: #4b5563;
            font-size: 12px;
            line-height: 1.4;
            white-space: pre-line;
          }
          .table-shell,
          .message-shell,
          .record-card {
            border: 1px solid #e5e7eb;
            border-radius: 18px;
            background: #ffffff;
            box-shadow: 0 14px 38px rgba(15, 23, 42, 0.04);
            overflow: hidden;
          }
          .table-shell {
            overflow: hidden;
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
          }
          .card-field {
            min-height: 58px;
            padding: 12px 14px;
            border-right: 1px solid #f1f5f9;
            border-bottom: 1px solid #f1f5f9;
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
          .message-shell {
            padding: 18px 20px;
            background: #fafafa;
          }
          .message-body {
            margin: 0;
            white-space: pre-wrap;
            word-break: break-word;
            font-family: "Courier New", monospace;
            font-size: 12px;
            line-height: 1.58;
            color: #1f2937;
          }
          .empty {
            color: #6b7280;
            text-align: center;
            padding: 24px;
            font-size: 12px;
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
            .table-shell,
            .message-shell,
            .record-card {
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        <section class="header">
          <div class="brand">
            <div class="brand-copy">
              <p class="eyebrow">I-TRACK</p>
              <h1 class="title">${escapeHtml(title)}</h1>
              ${
                subtitle
                  ? `<p class="subtitle">${escapeHtml(subtitle)}</p>`
                  : ''
              }
            </div>
            <div class="meta">${buildMetadataMarkup(metadata, generatedAt)}</div>
          </div>
        </section>
        ${contentMarkup}
        <div class="footer">Prepared from the I-TRACK vehicle inventory and tracking system.</div>
      </body>
    </html>
  `;
};

const buildTextHtml = ({
  title,
  subtitle,
  filename,
  metadata = [],
  message,
}: ShareExportTextOptions) =>
  buildShellHtml({
    title,
    subtitle,
    filename,
    metadata,
    contentMarkup: `
      <section class="message-shell">
        <pre class="message-body">${escapeHtml(message)}</pre>
      </section>
    `,
  });

const buildStructuredHtml = <T,>({
  title,
  subtitle,
  filename,
  metadata = [],
  columns,
  rows,
  layout = 'table',
  recordTitle,
  recordSubtitle,
  emptyStateMessage = 'No records available.',
}: ShareExportStructuredOptions<T>) => {
  const contentMarkup =
    layout === 'cards'
      ? rows.length
        ? `
            <div class="cards-shell">
              ${rows
                .map((row, index) => {
                  const titleValue =
                    recordTitle?.(row, index) ?? `Record ${index + 1}`;
                  const subtitleValue = recordSubtitle?.(row, index);

                  return `
                    <section class="record-card">
                      <div class="record-card-header">
                        <h2 class="record-card-title">${escapeHtml(
                          formatDisplayValue(titleValue)
                        )}</h2>
                        ${
                          subtitleValue
                            ? `<p class="record-card-subtitle">${escapeHtml(
                                formatDisplayValue(subtitleValue)
                              )}</p>`
                            : ''
                        }
                      </div>
                      <div class="record-grid">
                        ${columns
                          .map((column) => {
                            const value = formatDisplayValue(
                              column.value(row, index)
                            );

                            return `
                              <div class="card-field${
                                column.spanFull ? ' card-field-full' : ''
                              }">
                                <div class="card-label">${escapeHtml(
                                  column.header
                                )}</div>
                                <div class="card-value">${escapeHtml(value)}</div>
                              </div>
                            `;
                          })
                          .join('')}
                      </div>
                    </section>
                  `;
                })
                .join('')}
            </div>
          `
        : `<div class="empty">${escapeHtml(emptyStateMessage)}</div>`
      : `
          <div class="table-shell">
            <table>
              <thead>
                <tr>${columns
                  .map((column) => `<th>${escapeHtml(column.header)}</th>`)
                  .join('')}</tr>
              </thead>
              <tbody>
                ${
                  rows.length
                    ? rows
                        .map(
                          (row, index) => `
                            <tr>${columns
                              .map((column) => {
                                const value = formatDisplayValue(
                                  column.value(row, index)
                                );
                                return `<td>${escapeHtml(value)}</td>`;
                              })
                              .join('')}</tr>
                          `
                        )
                        .join('')
                    : `<tr><td colspan="${columns.length}" class="empty">${escapeHtml(
                        emptyStateMessage
                      )}</td></tr>`
                }
              </tbody>
            </table>
          </div>
        `;

  return buildShellHtml({
    title,
    subtitle,
    filename,
    metadata,
    contentMarkup,
  });
};

const isStructuredExport = <T,>(
  options: ShareExportOptions<T>
): options is ShareExportStructuredOptions<T> =>
  'columns' in options && Array.isArray(options.columns);

export async function shareExport<T>(options: ShareExportOptions<T>) {
  const {
    title,
    errorTitle = 'Export failed',
    errorMessage = 'The records could not be exported right now.',
  } = options;

  try {
    const html = isStructuredExport(options)
      ? buildStructuredHtml(options)
      : buildTextHtml(options);

    const { uri } = await Print.printToFileAsync({ html });
    const isSharingAvailable = await Sharing.isAvailableAsync();

    if (!isSharingAvailable) {
      Alert.alert(errorTitle, 'PDF sharing is not available on this device.');
      return;
    }

    await Sharing.shareAsync(uri, {
      UTI: 'com.adobe.pdf',
      mimeType: 'application/pdf',
      dialogTitle: title,
    });
  } catch {
    Alert.alert(errorTitle, errorMessage);
  }
}
