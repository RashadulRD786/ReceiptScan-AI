import { useEffect, useState } from 'react'

export default function ImagePreview({ file, onRemove }) {
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  if (!file || !preview) return null

  const sizeKB = (file.size / 1024).toFixed(0)
  const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
  const displaySize = file.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`

  return (
    <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3">
      <img
        src={preview}
        alt="Receipt preview"
        className="w-14 h-14 object-cover rounded-lg border border-gray-200 flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">{displaySize}</p>
      </div>
      <button
        onClick={onRemove}
        className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 text-xl leading-none"
        title="Remove image"
      >
        ×
      </button>
    </div>
  )
}
