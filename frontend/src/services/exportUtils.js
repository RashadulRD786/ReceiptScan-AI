import * as XLSX from 'xlsx'

/**
 * Exports the user's receipt history as a formatted Excel file.
 * Called from AppPage when the user clicks "Export to Excel".
 *
 * @param {Array} receipts - Array of receipt objects from Supabase
 */
export function exportReceiptsToExcel(receipts) {
  if (!receipts || receipts.length === 0) return

  // Map to clean, human-readable rows
  const rows = receipts.map((r) => ({
    Merchant: r.merchant || '',
    Date: r.date || '',
    Total: parseFloat(r.total) || 0,
    Currency: r.currency || '',
    Category: r.category || '',
    Source: r.source === 'gemini' ? 'AI (Gemini)' : 'OCR Fallback',
    'Submitted At': r.created_at
      ? new Date(r.created_at).toLocaleDateString('en-MY', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : '',
  }))

  // Create worksheet from rows
  const worksheet = XLSX.utils.json_to_sheet(rows)

  // Auto-fit column widths based on content length
  const headers = Object.keys(rows[0])
  worksheet['!cols'] = headers.map((header) => ({
    wch: Math.max(
      header.length,
      ...rows.map((row) => String(row[header] ?? '').length)
    ) + 2, // +2 for padding
  }))

  // Create workbook and append sheet
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Receipts')

  // Generate filename with today's date
  const today = new Date().toISOString().split('T')[0]
  const filename = `receipts_export_${today}.xlsx`

  // Trigger browser download
  XLSX.writeFile(workbook, filename)
}
