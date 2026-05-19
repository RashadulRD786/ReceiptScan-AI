import { useRef, useState } from 'react'

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE_MB = 10

export default function UploadZone({ onFilesSelected, disabled }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')

  const validateFiles = (files) => {
    setError('')
    const valid = []
    for (const file of files) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(`"${file.name}" is not supported. Upload JPG, PNG, or WEBP.`)
        return []
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`"${file.name}" exceeds the 10MB limit.`)
        return []
      }
      valid.push(file)
    }
    return valid
  }

  const handleFiles = (files) => {
    const valid = validateFiles(Array.from(files))
    if (valid.length > 0) onFilesSelected(valid)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (!disabled) handleFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)

  return (
    <div>
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer
          ${dragging
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-gray-300 hover:border-indigo-300 hover:bg-gray-50 bg-white'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <div className="text-4xl mb-3">📎</div>
        <p className="text-sm font-medium text-gray-700 mb-1">
          Drop your receipt here, or{' '}
          <span className="text-indigo-600">browse files</span>
        </p>
        <p className="text-xs text-gray-400">
          JPG, PNG or WEBP · Up to 10MB · Multiple files supported
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  )
}
