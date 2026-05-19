import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'
import SpendingCharts from '../components/SpendingCharts'
import { getAnalytics } from '../services/api'
import { useAuth } from '../context/AuthContext'

const PERIODS = ['weekly', 'monthly', 'yearly']

export default function Dashboard() {
  const { session } = useAuth()
  const [period, setPeriod] = useState('monthly')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Dashboard — ReceiptScan AI'
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const result = await getAnalytics(period, session)
        setData(result)
      } catch (err) {
        toast.error('Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }
    if (session) load()
  }, [period, session])

  const summary = data?.summary
  const currency = summary?.currency || 'MYR'

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* ── Header + Period toggle ─────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-gray-900">
            Expense Dashboard
          </h1>
          <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                  period === p
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* ── Loading state ──────────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center py-20 gap-3">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading analytics...</p>
          </div>
        )}

        {/* ── Empty state ────────────────────────────────────── */}
        {!loading && summary?.receipt_count === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-3xl mb-3">📊</p>
            <p className="text-gray-600 font-medium mb-1">
              No receipts in this period
            </p>
            <p className="text-gray-400 text-sm mb-4">
              Submit some receipts to see your spending analytics here.
            </p>
            <Link
              to="/app"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              Go to Scanner
            </Link>
          </div>
        )}

        {/* ── Dashboard content ──────────────────────────────── */}
        {!loading && summary && summary.receipt_count > 0 && (
          <>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                  Total Spent
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {currency}{' '}
                  {parseFloat(summary.total_spent).toFixed(2)}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                  Receipts
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary.receipt_count}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                  Top Category
                </p>
                <p className="text-2xl font-bold text-gray-900 truncate">
                  {summary.top_category || '—'}
                </p>
              </div>
            </div>

            {/* Charts */}
            <SpendingCharts
              trend={data.trend}
              byCategory={data.by_category}
              currency={currency}
            />

            {/* Top Merchants */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                Top Merchants
              </h3>
              {data.top_merchants && data.top_merchants.length > 0 ? (
                <div className="space-y-3">
                  {data.top_merchants.map((m, i) => (
                    <div
                      key={m.merchant}
                      className="flex items-center gap-3"
                    >
                      <span className="w-6 text-center text-xs font-semibold text-gray-400">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {m.merchant}
                        </p>
                        <p className="text-xs text-gray-400">
                          {m.visits} visit{m.visits !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
                        {currency} {parseFloat(m.total).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No merchant data</p>
              )}
            </div>

          </>
        )}

      </main>
    </div>
  )
}
