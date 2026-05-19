import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

const CATEGORIES = [
  'Food & Beverage', 'Groceries', 'Transport', 'Petrol & Fuel',
  'Shopping', 'Healthcare', 'Beauty & Wellness', 'Entertainment',
  'Accommodation', 'Utilities', 'Education', 'Office Supplies', 'Other'
]

const COMMON_CURRENCIES = [
  'MYR', 'USD', 'SGD', 'GBP', 'EUR',
  'JPY', 'AUD', 'CNY', 'HKD', 'THB'
]

export default function ReceiptForm({
  extractedData,
  onSubmit,
  onReset,
  isSubmitting
}) {
  const [form, setForm] = useState({
    merchant: '',
    date: '',
    total: '',
    currency: '',
    category: 'Other',
  })

  // Populate form when extractedData changes
  useEffect(() => {
    if (!extractedData) return
    setForm({
      merchant: extractedData.merchant || '',
      date: extractedData.date || '',
      total: extractedData.total?.toString() || '',
      currency: extractedData.currency || '',
      category: extractedData.category || 'Other',
    })
  }, [extractedData])

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()

    // Client-side validation
    if (!form.merchant.trim()) {
      toast.error('Merchant name is required.')
      return
    }
    if (!form.date) {
      toast.error('Date is required.')
      return
    }
    if (!form.total || isNaN(parseFloat(form.total))) {
      toast.error('Total must be a valid number.')
      return
    }
    if (!/^[A-Z]{3}$/.test(form.currency)) {
      toast.error('Currency must be a 3-letter code (e.g. MYR, USD).')
      return
    }

    onSubmit({
      ...form,
      total: parseFloat(form.total),
      source: extractedData?.source || 'gemini',
    })
  }

  const handleCopyJson = () => {
    const json = JSON.stringify(
      { ...form, total: parseFloat(form.total) },
      null,
      2
    )
    navigator.clipboard.writeText(json)
    toast.success('JSON copied to clipboard')
  }

  // Determine whether to show date picker or text input
  // Show picker if: confidence is low OR source is ocr_fallback
  const showDatePicker =
    extractedData?.date_confidence === 'low' ||
    extractedData?.source === 'ocr_fallback'

  // Determine whether to show currency dropdown or text input
  const showCurrencyDropdown =
    extractedData?.currency_confidence === 'low' ||
    extractedData?.source === 'ocr_fallback'

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Merchant */}
      <div>
        <label className={labelClass}>Merchant</label>
        <input
          type="text"
          value={form.merchant}
          onChange={set('merchant')}
          placeholder="Business or store name"
          className={inputClass}
        />
      </div>

      {/* Date + Total — side by side */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            Date
            {showDatePicker && (
              <span className="ml-2 text-amber-500 text-xs font-normal">
                Please verify
              </span>
            )}
          </label>
          {showDatePicker ? (
            <input
              type="date"
              value={form.date}
              onChange={set('date')}
              className={inputClass}
            />
          ) : (
            <input
              type="text"
              value={form.date}
              onChange={set('date')}
              placeholder="YYYY-MM-DD"
              className={inputClass}
            />
          )}
        </div>

        <div>
          <label className={labelClass}>Total Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.total}
            onChange={set('total')}
            placeholder="0.00"
            className={inputClass}
          />
        </div>
      </div>

      {/* Currency + Category — side by side */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            Currency
            {showCurrencyDropdown && (
              <span className="ml-2 text-amber-500 text-xs font-normal">
                Please verify
              </span>
            )}
          </label>
          {showCurrencyDropdown ? (
            <select
              value={form.currency}
              onChange={set('currency')}
              className={inputClass}
            >
              <option value="">Select currency</option>
              {COMMON_CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="OTHER">Other</option>
            </select>
          ) : (
            <input
              type="text"
              value={form.currency}
              onChange={set('currency')}
              placeholder="MYR"
              maxLength={3}
              className={`${inputClass} uppercase`}
            />
          )}
        </div>

        <div>
          <label className={labelClass}>Category</label>
          <select
            value={form.category}
            onChange={set('category')}
            className={inputClass}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
        >
          {isSubmitting ? 'Saving...' : 'Submit Receipt'}
        </button>
        <button
          type="button"
          onClick={handleCopyJson}
          className="px-4 py-2.5 border border-gray-300 text-gray-600 hover:text-gray-800 rounded-lg text-sm transition-colors"
          title="Copy extracted data as JSON"
        >
          Copy JSON
        </button>
        <button
          type="button"
          onClick={onReset}
          className="px-4 py-2.5 border border-gray-300 text-gray-500 hover:text-red-600 hover:border-red-300 rounded-lg text-sm transition-colors"
          title="Discard and upload a different receipt"
        >
          Start Over
        </button>
      </div>

    </form>
  )
}
