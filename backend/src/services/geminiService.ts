import { GoogleGenerativeAI } from '@google/generative-ai';
import ENV from '../config/env';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY || '');

// We use the Gemini 1.5 Flash model which supports multimodal input and structured JSON output
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export interface GeminiMeasurement {
  itemCode: string;
  description: string;
  category: string;
  length: number;
  breadth: number;
  depth: number;
  quantity: number;
  unit: string;
  materials: string;
}

export async function analyzeImageWithGemini(
  imageBuffer: Buffer,
  mimeType: string = 'image/jpeg'
): Promise<GeminiMeasurement[]> {
  if (!ENV.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }

  const prompt = `
You are an expert Civil Engineer and Quantity Surveyor.
Analyze this construction site image and extract detailed measurement information for the MBook (Measurement Book).
If the image shows rebar/steel, concrete, brickwork, pipes, or any other construction materials or elements, carefully estimate their dimensions and quantities.

Provide the result as a JSON array of objects with the following keys exactly:
- "itemCode": A string representing a plausible CPWD DSR code (e.g., "6.1.1" for steel, "4.1.8" for concrete slab, "17.1.1" for pipes).
- "description": A highly detailed string describing the item (e.g., "TMT Fe-500D rebar", "RCC M-30 column").
- "category": A string category (e.g., "steel", "concrete", "masonry", "plumbing", "woodwork").
- "length": Estimated length in meters (number).
- "breadth": Estimated breadth/width in meters (number). If not applicable, use 0.
- "depth": Estimated depth/height in meters (number). If not applicable, use 0.
- "quantity": The calculated quantity based on dimensions. (For steel, estimate the weight in Kg. For concrete, volume in Cum. For pipes, length in Rmt).
- "unit": The unit of measurement (e.g., "Kg", "Cum", "Sqm", "Rmt", "Nos").
- "materials": A string describing the material used (e.g., "Steel", "Cement", "Wood").

Return ONLY the raw JSON array. Do not include any markdown formatting like \`\`\`json.
  `;

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType,
        },
      },
    ]);

    const responseText = result.response.text();
    // Clean up potential markdown formatting if Gemini still includes it
    const cleanedText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    const measurements: GeminiMeasurement[] = JSON.parse(cleanedText);
    return measurements;
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('Failed to analyze image with Gemini Vision API');
  }
}
