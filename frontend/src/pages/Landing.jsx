import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'

// FAQ data
const FAQ_ITEMS = [
  {
    q: 'What data is extracted from my receipt?',
    a: 'ReceiptScan AI extracts four key fields: the merchant name, transaction date, total amount paid, and currency. It also automatically categorises the expense (e.g. Food & Beverage, Transport, Shopping).'
  },
  {
    q: 'Is my receipt data private and secure?',
    a: 'Yes. Each account is completely isolated — you can only see receipts you have submitted. All data is stored in a secure cloud database with row-level security policies that prevent any cross-account access.'
  },
  {
    q: 'What receipt formats are supported?',
    a: 'Upload JPG, PNG, or WEBP images. Both physical receipts (photographed) and digital receipts (screenshots) are supported. For best results, ensure the receipt is well-lit and in focus.'
  },
  {
    q: 'What happens if the AI cannot read my receipt?',
    a: 'If the primary AI extraction fails, the system automatically falls back to a classical OCR engine. A yellow notice will appear asking you to verify the extracted fields before submitting. You can always edit any field manually.'
  },
  {
    q: 'Can I edit the extracted data before saving?',
    a: 'Yes. Every field in the form is editable before you submit. The AI pre-fills the form as a starting point — you have full control to correct anything before saving.'
  },
  {
    q: 'What languages and currencies are supported?',
    a: 'The AI can read receipts in English, Bahasa Malaysia, Chinese, and most Latin-script languages. It supports all major currencies and infers the currency from symbols and context (e.g. RM → MYR, $ → USD/SGD by location).'
  },
]

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium text-gray-900 pr-4">{q}</span>
        <span className="text-indigo-600 text-xl flex-shrink-0">
          {open ? '−' : '+'}
        </span>
      </button>
      {open && (
        <div className="px-6 pb-4 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-3">
          {a}
        </div>
      )}
    </div>
  )
}

export default function Landing() {
  useEffect(() => {
    document.title = 'ReceiptScan AI — Smart Receipt Scanner'
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-indigo-50 to-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <span>✨</span>
            <span>Powered by Gemini AI</span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Scan any receipt.{' '}
            <span className="text-indigo-600">Get instant data.</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload a receipt photo and let AI extract the merchant, date,
            total, and currency automatically — in seconds.
            Review, edit, and save to your personal expense history.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-lg"
            >
              Get Started — it's free
            </Link>
            <Link
              to="/signin"
              className="border border-gray-300 hover:border-indigo-300 text-gray-700 font-semibold px-8 py-3.5 rounded-xl transition-colors text-lg"
            >
              Sign In
            </Link>
          </div>

          {/* Product preview mockup */}
          <div className="mt-12 mx-auto max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-left">

            {/* Upload zone */}
            <div className="border-2 border-dashed border-indigo-200 rounded-xl p-4 text-center mb-4 bg-indigo-50">
              <div className="text-2xl mb-1">📎</div>
              <p className="text-xs text-indigo-400 font-medium">
                receipt_99speedmart.jpg
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Analysing receipt...</p>
              <div className="mt-2 h-1 bg-indigo-100 rounded-full overflow-hidden">
                <div className="h-full w-3/4 bg-indigo-400 rounded-full" />
              </div>
            </div>

            {/* Auto-filled fields */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">Merchant</p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-800">
                  99 Speed Mart
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Date</p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-800">
                  2026-05-13
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Total</p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-800">
                  RM 38.25
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Category</p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs">
                  <span className="bg-indigo-100 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    Groceries
                  </span>
                </div>
              </div>
            </div>

            {/* Submit row */}
            <div className="flex items-center gap-2">
              <button className="flex-1 bg-indigo-600 text-white text-xs font-semibold py-2 rounded-lg">
                Submit Receipt
              </button>
              <button className="text-xs text-gray-400 border border-gray-200 px-3 py-2 rounded-lg">
                Reset
              </button>
            </div>

            {/* Source tag */}
            <p className="text-center text-xs text-gray-400 mt-3">
              ✨ Extracted by Gemini AI · 2.1s
            </p>

          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              How it works
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              From receipt photo to saved expense record in three simple steps.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: '📤',
                title: 'Upload your receipt',
                desc: 'Take a photo or upload a screenshot of any receipt — restaurant, retail, transport, or any other type.'
              },
              {
                step: '02',
                icon: '🤖',
                title: 'AI extracts the details',
                desc: 'Our AI reads the receipt like a human would, identifying the merchant, date, total, and currency — ignoring noise like change and rounding.'
              },
              {
                step: '03',
                icon: '✅',
                title: 'Review, edit, and save',
                desc: 'The form is pre-filled with the extracted data. Edit any field if needed, then submit to save to your personal expense history.'
              }
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="relative bg-gray-50 rounded-2xl p-8">
                <div className="text-4xl mb-4">{icon}</div>
                <div className="absolute top-6 right-6 text-5xl font-bold text-gray-100">
                  {step}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why It's Secure ───────────────────────────────────────── */}
      <section className="py-20 px-4 bg-indigo-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Your receipts are yours alone
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              Receipts contain sensitive financial data. We take that seriously.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: '🔐',
                title: 'Private by default',
                desc: 'Every submission is tied to your account. No other user can see your receipts — ever.'
              },
              {
                icon: '🏦',
                title: 'Isolated accounts',
                desc: 'Row-level security at the database level ensures complete data isolation between accounts.'
              },
              {
                icon: '🔒',
                title: 'Secure storage',
                desc: 'Data is stored in encrypted cloud infrastructure. API keys never touch the browser.'
              }
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-8 border border-indigo-100">
                <div className="text-3xl mb-4">{icon}</div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Frequently asked questions
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {FAQ_ITEMS.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧾</span>
            <span className="font-semibold text-white">ReceiptScan AI</span>
          </div>
          <p className="text-sm">
            Built with Gemini AI · Powered by Supabase
          </p>
        </div>
      </footer>

    </div>
  )
}
