import os
import io
import uuid
from datetime import datetime, timedelta, date
from flask import Flask, jsonify, g, request
from flask_cors import CORS
from dotenv import load_dotenv

from middleware.auth import require_auth
from supabase_client import supabase
import ai_service
import ocr_fallback

load_dotenv()


def create_app():
    app = Flask(__name__)

    # ── CORS ──────────────────────────────────────────────────────────
    # Only allow requests from the configured frontend origin.
    # In development: http://localhost:5173 (Vite dev server)
    # In production: the Vercel deployment URL (set via env var)
    cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:5173')
    origins_list = [o.strip() for o in cors_origins.split(',')]

    CORS(
        app,
        origins=origins_list,
        supports_credentials=True,
        allow_headers=['Content-Type', 'Authorization'],
        methods=['GET', 'POST', 'DELETE', 'OPTIONS']
    )

    # ── Public Routes ─────────────────────────────────────────────────

    @app.route('/api/health', methods=['GET'])
    def health():
        """
        Public health check endpoint.
        Used by Render for uptime monitoring and cold-start wake-up.
        Returns 200 with status ok — no auth required.
        """
        return jsonify({'status': 'ok'}), 200

    # ── Protected Routes ──────────────────────────────────────────────

    @app.route('/api/extract', methods=['POST'])
    @require_auth
    def extract():
        """
        Receives a receipt image, runs AI extraction, returns structured JSON.

        Flow:
          1. Validate uploaded file (type and size)
          2. Try Gemini Vision extraction (ai_service.py)
          3. If Gemini fails → fallback to pytesseract OCR (ocr_fallback.py)
          4. Return extracted fields as JSON

        The image bytes are stored in Flask g so /api/submit can
        upload them to Supabase Storage without requiring a second upload.
        """
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded. Include a file in the request.'}), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({'error': 'No file selected.'}), 400

        # Validate file type
        allowed_types = {'image/jpeg', 'image/jpg', 'image/png', 'image/webp'}
        if file.content_type not in allowed_types:
            return jsonify({
                'error': f'Unsupported file type: {file.content_type}. '
                         f'Please upload a JPG, PNG, or WEBP image.'
            }), 400

        # Read file bytes
        image_bytes = file.read()

        # Validate file size (max 10MB)
        max_size = 10 * 1024 * 1024  # 10MB in bytes
        if len(image_bytes) > max_size:
            return jsonify({'error': 'File too large. Maximum size is 10MB.'}), 400

        # Store in g so submit route can access without re-upload
        g.image_bytes = image_bytes
        g.image_filename = file.filename
        g.image_content_type = file.content_type

        # Try Gemini first, fall back to OCR if it fails
        try:
            result = ai_service.extract(image_bytes)
        except Exception as gemini_error:
            print(f'[extract] Gemini failed: {gemini_error}. Trying OCR fallback...')
            try:
                result = ocr_fallback.extract(image_bytes)
            except Exception as ocr_error:
                print(f'[extract] OCR fallback also failed: {ocr_error}')
                return jsonify({
                    'error': 'Could not read this receipt. '
                             'Please try a clearer, well-lit photo.'
                }), 400

        return jsonify(result), 200

    @app.route('/api/submit', methods=['POST'])
    @require_auth
    def submit():
        """
        Validates receipt form data, uploads image to Supabase Storage,
        and inserts the record into the receipts table.

        Expects JSON body with: merchant, date, total, currency, category
        Optionally receives image_bytes via a multipart form field 'file'
        if the client sends the image again for storage.
        """
        import re

        # ── Parse request ──────────────────────────────────────────────
        # Support both JSON body and multipart form data
        if request.is_json:
            data = request.get_json()
            image_bytes = None
            image_filename = None
            image_content_type = None
        else:
            data = request.form.to_dict()
            image_file = request.files.get('file')
            if image_file:
                image_bytes = image_file.read()
                image_filename = image_file.filename
                image_content_type = image_file.content_type
            else:
                image_bytes = None
                image_filename = None
                image_content_type = None

        if not data:
            return jsonify({'error': 'Request body is empty.'}), 400

        # ── Validate required fields ───────────────────────────────────
        merchant = data.get('merchant', '').strip()
        date_str = data.get('date', '').strip()
        total_raw = data.get('total')
        currency = data.get('currency', '').strip().upper()
        category = data.get('category', 'Other').strip()

        errors = []

        if not merchant:
            errors.append('merchant is required and cannot be empty')

        if not date_str:
            errors.append('date is required')
        elif not re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
            errors.append(f'date must be in YYYY-MM-DD format, got: {date_str}')

        try:
            total = float(total_raw)
            if total < 0:
                errors.append('total must be a positive number')
        except (TypeError, ValueError):
            errors.append(f'total must be a number, got: {total_raw}')
            total = None

        if not re.match(r'^[A-Z]{3}$', currency):
            errors.append(f'currency must be 3 uppercase letters, got: {currency}')

        valid_categories = [
            'Food & Beverage', 'Groceries', 'Transport', 'Petrol & Fuel',
            'Shopping', 'Healthcare', 'Beauty & Wellness', 'Entertainment',
            'Accommodation', 'Utilities', 'Education', 'Office Supplies', 'Other'
        ]
        if category not in valid_categories:
            category = 'Other'

        if errors:
            return jsonify({'error': 'Validation failed', 'details': errors}), 400

        # ── Upload image to Supabase Storage ───────────────────────────
        image_url = None
        if image_bytes:
            try:
                extension = (image_filename or 'receipt.jpg').rsplit('.', 1)[-1].lower()
                storage_path = f"{g.user_id}/{uuid.uuid4()}.{extension}"

                supabase.storage.from_('receipts').upload(
                    path=storage_path,
                    file=image_bytes,
                    file_options={'content-type': image_content_type or 'image/jpeg'}
                )

                # Store the path — frontend can request signed URL if needed
                image_url = storage_path

            except Exception as e:
                # Non-fatal: continue without image URL if upload fails
                print(f'[submit] Image upload failed (non-fatal): {e}')

        # ── Insert into Supabase database ──────────────────────────────
        try:
            record = {
                'user_id': g.user_id,
                'merchant': merchant,
                'date': date_str,
                'total': total,
                'currency': currency,
                'category': category,
                'image_url': image_url,
                'source': data.get('source', 'gemini'),
            }

            response = supabase.table('receipts').insert(record).execute()

            if not response.data:
                return jsonify({'error': 'Failed to save receipt. Please try again.'}), 500

            saved_record = response.data[0]
            return jsonify({
                'message': 'Receipt saved successfully.',
                'id': saved_record['id']
            }), 201

        except Exception as e:
            print(f'[submit] Database insert failed: {e}')
            return jsonify({'error': 'Failed to save receipt to database.'}), 500

    @app.route('/api/history', methods=['GET'])
    @require_auth
    def history():
        """
        Returns all receipts belonging to the authenticated user,
        ordered by creation date (newest first).
        """
        try:
            response = (
                supabase.table('receipts')
                .select('id, merchant, date, total, currency, category, source, created_at, image_url')
                .eq('user_id', g.user_id)
                .order('created_at', desc=True)
                .execute()
            )

            return jsonify({'receipts': response.data or []}), 200

        except Exception as e:
            print(f'[history] Query failed: {e}')
            return jsonify({'error': 'Failed to fetch receipt history.'}), 500

    @app.route('/api/history/<record_id>', methods=['DELETE'])
    @require_auth
    def delete_history(record_id):
        """
        Deletes a receipt record. Only succeeds if the record belongs
        to the authenticated user — prevents users deleting each other's data.
        """
        try:
            # First verify the record exists and belongs to this user
            check = (
                supabase.table('receipts')
                .select('id, user_id, image_url')
                .eq('id', record_id)
                .eq('user_id', g.user_id)
                .execute()
            )

            if not check.data:
                # Either record doesn't exist or belongs to another user
                return jsonify({
                    'error': 'Record not found or you do not have permission to delete it.'
                }), 403

            record = check.data[0]

            # Delete image from Storage if it exists
            if record.get('image_url'):
                try:
                    supabase.storage.from_('receipts').remove([record['image_url']])
                except Exception as e:
                    print(f'[delete] Storage deletion failed (non-fatal): {e}')

            # Delete the database record
            supabase.table('receipts').delete().eq('id', record_id).execute()

            return jsonify({'message': 'Receipt deleted successfully.'}), 200

        except Exception as e:
            print(f'[delete] Failed: {e}')
            return jsonify({'error': 'Failed to delete receipt.'}), 500

    @app.route('/api/analytics', methods=['GET'])
    @require_auth
    def analytics():
        """
        Returns aggregated spending data for the dashboard.
        Filters receipts by period: weekly, monthly, or yearly.
        Runs 4 aggregation queries and returns combined response.
        """
        period = request.args.get('period', 'monthly').lower()

        if period not in ('weekly', 'monthly', 'yearly'):
            return jsonify({
                'error': 'Invalid period. Use weekly, monthly, or yearly.'
            }), 400

        # Calculate the start date for the requested period
        today = date.today()
        if period == 'weekly':
            period_start = today - timedelta(days=7)
        elif period == 'monthly':
            period_start = today.replace(day=1)
        else:  # yearly
            period_start = today.replace(month=1, day=1)

        period_start_str = period_start.isoformat()

        try:
            # Fetch all receipts for this user within the period
            response = (
                supabase.table('receipts')
                .select('merchant, date, total, currency, category, created_at')
                .eq('user_id', g.user_id)
                .gte('date', period_start_str)
                .order('date', desc=False)
                .execute()
            )

            receipts = response.data or []

            if not receipts:
                return jsonify({
                    'period': period,
                    'summary': {
                        'total_spent': 0,
                        'receipt_count': 0,
                        'currency': 'MYR',
                        'top_category': None
                    },
                    'by_category': [],
                    'top_merchants': [],
                    'trend': []
                }), 200

            # ── Summary ────────────────────────────────────────────────
            total_spent = sum(r['total'] for r in receipts)
            receipt_count = len(receipts)

            # Use most common currency as the display currency
            currency_counts = {}
            for r in receipts:
                c = r.get('currency', 'MYR')
                currency_counts[c] = currency_counts.get(c, 0) + 1
            display_currency = max(currency_counts, key=currency_counts.get)

            # ── By Category ────────────────────────────────────────────
            category_totals = {}
            category_counts = {}
            for r in receipts:
                cat = r.get('category', 'Other')
                category_totals[cat] = category_totals.get(cat, 0) + r['total']
                category_counts[cat] = category_counts.get(cat, 0) + 1

            by_category = sorted(
                [
                    {
                        'category': cat,
                        'total': round(category_totals[cat], 2),
                        'count': category_counts[cat]
                    }
                    for cat in category_totals
                ],
                key=lambda x: x['total'],
                reverse=True
            )

            top_category = by_category[0]['category'] if by_category else None

            # ── Top Merchants ──────────────────────────────────────────
            merchant_totals = {}
            merchant_visits = {}
            for r in receipts:
                m = r.get('merchant', 'Unknown')
                merchant_totals[m] = merchant_totals.get(m, 0) + r['total']
                merchant_visits[m] = merchant_visits.get(m, 0) + 1

            top_merchants = sorted(
                [
                    {
                        'merchant': m,
                        'total': round(merchant_totals[m], 2),
                        'visits': merchant_visits[m]
                    }
                    for m in merchant_totals
                ],
                key=lambda x: x['visits'],
                reverse=True
            )[:5]  # Top 5 only

            # ── Spending Trend ─────────────────────────────────────────
            trend_buckets = {}
            for r in receipts:
                bucket = r['date']  # Already YYYY-MM-DD from DB
                trend_buckets[bucket] = trend_buckets.get(bucket, 0) + r['total']

            trend = [
                {'date': d, 'total': round(trend_buckets[d], 2)}
                for d in sorted(trend_buckets.keys())
            ]

            return jsonify({
                'period': period,
                'summary': {
                    'total_spent': round(total_spent, 2),
                    'receipt_count': receipt_count,
                    'currency': display_currency,
                    'top_category': top_category
                },
                'by_category': by_category,
                'top_merchants': top_merchants,
                'trend': trend
            }), 200

        except Exception as e:
            print(f'[analytics] Query failed: {e}')
            return jsonify({'error': 'Failed to generate analytics.'}), 500

    return app


# Create the app instance (used by gunicorn and flask run)
app = create_app()

if __name__ == '__main__':
    debug_mode = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(host='0.0.0.0', port=5000, debug=debug_mode)
