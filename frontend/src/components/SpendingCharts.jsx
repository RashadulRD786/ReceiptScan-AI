import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts'

// Category colour map — consistent colours across renders
const CATEGORY_COLORS = {
  'Food & Beverage':   '#4F46E5',
  'Groceries':         '#059669',
  'Transport':         '#D97706',
  'Petrol & Fuel':     '#EA580C',
  'Shopping':          '#DB2777',
  'Healthcare':        '#0891B2',
  'Beauty & Wellness': '#7C3AED',
  'Entertainment':     '#DC2626',
  'Accommodation':     '#0D9488',
  'Utilities':         '#64748B',
  'Education':         '#2563EB',
  'Office Supplies':   '#B45309',
  'Other':             '#9CA3AF',
}

const DEFAULT_COLOR = '#6366F1'

// Shorter date label for X axis (e.g. "13 May" or "May 13")
function formatDateLabel(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })
}

// Custom tooltip for bar chart
function BarTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm text-xs">
      <p className="text-gray-500 mb-1">{formatDateLabel(label)}</p>
      <p className="font-semibold text-gray-900">
        {currency} {payload[0].value.toFixed(2)}
      </p>
    </div>
  )
}

// Custom tooltip for donut chart
function PieTooltip({ active, payload, currency }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm text-xs">
      <p className="text-gray-700 font-medium">{payload[0].name}</p>
      <p className="text-gray-900 font-semibold">
        {currency} {payload[0].value.toFixed(2)}
      </p>
      <p className="text-gray-400">{payload[0].payload.count} receipt(s)</p>
    </div>
  )
}

export default function SpendingCharts({ trend, byCategory, currency }) {
  const hasBarData = trend && trend.length > 0
  const hasPieData = byCategory && byCategory.length > 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* ── Bar Chart: Spending Trend ────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          Spending Trend
        </h3>
        {hasBarData ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={trend}
              margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
            >
              <XAxis
                dataKey="date"
                tickFormatter={formatDateLabel}
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}`}
                width={40}
              />
              <Tooltip
                content={<BarTooltip currency={currency} />}
                cursor={{ fill: '#F3F4F6' }}
              />
              <Bar
                dataKey="total"
                fill="#4F46E5"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
            No spending data for this period
          </div>
        )}
      </div>

      {/* ── Donut Chart: By Category ─────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          By Category
        </h3>
        {hasPieData ? (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={byCategory}
                dataKey="total"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={2}
              >
                {byCategory.map((entry) => (
                  <Cell
                    key={entry.category}
                    fill={CATEGORY_COLORS[entry.category] || DEFAULT_COLOR}
                  />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip currency={currency} />} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span style={{ fontSize: 11, color: '#6B7280' }}>
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
            No category data for this period
          </div>
        )}
      </div>

    </div>
  )
}
