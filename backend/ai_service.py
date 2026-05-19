import os
import io
import json
import time
import re

import google.generativeai as genai
from PIL import Image, ImageEnhance
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini with API key from environment
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAYS = [1, 2, 4]  # seconds between attempts

# Valid expense categories
VALID_CATEGORIES = [
    'Food & Beverage', 'Groceries', 'Transport', 'Petrol & Fuel',
    'Shopping', 'Healthcare', 'Beauty & Wellness', 'Entertainment',
    'Accommodation', 'Utilities', 'Education', 'Office Supplies', 'Other'
]

# ── Extraction Prompt ─────────────────────────────────────────────────────────
EXTRACTION_PROMPT = """
You are an expert receipt analyst with deep knowledge of receipt
formats from around the world. You read receipts carefully and
methodically before extracting any data.

STEP 1 — READ AND UNDERSTAND THE RECEIPT FIRST:
Before extracting anything, read the entire receipt like a human
would. Identify:
  - The type of receipt (restaurant, retail, transport, etc.)
  - The language(s) used on the receipt
  - Where the merchant name appears (header, logo, top lines)
  - Where the transaction date appears
  - Where the FINAL total appears — this is the amount the customer
    owes or paid, NOT:
      × The subtotal before tax
      × The tax amount
      × The cash amount tendered by the customer
      × The change returned to the customer
      × Any rounding adjustment (e.g. 0.02 sen rounding in Malaysia)
  - What currency is used (from symbols, context, or language)

STEP 2 — EXTRACT AND NORMALISE:
Extract exactly these fields:

merchant:
  The official business or store name.
  Scan the ENTIRE receipt — do not limit search to the header.
  Check these areas in order of priority:
    1. Header or top section (most common location)
    2. Any field labelled "Store Name:", "Merchant:", "Outlet:",
       "Business:" appearing anywhere on the receipt
    3. Brand name or logo text visible on the receipt
    4. Address block (business name often precedes the address)
    5. Footer lines such as "Thank you for visiting [Name]"
  Use the most official, recognisable business name found.
  If both a brand name (e.g. "Pizza Hut") and a legal entity
  name (e.g. "PHD Delivery Sdn Bhd") are present, prefer
  the brand name — it is more useful to the user.

date:
  The transaction date. Receipts print dates in many formats.
  Your job is to READ the format as written, UNDERSTAND it in
  context, and ALWAYS output in YYYY-MM-DD regardless of input.

  Formats you will encounter (non-exhaustive):
    DD-MM-YYYY   →  "15-05-2026"  →  output "2026-05-15"
    DD/MM/YYYY   →  "15/05/2026"  →  output "2026-05-15"
    MM/DD/YYYY   →  "05/15/2026"  →  output "2026-05-15"
    DD MMM YYYY  →  "15 May 2026" →  output "2026-05-15"
    YYYY-MM-DD   →  already ISO   →  output as-is
    DD-MM-YY     →  "15-05-26"    →  interpret year as 2026

  For ambiguous numeric formats (e.g. "03/04/26" — day-first or
  month-first?), resolve using context clues in this order:
    1. Country/region indicated by address or language on receipt
    2. Currency (e.g. MYR receipt → Malaysia → DD/MM/YY convention)
    3. Logical plausibility (e.g. month "13" is impossible → other
       number must be the month)
    4. If still genuinely uncertain after all context: pick the most
       plausible interpretation AND set date_confidence to "low"

  Set date_confidence to "high" when date is unambiguously stated.
  Set date_confidence to "low" ONLY when the format is genuinely
  ambiguous after applying all context clues above. Most receipts
  will have high confidence — low should be the exception.

total:
  The final amount charged to the customer.
  This is the bottom-line payable total — the number just above
  or beside labels like "TOTAL", "JUMLAH", "合計", "AMOUNT DUE",
  "TOTAL AMOUNT", "NET TOTAL".
  Output as a plain number (e.g. 15.90), never as a string.

currency:
  The 3-letter ISO 4217 currency code.
  Infer from symbols and context:
    RM or MYR → MYR
    $ (in Malaysian context) → MYR
    $ (in US context) → USD
    $ (in Singapore context) → SGD
    £ → GBP
    € → EUR
    ¥ → JPY or CNY (use address/language to distinguish)
  If currency is truly unidentifiable → "UNKNOWN"
  Set currency_confidence to "low" if inferred rather than explicit.

category:
  Infer the expense category from the merchant name, receipt
  type, and items purchased. Choose exactly one from this list:

    Food & Beverage   — restaurants, cafes, mamak, fast food, dine-in
    Groceries         — supermarkets, mini marts, convenience stores
    Transport         — ride-hailing, taxi, bus, train, parking, toll
    Petrol & Fuel     — petrol stations (Shell, Petronas, BHP, etc.)
    Shopping          — clothing, electronics, general retail
    Healthcare        — pharmacy, clinic, hospital, dental
    Beauty & Wellness — salon, spa, gym, personal care products
    Entertainment     — movies, events, karaoke, theme parks, games
    Accommodation     — hotels, Airbnb, serviced apartments
    Utilities         — telco, electricity, water, internet bills
    Education         — books, tuition fees, courses, stationery
    Office Supplies   — printing, office equipment, business expenses
    Other             — anything that does not fit the above

  Use your full understanding of the merchant and receipt content.
  Do not default to Other unless genuinely no other category fits.

date_confidence:
  "high" if the date is clearly and unambiguously stated.
  "low" if the date format is ambiguous or partially legible.

currency_confidence:
  "high" if currency is explicitly stated on the receipt.
  "low" if it was inferred from context.

STEP 3 — VALIDATE BEFORE RETURNING:
Check every field before outputting:
  ✓ total is a number, not a string
  ✓ date is exactly YYYY-MM-DD format
  ✓ currency is exactly 3 uppercase letters (or "UNKNOWN")
  ✓ merchant is not empty or null
  ✓ total is NOT the change amount, cash tendered, or rounding adj
  ✓ category is exactly one value from the allowed list
If any check fails: re-read the receipt and correct before output.

FINAL OUTPUT:
Return ONLY this JSON object. No markdown. No explanation.
No additional keys. No text before or after the JSON.

{
  "merchant": "string",
  "date": "YYYY-MM-DD",
  "total": number,
  "currency": "string",
  "category": "string",
  "date_confidence": "high" or "low",
  "currency_confidence": "high" or "low"
}
"""


