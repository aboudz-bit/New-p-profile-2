// OCR Service using Real Backend Proxy
import axios from "axios";

export interface ExtractedProduct {
  id: number;
  name: string;
  category: string;
  price?: number;
  selected: boolean;
  sku?: string;
  rawText?: string;
  warrantyRaw?: string;
}

export interface ExtractionResult {
  merchant?: string;
  date?: string;
  total?: number;
  currency?: string;
  products: ExtractedProduct[];
  rawText: string;
  confidence: number;
}

// Convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const simulateOCR = async (file: File): Promise<ExtractionResult> => {
  try {
    const base64Image = await fileToBase64(file);
    
    // Call our secure backend proxy
    const response = await axios.post("/api/ocr", { image: base64Image });
    const rawText = response.data.text;
    
    // DEBUG: Log the full text from Vision API
    console.log("--- GOOGLE VISION RAW TEXT START ---");
    console.log(rawText);
    console.log("--- GOOGLE VISION RAW TEXT END ---");

    if (!rawText) {
      throw new Error("No text detected");
    }

    const cleanedText = cleanText(rawText);
    const products = detectProducts(cleanedText);
    
    // Attempt to parse metadata (simple heuristics)
    const merchant = parseMerchant(rawText);
    const date = parseDate(rawText);
    const total = parseTotal(rawText);
    
    // FORCE RESULT: If parsing failed but we have text, return a fallback item
    if (products.length === 0 && rawText.length > 20) {
        console.warn("Structured parsing returned 0 products. Using fallback.");
        const fallbackLines = cleanedText.split('\n').filter(l => l.length > 5).slice(0, 3);
        const fallbackName = fallbackLines.join(' ');
        
        products.push({
            id: Math.random(),
            name: fallbackName || "Unknown Item",
            price: total || 0,
            category: "Uncategorized",
            selected: true,
            sku: "UNKNOWN",
            warrantyRaw: "Check Invoice"
        });
    }

    return {
      merchant,
      date,
      total,
      currency: "SR",
      products,
      rawText,
      confidence: products.length > 0 ? 0.8 : 0.1
    };
  } catch (error) {
    console.error("OCR Service Error:", error);
    // Return empty result to trigger fallback UI
    return {
      products: [],
      rawText: "",
      confidence: 0
    };
  }
};

// --- Parsing Helpers ---

// 2. TEXT CLEANING
const cleanText = (text: string): string => {
  const lines = text.split('\n');
  const cleanLines = lines.filter(line => {
    const lower = line.toLowerCase();
    if (lower.includes('terms & conditions')) return false;
    if (lower.includes('return policy')) return false;
    if (lower.includes('privacy policy')) return false;
    if (lower.includes('customer service')) return false;
    if (lower.includes('visit www')) return false;
    if (lower.includes('thank you for shopping')) return false;
    if (lower.includes('goods can be returned')) return false;
    if (lower.includes('original invoice required')) return false;
    return true;
  });
  return cleanLines.join('\n');
};

// 3. PRODUCT DETECTION LOGIC (Optimized for eXtra / Saudi Invoices)
const detectProducts = (text: string): ExtractedProduct[] => {
  const products: ExtractedProduct[] = [];
  const lines = text.split('\n');
  
  // Regex to detect the start of a line item (Item Code + Description Start)
  // eXtra invoices often start with 6-digit item code
  // Example: 00192837 iPhone 15 Pro Max ...
  const itemStartRegex = /^(\d{6,14})\s+(.*)/;
  
  // Regex to detect price lines (Price + SR/SAR usually at end or near end)
  // eXtra format often: Qty UnitPrice TotalPrice (or similar columns)
  // We look for the final price which is usually the largest number with 2 decimals
  const priceLineRegex = /(\d+)\s+([\d,]+\.\d{2})\s*(SR|SAR|RS)?/i;

  let currentProduct: Partial<ExtractedProduct> | null = null;
  let bufferDescription: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check if this line starts a NEW item
    const startMatch = line.match(itemStartRegex);
    
    // Check if this line contains the PRICE/TOTAL (terminator for the item)
    // We check for price specifically to know when the item block ends
    const priceMatch = line.match(priceLineRegex);

    if (startMatch) {
        // If we were already tracking a product, save it first (unless it was just a fragment)
        if (currentProduct) {
             finalizeProduct(currentProduct, bufferDescription, products);
        }

        // Start new product
        currentProduct = {
            id: Math.random(),
            sku: startMatch[1],
            selected: true,
            category: "Electronics" // Default
        };
        bufferDescription = [startMatch[2].trim()]; // Start description with the rest of the line

        // If the start line ALSO contains the price (single line item), parse it immediately
        if (priceMatch) {
            // Extract price from the match (usually the last capturing group with decimals)
            const priceStr = priceMatch[2].replace(/,/g, '');
            currentProduct.price = parseFloat(priceStr);
            
            // Clean the price/qty numbers out of the description buffer
            // This is a heuristic: remove the price string from description if present
            bufferDescription[0] = bufferDescription[0].replace(priceMatch[0], '').trim();
            
            // finalize immediately
            finalizeProduct(currentProduct, bufferDescription, products);
            currentProduct = null;
            bufferDescription = [];
        }

    } else if (currentProduct) {
        // We are inside a product block
        
        // If we hit a price line that wasn't on the start line
        if (priceMatch) {
             const priceStr = priceMatch[2].replace(/,/g, '');
             currentProduct.price = parseFloat(priceStr);
             
             // Sometimes price line also has text? rarely. 
             // We treat this as the end of the item.
             finalizeProduct(currentProduct, bufferDescription, products);
             currentProduct = null;
             bufferDescription = [];
        } else {
             // It's a description continuation line
             // Stop if we hit keywords like "Total", "VAT", "Discount" which signal end of list
             if (line.match(/^(Total|Subtotal|VAT|Discount|Amount)/i)) {
                 finalizeProduct(currentProduct, bufferDescription, products);
                 currentProduct = null;
                 bufferDescription = [];
             } else {
                 // Clean garbage
                 if (line.length > 2 && !line.match(/^[\d\s]+$/)) {
                     bufferDescription.push(line);
                 }
             }
        }
    }
  }

  // Finalize last item if exists
  if (currentProduct) {
      finalizeProduct(currentProduct, bufferDescription, products);
  }

  return products;
};

