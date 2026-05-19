import io
import re

import pytesseract
from PIL import Image, ImageEnhance, ImageFilter, ImageOps


# ── Image Preprocessing for OCR ───────────────────────────────────────────────

def preprocess_for_ocr(image_bytes: bytes) -> Image.Image:
    """
    Aggressive preprocessing for pytesseract.
    Tesseract needs high-resolution, high-contrast, clean black-on-white
    text to perform reliably. This pipeline applies significantly stronger
    processing than the Gemini pipeline.
    """
    img = Image.open(io.BytesIO(image_bytes))

    # Convert to RGB first for consistent processing
    if img.mode not in ('RGB', 'L'):
        img = img.convert('RGB')

    # Upscale: Tesseract works best at 300+ DPI equivalent
    # Ensure the longest side is at least 1800px
    w, h = img.size
    min_size = 1800
    if max(w, h) < min_size:
        ratio = min_size / max(w, h)
        img = img.resize(
            (int(w * ratio), int(h * ratio)),
            Image.LANCZOS
        )

    # Convert to grayscale
    img = img.convert('L')

    # Step 1: Auto-contrast to stretch the histogram
    # cutoff=2 removes the darkest/lightest 2% of pixels (handles shadows)
    img = ImageOps.autocontrast(img, cutoff=2)

    # Step 2: Aggressive contrast enhancement
    img = ImageEnhance.Contrast(img).enhance(2.5)

    # Step 3: Sharpen to make text edges crisper
    img = img.filter(ImageFilter.SHARPEN)
    img = img.filter(ImageFilter.SHARPEN)  # Apply twice for stronger effect

    # Step 4: Final brightness adjustment to push background to white
    img = ImageEnhance.Brightness(img).enhance(1.1)

    return img


# ── Date Normalisation ────────────────────────────────────────────────────────

def normalise_date(date_str: str) -> str:
    """
    Converts various date formats found by regex into YYYY-MM-DD.
    Assumes DD/MM convention for Malaysian receipts where ambiguous.
    """
    # Already ISO YYYY-MM-DD
    if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
        return date_str

    # DD/MM/YYYY
    m = re.match(r'^(\d{1,2})/(\d{2})/(\d{4})$', date_str)
    if m:
        d, mo, y = m.groups()
        return f"{y}-{mo.zfill(2)}-{d.zfill(2)}"

    # DD-MM-YYYY
    m = re.match(r'^(\d{1,2})-(\d{2})-(\d{4})$', date_str)
    if m:
        d, mo, y = m.groups()
        return f"{y}-{mo.zfill(2)}-{d.zfill(2)}"

    # DD/MM/YY or DD-MM-YY (2-digit year)
    m = re.match(r'^(\d{1,2})[/-](\d{2})[/-](\d{2})$', date_str)
    if m:
        d, mo, y = m.groups()
        return f"20{y}-{mo.zfill(2)}-{d.zfill(2)}"

    # YYYY/MM/DD
    m = re.match(r'^(\d{4})/(\d{2})/(\d{2})$', date_str)
    if m:
        y, mo, d = m.groups()
        return f"{y}-{mo}-{d}"

    # Month name: "15 May 2026" or "May 15 2026"
    month_map = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
        'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
        'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    }
    m = re.match(r'^(\d{1,2})\s+([A-Za-z]{3})\w*\s+(\d{4})$', date_str)
    if m:
        d, mon, y = m.groups()
        mo = month_map.get(mon.lower()[:3], '01')
        return f"{y}-{mo}-{d.zfill(2)}"

    return date_str  # Return as-is if no pattern matched


# ── Receipt Text Parser ───────────────────────────────────────────────────────

