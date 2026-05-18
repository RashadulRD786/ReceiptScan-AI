import os
from flask import Flask, jsonify, g
from flask_cors import CORS
from dotenv import load_dotenv

from middleware.auth import require_auth

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

    # ── Protected Route Stubs ─────────────────────────────────────────
    # These return placeholder responses for now.
    # Full implementation added in Phase 3 (AI service) and Phase 4 (routes).

    @app.route('/api/extract', methods=['POST'])
    @require_auth
    def extract():
        """
        POST /api/extract
        Accepts receipt image, runs AI extraction pipeline.
        Full implementation: Phase 3
        """
        return jsonify({
            'message': 'extract stub — implementation in Phase 3',
            'user_id': g.user_id
        }), 200

    @app.route('/api/submit', methods=['POST'])
    @require_auth
    def submit():
        """
        POST /api/submit
        Validates and saves extracted receipt data to Supabase.
        Full implementation: Phase 4
        """
        return jsonify({
            'message': 'submit stub — implementation in Phase 4',
            'user_id': g.user_id
        }), 200

    @app.route('/api/history', methods=['GET'])
    @require_auth
    def history():
        """
        GET /api/history
        Returns all receipts for the authenticated user.
        Full implementation: Phase 4
        """
        return jsonify({
            'message': 'history stub — implementation in Phase 4',
            'user_id': g.user_id
        }), 200

    @app.route('/api/history/<record_id>', methods=['DELETE'])
    @require_auth
    def delete_history(record_id):
        """
        DELETE /api/history/<id>
        Deletes a specific receipt record owned by the authenticated user.
        Full implementation: Phase 4
        """
        return jsonify({
            'message': f'delete stub for record {record_id} — Phase 4',
            'user_id': g.user_id
        }), 200

    @app.route('/api/analytics', methods=['GET'])
    @require_auth
    def analytics():
        """
        GET /api/analytics?period=weekly|monthly|yearly
        Returns aggregated spending data for the dashboard.
        Full implementation: Phase 4
        """
        return jsonify({
            'message': 'analytics stub — implementation in Phase 4',
            'user_id': g.user_id
        }), 200

    return app


# Create the app instance (used by gunicorn and flask run)
app = create_app()

if __name__ == '__main__':
    debug_mode = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(host='0.0.0.0', port=5000, debug=debug_mode)
