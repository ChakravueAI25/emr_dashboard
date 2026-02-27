import pdfplumber
import pytesseract
from PIL import Image
import io
import re
import logging

# Configure Tesseract path if needed
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def parse_invoice(file_content: bytes, filename: str):
    """
    Parses an invoice file (PDF or Image) and returns a list of potential medicines.
    """
    text = ""
    file_ext = filename.split('.')[-1].lower()

    try:
        if file_ext == 'pdf':
            with pdfplumber.open(io.BytesIO(file_content)) as pdf:
                for page in pdf.pages:
                    text += page.extract_text() + "\n"
        elif file_ext in ['jpg', 'jpeg', 'png', 'bmp', 'tiff']:
            image = Image.open(io.BytesIO(file_content))
            text = pytesseract.image_to_string(image)
        else:
            return {"error": "Unsupported file format"}
            
    except Exception as e:
        logging.error(f"Error reading file: {e}")
        # Fallback for Tesseract not found error instructions if needed
        return {"error": f"Failed to read file: {str(e)}. If this is an image, ensure Tesseract OCR is installed."}

    return extract_medicines_from_text(text)

def extract_medicines_from_text(text: str):
    """
    Heuristic extraction of medicine data from raw text.
    Target fields: Name, Batch, Expiry, MRP, Purchase Price (Rate/Ptr), Quantity (Stock)
    """
    lines = text.split('\n')
    medicines = []
    
    # Common headers to locate the start of the table
    header_pattern = re.compile(r'(item|product|description|particulars|name).*(batch).*(exp|expiry).*(qty|quantity).*(mrp|rate)', re.IGNORECASE)
    
    # Heuristics for data lines
    # Look for lines that have: 
    # 1. A potential medicine name (text)
    # 2. A batch number (alphanumeric)
    # 3. A date (expiry)
    # 4. Numbers (MRP, Rate, Qty)
    
    for line in lines:
        # Skip empty lines or header lines (naive check)
        if not line.strip() or header_pattern.search(line):
            continue
            
        # Regex to find potential fields
        # Expiry: MM/YY or MM/YYYY or DD/MM/YYYY
        expiry_match = re.search(r'\b(\d{1,2}[/-]\d{2,4})\b', line)
        
        # Batch: Alphanumeric, usually 3-10 chars, often uppercase
        # We look for something that isn't a date and isn't just a number
        # Exclude common words like 'Total', 'Page', etc.
        
        # Capture numbers (for Price, Qty, MRP)
        numbers = re.findall(r'\b\d+(?:\.\d{1,2})?\b', line)
        
        # If we have at least 2 numbers (Qty + valid Price) and some text, it's a candidate
        if len(numbers) >= 2 and len(line) > 10:
            item = {}
            
            # Simple heuristic mapping based on standard invoice layouts
            # Usually: Name .... Batch .... Expiry ... Qty ... Rate ... MRP ... Amount
            
            parts = line.split()
            
            # Attempt to extract Name (Start of line until we hit numbers/dates)
            name_parts = []
            for part in parts:
                if re.match(r'^\d+(\.\d+)?$', part) or re.match(r'^\d{1,2}/\d{2,4}$', part):
                    # Stop if we hit a number or date
                    break
                name_parts.append(part)
            
            item['name'] = " ".join(name_parts)
            
            if not item['name'] or len(item['name']) < 3:
                continue

            # Batch often comes after name or before expiry
            # Let's try to grab the token after the name
            remaining_parts = parts[len(name_parts):]
            
            if expiry_match:
                item['expiry'] = expiry_match.group(1)
            
            # Identify numbers
            # If we have 3 numbers: Qty, Rate, MRP (or MRP, Rate, Qty - order varies)
            # Usually MRP > Rate. Qty is usually integer (or .0). 
            
            float_nums = []
            for num in numbers:
                 # Skip if it's the date parts (e.g. 12/2026 -> 12, 2026)
                 if expiry_match and (num in item.get('expiry', '').split('/')):
                     continue
                 try:
                     float_nums.append(float(num))
                 except:
                     pass
            
            # Guessing Logic
            if float_nums:
                # Qty is typically the smallest integer or first number
                # MRP is typically the largest number
                # Rate is the second largest or smaller than MRP
                
                # Sort descending
                float_nums.sort(reverse=True)
                
                if len(float_nums) >= 2:
                    potential_mrp = float_nums[0]
                    potential_rate = float_nums[1] if len(float_nums) > 1 else 0
                    
                    # Heuristic: MRP usually ends in .00 or similar
                    item['mrp'] = potential_mrp
                    item['purchasePrice'] = potential_rate
                    
                    # Look for Qty - often an integer
                    for n in float_nums:
                        if n.is_integer() and n < 1000 and n != potential_mrp and n != potential_rate:
                            item['stock'] = int(n)
                            break
                    if 'stock' not in item:
                         item['stock'] = 1 # Default
                
                # Attempt to find Batch in remaining tokens
                for token in remaining_parts:
                    # Skip if it is a number or date
                    if re.match(r'^\d+(\.\d+)?$', token) or (expiry_match and token in item.get('expiry', '')):
                         continue
                    # Batch is usually alphanumeric
                    if re.search(r'[A-Z0-9]{3,}', token):
                        item['batch'] = token
                        break

            # Add to list if we have at least a Name and MRP/Stock
            if 'mrp' in item:
                medicines.append(item)

    return medicines
