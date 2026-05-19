import { useState } from 'react'
import { deleteReceipt } from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function HistoryTable({ receipts, onDelete, loading }) {
  const { session } = useAuth()
  const [deletingId, setDeletingId] = useState(null)

  const handleDelete = async (id) => {
    if (!confirm('Delete this receipt? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await deleteReceipt(id, session)
      onDelete(id)
      toast.success('Receipt deleted')
    } catch (err) {
      toast.error(err.message || 'Failed to delete receipt')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        Loading history...
      </div>
    )
  }

  if (!receipts || receipts.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-2xl mb-2">🧾</p>
        <p className="text-gray-500 text-sm">No receipts yet.</p>
        <p className="text-gray-400 text-xs mt-1">
          Upload your first receipt above to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Merchant
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Date
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Total
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
              Category
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
              Source
            </th>
            <th className="px-4 py-3 w-12" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {receipts.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px] truncate">
                {r.merchant}
              </td>
              <td className="px-4 py-3 text-gray-600">{r.date}</td>
              <td className="px-4 py-3 text-right font-medium text-gray-900">
                {r.currency} {parseFloat(r.total).toFixed(2)}
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded-full">
                  {r.category}
                </span>
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  r.source === 'gemini'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-amber-50 text-amber-700'
                }`}>
                  {r.source === 'gemini' ? '✨ AI' : '📄 OCR'}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => handleDelete(r.id)}
                  disabled={deletingId === r.id}
                  className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50 text-lg leading-none"
                  title="Delete receipt"
                >
                  {deletingId === r.id ? '...' : '×'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
