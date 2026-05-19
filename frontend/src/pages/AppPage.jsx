import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'
import UploadZone from '../components/UploadZone'
import ImagePreview from '../components/ImagePreview'
import FallbackBanner from '../components/FallbackBanner'
import ReceiptForm from '../components/ReceiptForm'
import HistoryTable from '../components/HistoryTable'
import { extractReceipt, submitReceipt, getHistory } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { exportReceiptsToExcel } from '../services/exportUtils'

export default function AppPage() {
  const { session } = useAuth()

  useEffect(() => {
    document.title = 'Scanner — ReceiptScan AI'
  }, [])

  // ── Scanner state ──────────────────────────────────────────────
  const [currentFile, setCurrentFile] = useState(null)
  const [extractedData, setExtractedData] = useState(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showFallbackBanner, setShowFallbackBanner] = useState(false)

  // Batch queue: remaining files to process after the first
  const [fileQueue, setFileQueue] = useState([])

  // ── History state ──────────────────────────────────────────────
  const [receipts, setReceipts] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)

  // ── Load history on mount ──────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getHistory(session)
        setReceipts(data.receipts || [])
      } catch (err) {
        toast.error('Failed to load history')
      } finally {
        setHistoryLoading(false)
      }
    }
    if (session) load()
  }, [session])

  // ── Extract receipt from file ──────────────────────────────────
  const processFile = useCallback(async (file) => {
    setCurrentFile(file)
    setExtractedData(null)
    setShowFallbackBanner(false)
    setIsExtracting(true)

    try {
      const result = await extractReceipt(file, session)
      setExtractedData(result)
      if (result.source === 'ocr_fallback') {
        setShowFallbackBanner(true)
      }
    } catch (err) {
      toast.error(err.message || 'Could not read receipt. Try a clearer photo.')
      setCurrentFile(null)
    } finally {
      setIsExtracting(false)
    }
  }, [session])

  // ── Handle files selected from UploadZone ─────────────────────
  const handleFilesSelected = (files) => {
    if (files.length === 0) return
    const [first, ...rest] = files
    setFileQueue(rest)
    processFile(first)
  }

  // ── Submit form data ───────────────────────────────────────────
  const handleSubmit = async (formData) => {
    setIsSubmitting(true)
    try {
      const result = await submitReceipt(formData, currentFile, session)

      // Add new record to top of history list
      const newRecord = {
        id: result.id,
        merchant: formData.merchant,
        date: formData.date,
        total: formData.total,
        currency: formData.currency,
        category: formData.category,
        source: formData.source,
        created_at: new Date().toISOString(),
      }
      setReceipts((prev) => [newRecord, ...prev])

      toast.success('Receipt saved!')

      // If more files in queue, process next one
      if (fileQueue.length > 0) {
        const [next, ...remaining] = fileQueue
        setFileQueue(remaining)
        processFile(next)
      } else {
        handleReset()
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save receipt. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Reset all scanner state ────────────────────────────────────
  const handleReset = () => {
    setCurrentFile(null)
    setExtractedData(null)
    setIsExtracting(false)
    setShowFallbackBanner(false)
    setFileQueue([])
  }

  // ── Delete from history ────────────────────────────────────────
  const handleDelete = (id) => {
    setReceipts((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* ── Scanner card ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">

          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">
              Receipt Scanner
            </h1>
            {/* Batch queue indicator */}
            {fileQueue.length > 0 && (
              <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-medium">
                {fileQueue.length} more in queue
              </span>
            )}
          </div>

          {/* Fallback banner */}
          {showFallbackBanner && (
            <FallbackBanner onDismiss={() => setShowFallbackBanner(false)} />
          )}

          {/* Upload zone — hidden once a file is selected */}
          {!currentFile && !isExtracting && (
            <UploadZone
              onFilesSelected={handleFilesSelected}
              disabled={isExtracting}
            />
          )}

          {/* Image preview */}
          {currentFile && (
            <ImagePreview
              file={currentFile}
              onRemove={handleReset}
            />
          )}

          {/* Extracting spinner */}
          {isExtracting && (
            <div className="flex items-center gap-3 py-6 justify-center">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-600">
                Analysing your receipt...
              </p>
            </div>
          )}

          {/* Auto-filled form — shown once extraction is complete */}
          {extractedData && !isExtracting && (
            <ReceiptForm
              extractedData={extractedData}
              onSubmit={handleSubmit}
              onReset={handleReset}
              isSubmitting={isSubmitting}
            />
          )}

        </div>

        {/* ── History card ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Past Submissions
            </h2>
            {receipts.length > 0 && (
              <button
                onClick={() => exportReceiptsToExcel(receipts)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 border border-gray-200 hover:border-indigo-300 px-3 py-1.5 rounded-lg transition-colors"
                title="Download all receipts as Excel file"
              >
                <span>📥</span>
                <span>Export Excel</span>
              </button>
            )}
          </div>
          <HistoryTable
            receipts={receipts}
            onDelete={handleDelete}
            loading={historyLoading}
          />
        </div>

      </main>
    </div>
  )
}