def parse_receipt_text(text: str) -> dict:
    """
    Extracts key fields from raw OCR text using regex patterns.
    Designed around real Malaysian receipt layouts.

    All fields are returned with low confidence since OCR has no
    contextual understanding — the frontend will show all pickers.
    """
    lines = [line.strip() for line in text.split('\n') if line.strip()]

    # ── Merchant ──────────────────────────────────────────────────
    # Usually the first meaningful line that is not pure numbers/symbols
    merchant = ''
    for line in lines[:6]:
        # Skip lines that are only numbers, dashes, or very short
        if len(line) > 3 and not re.match(r'^[\d\s\-\./]+$', line):
            merchant = line
            break

    # ── Date ──────────────────────────────────────────────────────
    date = ''
    date_patterns = [
        r'\b(\d{4}-\d{2}-\d{2})\b',                              # YYYY-MM-DD
        r'\b(\d{1,2}/\d{2}/\d{4})\b',                            # D/MM/YYYY
        r'\b(\d{1,2}-\d{2}-\d{4})\b',                            # D-MM-YYYY
        r'\b(\d{1,2}/\d{2}/\d{2})\b',                            # D/MM/YY
        r'\b(\d{1,2}-\d{2}-\d{2})\b',                            # D-MM-YY
        r'\b(\d{4}/\d{2}/\d{2})\b',                              # YYYY/MM/DD
        r'\b(\d{1,2}\s+[A-Za-z]{3}\w*\s+\d{4})\b',              # 15 May 2026
    ]

    for line in lines:
        for pattern in date_patterns:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                date = normalise_date(match.group(1))
                break
        if date:
            break

    # ── Total ─────────────────────────────────────────────────────
    # Skip lines mentioning cash/change/tender — find final payable total
    total = None
    skip_keywords = ['CASH', 'CHANGE', 'BAKI', 'TUNAI', 'TENDER', 'PAYMENT', 'PAID']

    # Priority: NET TOTAL, GRAND TOTAL, TOTAL PAYABLE, JUMLAH BESAR
    priority_patterns = [
        r'(?:NET\s+TOTAL|GRAND\s+TOTAL|TOTAL\s+PAYABLE|NETT\s+AMOUNT|'
        r'JUMLAH\s+BESAR|TOTAL\s+AMOUNT)[^\d]*(\d+[\.,]\d{2})',
    ]
    fallback_patterns = [
        r'(?:TOTAL|JUMLAH)[^\d]*(\d+[\.,]\d{2})',
    ]

    def try_patterns(patterns):
        for line in lines:
            if any(kw in line.upper() for kw in skip_keywords):
                continue
            for pattern in patterns:
                m = re.search(pattern, line, re.IGNORECASE)
                if m:
                    try:
                        # Handle both comma and dot as decimal separator
                        num_str = m.group(1).replace(',', '.')
                        return float(num_str)
                    except ValueError:
                        continue
        return None

    total = try_patterns(priority_patterns) or try_patterns(fallback_patterns)

    # ── Currency ──────────────────────────────────────────────────
    currency = 'MYR'  # Default for Malaysian context
    currency_confidence = 'low'
    full_text_upper = text.upper()

    if 'RM' in full_text_upper or 'MYR' in full_text_upper:
        currency = 'MYR'
        currency_confidence = 'high'
    elif 'SGD' in full_text_upper or 'S$' in full_text_upper:
        currency = 'SGD'
        currency_confidence = 'high'
    elif 'USD' in full_text_upper or 'US$' in full_text_upper:
        currency = 'USD'
        currency_confidence = 'high'
    elif '£' in full_text_upper or 'GBP' in full_text_upper:
        currency = 'GBP'
        currency_confidence = 'high'
    elif '€' in full_text_upper or 'EUR' in full_text_upper:
        currency = 'EUR'
        currency_confidence = 'high'

    return {
        'merchant': merchant or 'Unknown Merchant',
        'date': date or '',
        'total': total or 0.0,
        'currency': currency,
        'category': 'Other',
        'date_confidence': 'low',
        'currency_confidence': currency_confidence,
    }


# ── Main Extraction Function ──────────────────────────────────────────────────

def extract(image_bytes: bytes) -> dict:
    """
    OCR fallback extraction path using pytesseract.

    Applies aggressive image preprocessing, extracts raw text with
    Tesseract, then uses regex parsing to find key fields.

    All confidence values are set to "low" because OCR has no
    contextual understanding — the frontend will always show
    date pickers and currency dropdowns for OCR results.

    Returns a dict with source: "ocr_fallback".
    """
    pil_image = preprocess_for_ocr(image_bytes)

    # Tesseract config: PSM 6 = assume a single uniform block of text
    # OEM 3 = default engine (LSTM neural net)
    custom_config = r'--oem 3 --psm 6'
    raw_text = pytesseract.image_to_string(pil_image, config=custom_config)

    result = parse_receipt_text(raw_text)
    result['source'] = 'ocr_fallback'
    result['date_confidence'] = 'low'
    result['currency_confidence'] = 'low'

    return result