const finalizeProduct = (
    product: Partial<ExtractedProduct>, 
    descriptionLines: string[], 
    products: ExtractedProduct[]
) => {
    // Merge description lines
    let fullDescription = descriptionLines.join(' ');
    
    // Extract warranty if present in the full text
    let warrantyRaw = undefined;
    
    // Check for warranty in specific lines or full text
    // We iterate lines to find the specific warranty line to keep it clean
    const warrantyLineIndex = descriptionLines.findIndex(l => containsWarrantyInfo(l));
    if (warrantyLineIndex !== -1) {
        warrantyRaw = descriptionLines[warrantyLineIndex];
        // Remove warranty line from description
        descriptionLines.splice(warrantyLineIndex, 1);
        fullDescription = descriptionLines.join(' ');
    }

    product.name = fullDescription;
    product.warrantyRaw = warrantyRaw;

    // Run standard cleaner
    const cleaned = cleanProductData(product as ExtractedProduct);
    
    // Only add if it looks valid
    if (cleaned.name && cleaned.name.length > 3) {
        products.push(cleaned);
    }
};

// Helper: Check if string contains warranty keywords
const containsWarrantyInfo = (str: string): boolean => {
    const lower = str.toLowerCase();
    return lower.includes('warranty') || 
           lower.includes('months') || 
           lower.includes('years') || 
           lower.includes('year') || 
           lower.includes('month') || 
           lower.includes('ضمان') ||
           lower.includes('سنة') ||
           lower.includes('شهر');
};

// Helper: Clean final product name
const cleanProductData = (product: ExtractedProduct): ExtractedProduct => {
    let name = product.name;
    
    const warrantyRegex = /\s*(?:Warranty|ضمان|Cover|Duration)[:\s]+.*/i;
    const match = name.match(warrantyRegex);
    if (match) {
        product.warrantyRaw = match[0].trim();
        name = name.replace(warrantyRegex, '');
    }

    name = name.replace(/\b(Warranty|Months|Years|Year|Month|ضمان)\b/gi, '').trim();
    name = name.replace(/\s+/g, ' ').trim();
    
    return {
        ...product,
        name
    };
};

// --- Basic Metadata Parsers ---

const parseMerchant = (text: string): string => {
  const lower = text.toLowerCase();
  if (lower.includes('extra') || lower.includes('united electronics')) return 'eXtra';
  if (lower.includes('jarir')) return 'Jarir Bookstore';
  if (lower.includes('amazon')) return 'Amazon';
  if (lower.includes('noon')) return 'Noon';
  return 'Unknown Merchant';
};

const parseDate = (text: string): string => {
  const dateRegex = /(\d{2}[\/\-]\d{2}[\/\-]\d{4})/;
  const match = text.match(dateRegex);
  return match ? match[1] : new Date().toLocaleDateString();
};

const parseTotal = (text: string): number => {
  // Look for "Total" followed by number
  const totalRegex = /Total.*?\s+([\d,]+\.\d{2})/i;
  const match = text.match(totalRegex);
  return match ? parseFloat(match[1].replace(/,/g, '')) : 0;
};
