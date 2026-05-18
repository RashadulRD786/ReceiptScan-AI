import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL is not set in .env")
if not SUPABASE_SERVICE_KEY:
    raise ValueError("SUPABASE_SERVICE_KEY is not set in .env")

# Single client instance — reused across all requests
# Uses service role key: bypasses RLS for server-side operations
# This key must NEVER be sent to the frontend
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
