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

    if (!rawText) {
      throw new Error("No text detected");
    }

    const cleanedText = cleanText(rawText);
    const products = detectProducts(cleanedText);
    
    // Attempt to parse metadata (simple heuristics)
    const merchant = parseMerchant(rawText);
    const date = parseDate(rawText);
    const total = parseTotal(rawText);

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

// 3. PRODUCT DETECTION LOGIC
const detectProducts = (text: string): ExtractedProduct[] => {
  const products: ExtractedProduct[] = [];
  const lines = text.split('\n');
  
  let currentProduct: Partial<ExtractedProduct> | null = null;
  
  // Matches: ItemCode (6-12 digits) ... Price (digits.digits) ... Currency (SR/SAR optional)
  // Heuristic optimized for eXtra/Saudi invoices
  const itemLineRegex = /^(\d{6,14})\s+(.+?)\s+(\d+)\s+([\d,]+\.\d{2})/;
  
  for (const line of lines) {
    const match = line.trim().match(itemLineRegex);
    
    if (match) {
      if (currentProduct && currentProduct.name) {
        products.push(cleanProductData(currentProduct as ExtractedProduct));
      }
      
      const priceStr = match[4].replace(/,/g, '');
      
      currentProduct = {
        id: Math.random(),
        sku: match[1],
        name: match[2].trim(),
        price: parseFloat(priceStr),
        category: "Electronics",
        selected: true,
      };
    } else if (currentProduct) {
      // Continuation lines
      const isContinuation = line.trim().length > 0 && !line.includes('SR') && !line.match(/^\d/);
      
      if (isContinuation) {
        if (!line.toLowerCase().includes('total') && !line.toLowerCase().includes('vat')) {
             const trimmedLine = line.trim();
             if (containsWarrantyInfo(trimmedLine)) {
                 currentProduct.warrantyRaw = trimmedLine;
             } else if (currentProduct.name) {
                 currentProduct.name += " " + trimmedLine;
             }
        }
      } else if (line.trim() === '' || line.includes('------')) {
        if (currentProduct && currentProduct.name) {
           products.push(cleanProductData(currentProduct as ExtractedProduct));
           currentProduct = null;
        }
      }
    }
  }

  if (currentProduct?.name) {
    products.push(cleanProductData(currentProduct as ExtractedProduct));
  }

  return products;
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
