const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

/**
 * Makes an authenticated request to the Flask backend.
 * Automatically attaches the Supabase JWT as a Bearer token.
 * Throws an error with the API's error message if the response is not ok.
 */
async function authFetch(path, options = {}, session) {
  if (!session?.access_token) {
    throw new Error('Not authenticated. Please sign in again.')
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`)
  }

  return data
}

// ── Receipt Extraction ────────────────────────────────────────────────────────

/**
 * Uploads a receipt image to the backend for AI extraction.
 * Returns the extracted fields as a JSON object.
 *
 * @param {File} file - The receipt image file from the upload input
 * @param {Object} session - The Supabase session object (contains access_token)
 * @returns {Object} Extracted fields: merchant, date, total, currency, category,
 *                   date_confidence, currency_confidence, source
 */
export async function extractReceipt(file, session) {
  const formData = new FormData()
  formData.append('file', file)

  return authFetch(
    '/api/extract',
    {
      method: 'POST',
      body: formData,
      // Do NOT set Content-Type — browser sets it automatically with boundary
    },
    session
  )
}

// ── Receipt Submission ────────────────────────────────────────────────────────

/**
 * Submits the reviewed receipt form data to be saved in the database.
 * Optionally includes the image file for storage.
 *
 * @param {Object} receiptData - Form fields: merchant, date, total, currency, category, source
 * @param {File|null} imageFile - Original image file for storage (optional)
 * @param {Object} session - Supabase session
 * @returns {Object} { message, id } on success
 */
export async function submitReceipt(receiptData, imageFile, session) {
  // If image file provided, send as multipart form data
  if (imageFile) {
    const formData = new FormData()
    formData.append('file', imageFile)
    Object.entries(receiptData).forEach(([key, value]) => {
      formData.append(key, value)
    })
    return authFetch('/api/submit', { method: 'POST', body: formData }, session)
  }

  // JSON only (no image)
  return authFetch(
    '/api/submit',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(receiptData),
    },
    session
  )
}

// ── History ───────────────────────────────────────────────────────────────────

/**
 * Fetches all receipts for the authenticated user, newest first.
 *
 * @param {Object} session - Supabase session
 * @returns {Object} { receipts: [...] }
 */
export async function getHistory(session) {
  return authFetch('/api/history', { method: 'GET' }, session)
}

/**
 * Deletes a single receipt record by ID.
 * Only succeeds if the record belongs to the authenticated user.
 *
 * @param {string} id - UUID of the receipt record
 * @param {Object} session - Supabase session
 * @returns {Object} { message } on success
 */
export async function deleteReceipt(id, session) {
  return authFetch(`/api/history/${id}`, { method: 'DELETE' }, session)
}

// ── Analytics ─────────────────────────────────────────────────────────────────

/**
 * Fetches aggregated spending data for the dashboard.
 *
 * @param {'weekly'|'monthly'|'yearly'} period - Time period to aggregate
 * @param {Object} session - Supabase session
 * @returns {Object} { period, summary, by_category, top_merchants, trend }
 */
export async function getAnalytics(period, session) {
  return authFetch(`/api/analytics?period=${period}`, { method: 'GET' }, session)
}

// ── Health Check ──────────────────────────────────────────────────────────────

/**
 * Checks if the backend is reachable. Used for debugging.
 * Does not require authentication.
 */
export async function healthCheck() {
  const response = await fetch(`${API_URL}/api/health`)
  return response.json()
}
