export default function FallbackBanner({ onDismiss }) {
  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
      <span className="text-amber-500 text-lg flex-shrink-0 mt-0.5">⚠️</span>
      <div className="flex-1">
        <p className="font-medium text-amber-800">
          Extracted via OCR fallback
        </p>
        <p className="text-amber-700 text-xs mt-0.5">
          AI extraction was unavailable. Please verify all fields
          carefully before submitting — OCR results may be inaccurate.
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="text-amber-400 hover:text-amber-600 flex-shrink-0 text-lg leading-none"
      >
        ×
      </button>
    </div>
  )
}
