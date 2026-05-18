import os
import jwt
from jwt import PyJWKClient
from functools import wraps
from flask import request, jsonify, g

# Cached JWKS client — fetches Supabase public keys once and reuses them.
# Supabase now issues ES256 (asymmetric) JWTs by default; older projects used HS256.
_jwks_client = None


def _get_jwks_client():
    global _jwks_client
    if _jwks_client is None:
        supabase_url = os.getenv('SUPABASE_URL', '').rstrip('/')
        # Strip /rest/v1 suffix if present — we need the base project URL
        if '/rest/v1' in supabase_url:
            supabase_url = supabase_url.split('/rest/v1')[0]
        jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url)
    return _jwks_client


def require_auth(f):
    """
    Decorator that verifies the Supabase JWT on every protected route.
    On success: attaches g.user_id (UUID string) for use in route handlers.
    On failure: returns 401 JSON error immediately.

    Supports both HS256 (legacy Supabase projects) and ES256 (current default).
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')

        if not auth_header.startswith('Bearer '):
            return jsonify({
                'error': 'Missing or invalid Authorization header. '
                         'Expected: Authorization: Bearer <token>'
            }), 401

        token = auth_header.split(' ', 1)[1].strip()

        try:
            jwt_secret = os.getenv('SUPABASE_JWT_SECRET')
            if not jwt_secret:
                return jsonify({'error': 'Server misconfiguration: JWT secret missing'}), 500

            # Peek at the token header to determine signing algorithm
            unverified_header = jwt.get_unverified_header(token)
            alg = unverified_header.get('alg', 'HS256')

            if alg == 'HS256':
                payload = jwt.decode(
                    token,
                    jwt_secret,
                    algorithms=['HS256'],
                    audience='authenticated'
                )
            else:
                # ES256 or other asymmetric algorithm — verify via JWKS public key
                jwks_client = _get_jwks_client()
                signing_key = jwks_client.get_signing_key_from_jwt(token)
                payload = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=['ES256', 'RS256'],
                    audience='authenticated'
                )

            user_id = payload.get('sub')
            if not user_id:
                return jsonify({'error': 'Invalid token: user ID not found'}), 401

            g.user_id = user_id

        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired. Please sign in again.'}), 401
        except jwt.InvalidAudienceError:
            return jsonify({'error': 'Invalid token audience.'}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({'error': f'Invalid token: {str(e)}'}), 401
        except Exception as e:
            return jsonify({'error': f'Token verification failed: {str(e)}'}), 401

        return f(*args, **kwargs)

    return decorated
