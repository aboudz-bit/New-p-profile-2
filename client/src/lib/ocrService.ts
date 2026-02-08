// Simulation of OCR and Text Processing Logic
// In a real app, this would happen on the server or via a dedicated OCR library (Tesseract.js, Google Cloud Vision, etc.)

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

// Simulated raw text from a Saudi invoice (e.g., eXtra)
const EXTRA_INVOICE_TEXT = `
eXtra
United Electronics Co.
VAT No: 300057034600003
Invoice No: 1045293842
Date: 12/01/2024 Time: 18:30
Store: Riyadh - Olaya

----------------------------------------
Item Code      Description       Qty    Unit Price    Gross Amount
----------------------------------------
100348291      iPhone 15 Pro     1      4,699.00      4,699.00 SR
               Max 256GB Blue
               Warranty: 24 Months
               
200192834      Apple 20W USB-C   1      99.00         99.00 SR
               Power Adapter
               
Terms & Conditions:
1. Goods can be returned within 7 days.
2. Original invoice required.
3. Box must be unopened.
Visit www.extra.com for full policy.
Customer Service: 920004123
----------------------------------------
Total (Inc VAT):                 4,798.00 SR
VAT (15%):                       625.82 SR
Net Amount:                      4,172.18 SR
----------------------------------------
Paid by: Mada ending 1234
Thank you for shopping at eXtra
`;

const NOISY_INVOICE_TEXT = `
Riyadh Supermarket
Date: 10/10/2023
Items:
Milk - 10 SR
Bread - 5 SR
Total: 15 SR
...
(Low quality scan, noise, blurry text)
`;

export const simulateOCR = async (file: File): Promise<ExtractionResult> => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Determine if we should simulate a successful high-quality scan or a failed/noisy one
  // For demo purposes, we can toggle this based on file name or random, 
  // but let's default to success for the "Happy Path" and have a fallback trigger available.
  
  // Logic: Real text extraction would happen here.
  // We will simulate "Text Cleaning" and "Product Detection" on the mock text.
  
  const rawText = EXTRA_INVOICE_TEXT;
  
  const cleanedText = cleanText(rawText);
  const products = detectProducts(cleanedText);
  
  const merchant = "eXtra"; // Inferred from header
  const date = "2024-01-12"; // Inferred
  const total = 4798.00; // Inferred

  return {
    merchant,
    date,
    total,
    currency: "SR",
    products,
    rawText,
    confidence: products.length > 0 ? 0.9 : 0.2
  };
};

// 2. TEXT CLEANING
// Remove sections containing T&C, Privacy, Returns, etc.
const cleanText = (text: string): string => {
  const lines = text.split('\n');
  const cleanLines = lines.filter(line => {
    const lower = line.toLowerCase();
    // Filter out common policy and footer noise
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
  
  // Regex to identify line items (Simplified for simulation)
  // Looks for: ItemCode (digits) ... Price (digits.digits) ... Currency (SR/SAR)
  // This is a heuristic.
  const itemLineRegex = /^(\d{6,12})\s+(.+?)\s+(\d+)\s+([\d,]+\.\d{2})/;
  
  for (const line of lines) {
    const match = line.trim().match(itemLineRegex);
    
    if (match) {
      // Found a new product line
      if (currentProduct && currentProduct.name) {
        products.push(cleanProductData(currentProduct as ExtractedProduct));
      }
      
      const priceStr = match[4].replace(/,/g, '');
      
      currentProduct = {
        id: Math.random(), // Temp ID
        sku: match[1],
        name: match[2].trim(), // Initial name capture
        price: parseFloat(priceStr),
        category: "Electronics", // Default inference
        selected: true,
      };
    } else if (currentProduct) {
      // Check if this is a continuation line (description wrapping)
      // Continuation lines usually have indentation or lack numerical structure of a new item
      const isContinuation = line.trim().length > 0 && !line.includes('SR') && !line.match(/^\d/);
      
      if (isContinuation) {
        // Append to description if it doesn't look like a footer/total line
        if (!line.toLowerCase().includes('total') && !line.toLowerCase().includes('vat')) {
             const trimmedLine = line.trim();
             // Heuristic: If line contains warranty keywords, treat as warranty info, not name
             if (containsWarrantyInfo(trimmedLine)) {
                 currentProduct.warrantyRaw = trimmedLine;
             } else if (currentProduct.name) {
                 currentProduct.name += " " + trimmedLine;
             }
        }
      } else if (line.trim() === '' || line.includes('------')) {
        // End of product block
        if (currentProduct && currentProduct.name) {
           products.push(cleanProductData(currentProduct as ExtractedProduct));
           currentProduct = null;
        }
      }
    }
  }

  // Push last product if exists
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
    
    // If name contains warranty info inline (not on separate line), try to split it
    // Regex for common warranty patterns at end of string
    const warrantyRegex = /\s*(?:Warranty|ضمان|Cover|Duration)[:\s]+.*/i;
    const match = name.match(warrantyRegex);
    if (match) {
        product.warrantyRaw = match[0].trim();
        name = name.replace(warrantyRegex, '');
    }

    // Explicit cleanup of keywords if they persist
    name = name.replace(/\b(Warranty|Months|Years|Year|Month|ضمان)\b/gi, '').trim();
    
    // Remove extra spaces
    name = name.replace(/\s+/g, ' ').trim();
    
    return {
        ...product,
        name
    };
};
