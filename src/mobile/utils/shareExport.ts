import { Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

type ShareExportOptions = {
  title: string;
  message: string;
  errorTitle?: string;
  errorMessage?: string;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const buildPdfHtml = (title: string, message: string) => {
  const escapedTitle = escapeHtml(title);
  const escapedMessage = escapeHtml(message);
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
        <style>
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 36px 32px 44px;
            font-family: Helvetica, Arial, sans-serif;
            color: #161616;
            background: #ffffff;
          }
          .topbar {
            width: 88px;
            height: 6px;
            border-radius: 999px;
            background: #b61116;
            margin-bottom: 18px;
          }
          h1 {
            margin: 0;
            font-size: 24px;
            line-height: 1.2;
            font-weight: 700;
            color: #111827;
          }
          .meta {
            margin-top: 8px;
            margin-bottom: 22px;
            font-size: 12px;
            color: #6b7280;
          }
          .content {
            border: 1px solid #e5e7eb;
            border-radius: 18px;
            background: #fafafa;
            padding: 18px 20px;
          }
          pre {
            margin: 0;
            white-space: pre-wrap;
            word-break: break-word;
            font-family: "Courier New", monospace;
            font-size: 12px;
            line-height: 1.58;
            color: #1f2937;
          }
        </style>
      </head>
      <body>
        <div class="topbar"></div>
        <h1>${escapedTitle}</h1>
        <div class="meta">Generated ${escapeHtml(generatedAt)}</div>
        <div class="content">
          <pre>${escapedMessage}</pre>
        </div>
      </body>
    </html>
  `;
};

export async function shareExport({
  title,
  message,
  errorTitle = 'Export failed',
  errorMessage = 'The records could not be exported right now.',
}: ShareExportOptions) {
  try {
    const { uri } = await Print.printToFileAsync({
      html: buildPdfHtml(title, message),
    });

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