# ── Image Preprocessing for Gemini ───────────────────────────────────────────

def preprocess_for_gemini(image_bytes: bytes) -> Image.Image:
    """
    Gentle preprocessing for Gemini Vision.
    Resizes to max 1200px and applies mild contrast boost.
    Returns a PIL Image (Gemini accepts PIL Images directly).
    """
    img = Image.open(io.BytesIO(image_bytes))

    # Convert RGBA or P mode to RGB
    if img.mode in ('RGBA', 'P', 'LA'):
        img = img.convert('RGB')
    elif img.mode != 'RGB':
        img = img.convert('RGB')

    # Resize: max 1200px on longest side, preserve aspect ratio
    max_dimension = 1200
    w, h = img.size
    if max(w, h) > max_dimension:
        ratio = max_dimension / max(w, h)
        img = img.resize(
            (int(w * ratio), int(h * ratio)),
            Image.LANCZOS
        )

    # Mild contrast enhancement (1.2 = subtle, not aggressive)
    img = ImageEnhance.Contrast(img).enhance(1.2)

    return img


# ── Field Validation ──────────────────────────────────────────────────────────

def validate_fields(data: dict) -> dict:
    """
    Validates and cleans all 7 fields from Gemini's response.
    Raises ValueError if a critical field is invalid.
    Corrects minor issues (category fallback) rather than raising.
    """
    required = ['merchant', 'date', 'total', 'currency', 'category',
                'date_confidence', 'currency_confidence']
    for field in required:
        if field not in data:
            raise ValueError(f"Missing required field in Gemini response: '{field}'")

    # merchant: non-empty string
    if not data['merchant'] or not isinstance(data['merchant'], str):
        raise ValueError("Field 'merchant' must be a non-empty string")

    # date: must be YYYY-MM-DD
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', str(data['date'])):
        raise ValueError(f"Field 'date' must be YYYY-MM-DD, got: {data['date']}")

    # total: must be numeric
    try:
        data['total'] = float(data['total'])
    except (TypeError, ValueError):
        raise ValueError(f"Field 'total' must be a number, got: {data['total']}")

    # currency: must be 3 uppercase letters or UNKNOWN
    if not re.match(r'^[A-Z]{3}$', str(data['currency'])):
        raise ValueError(f"Field 'currency' must be 3 uppercase letters, got: {data['currency']}")

    # category: fallback to Other if unrecognised
    if data['category'] not in VALID_CATEGORIES:
        data['category'] = 'Other'

    # confidence values: default to "low" if not valid
    if data['date_confidence'] not in ('high', 'low'):
        data['date_confidence'] = 'low'
    if data['currency_confidence'] not in ('high', 'low'):
        data['currency_confidence'] = 'low'

    return data


# ── Main Extraction Function ──────────────────────────────────────────────────

def extract(image_bytes: bytes) -> dict:
    """
    Primary extraction path using Google Gemini Vision.

    Preprocesses the image, sends it to Gemini with the two-phase
    prompt, parses the JSON response, and validates all fields.

    Retries up to MAX_RETRIES times on rate limit errors.
    Raises an exception on non-recoverable errors so the caller
    (Flask route) can trigger the OCR fallback.

    Returns a validated dict with source: "gemini".
    """
    pil_image = preprocess_for_gemini(image_bytes)
    model = genai.GenerativeModel('gemini-2.5-flash')

    last_error = None

    for attempt in range(MAX_RETRIES):
        try:
            response = model.generate_content(
                [pil_image, EXTRACTION_PROMPT],
                generation_config=genai.GenerationConfig(
                    temperature=0.1,   # Low temperature = consistent structured output
                    max_output_tokens=2048
                )
            )

            raw_text = response.text.strip()

            # Strip markdown fences if Gemini wraps JSON in them
            if '```json' in raw_text:
                raw_text = raw_text.split('```json', 1)[1].split('```', 1)[0].strip()
            elif '```' in raw_text:
                raw_text = raw_text.split('```', 1)[1].split('```', 1)[0].strip()

            # Parse JSON
            data = json.loads(raw_text)

            # Validate all fields
            validated = validate_fields(data)
            validated['source'] = 'gemini'
            return validated

        except json.JSONDecodeError as e:
            last_error = ValueError(f"Gemini returned invalid JSON: {e}. Raw: {raw_text[:200]}")
            # JSON errors are not retryable — break immediately
            break

        except Exception as e:
            error_str = str(e).lower()
            is_rate_limit = any(
                keyword in error_str
                for keyword in ['429', 'quota', 'rate_limit', 'resource exhausted', 'too many']
            )

            if is_rate_limit and attempt < MAX_RETRIES - 1:
                wait_time = RETRY_DELAYS[attempt]
                print(f"[ai_service] Rate limit on attempt {attempt + 1}. "
                      f"Waiting {wait_time}s before retry...")
                time.sleep(wait_time)
                last_error = e
                continue

            last_error = e
            break

    # All attempts failed — raise so caller can use OCR fallback
    raise Exception(f"Gemini extraction failed after {MAX_RETRIES} attempts: {last_error}")
