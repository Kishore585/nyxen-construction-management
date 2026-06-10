import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import path from 'path';

// Define the 10 MBook classes the model was trained on
const CLASSES = ['wall', 'column', 'beam', 'slab', 'foundation', 'door', 'window', 'staircase', 'pipe', 'rebar'];

// Load the model locally from the repo
const MODEL_PATH = path.resolve(__dirname, '../models/ai/best.onnx');

// Singleton session to avoid reloading the model on every request
let session: ort.InferenceSession | null = null;

async function getSession() {
  if (!session) {
    try {
      session = await ort.InferenceSession.create(MODEL_PATH);
      console.log('✅ YOLO ONNX Model loaded successfully.');
    } catch (error) {
      console.error('❌ Failed to load YOLO ONNX Model:', error);
      throw error;
    }
  }
  return session;
}

export interface YOLOBox {
  x: number;
  y: number;
  w: number;
  h: number;
  confidence: number;
  classId: number;
  className: string;
}

export async function detectObjects(imageBuffer: Buffer): Promise<YOLOBox[]> {
  try {
    const sess = await getSession();
    
    // 1. Preprocess Image (YOLOv8 expects 1x3x640x640 float32 normalized 0-1)
    const { data, info } = await sharp(imageBuffer)
      .resize(640, 640, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const float32Data = new Float32Array(3 * 640 * 640);
    // Convert HWC to CHW and normalize
    for (let i = 0; i < 640 * 640; i++) {
      float32Data[i] = data[i * 3] / 255.0;                   // R
      float32Data[640 * 640 + i] = data[i * 3 + 1] / 255.0;       // G
      float32Data[2 * 640 * 640 + i] = data[i * 3 + 2] / 255.0;   // B
    }

    const tensor = new ort.Tensor('float32', float32Data, [1, 3, 640, 640]);

    // 2. Run Inference
    const results = await sess.run({ images: tensor });
    const output = results['output0'].data as Float32Array;

    // 3. Postprocess Output (1x14x8400) -> 14 = 4 box + 10 classes
    const boxes: YOLOBox[] = [];
    const numAnchors = 8400;
    
    for (let i = 0; i < numAnchors; i++) {
      let maxClassProb = 0;
      let classId = -1;
      
      // Find highest class probability
      for (let c = 0; c < 10; c++) {
        const prob = output[(4 + c) * numAnchors + i];
        if (prob > maxClassProb) {
          maxClassProb = prob;
          classId = c;
        }
      }

      // Confidence threshold
      if (maxClassProb > 0.25) {
        const x = output[0 * numAnchors + i];
        const y = output[1 * numAnchors + i];
        const w = output[2 * numAnchors + i];
        const h = output[3 * numAnchors + i];
        
        boxes.push({
          x, y, w, h,
          confidence: maxClassProb,
          classId,
          className: CLASSES[classId]
        });
      }
    }

    // 4. Non-Maximum Suppression (NMS)
    return applyNMS(boxes, 0.45);
  } catch (err) {
    console.error("YOLO Inference Error:", err);
    return [];
  }
}

function applyNMS(boxes: YOLOBox[], iouThreshold: number): YOLOBox[] {
  // Sort by confidence descending
  boxes.sort((a, b) => b.confidence - a.confidence);
  const result: YOLOBox[] = [];

  for (const box of boxes) {
    let keep = true;
    for (const resBox of result) {
      if (box.classId === resBox.classId && calculateIoU(box, resBox) > iouThreshold) {
        keep = false;
        break;
      }
    }
    if (keep) {
      result.push(box);
    }
  }
  return result;
}

function calculateIoU(box1: YOLOBox, box2: YOLOBox): number {
  const x1 = Math.max(box1.x - box1.w / 2, box2.x - box2.w / 2);
  const y1 = Math.max(box1.y - box1.h / 2, box2.y - box2.h / 2);
  const x2 = Math.min(box1.x + box1.w / 2, box2.x + box2.w / 2);
  const y2 = Math.min(box1.y + box1.h / 2, box2.y + box2.h / 2);

  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const area1 = box1.w * box1.h;
  const area2 = box2.w * box2.h;
  return intersection / (area1 + area2 - intersection);
}
