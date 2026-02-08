import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import axios from "axios";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/ocr", async (req, res) => {
    try {
      const { image } = req.body;

      if (!image) {
        return res.status(400).json({ error: "Image data is required" });
      }

      const apiKey = process.env.VISION_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Vision API key not configured" });
      }

      // Prepare payload for Google Vision API
      // Remove data:image/jpeg;base64, prefix if present
      const base64Content = image.replace(/^data:image\/\w+;base64,/, "");

      const visionPayload = {
        requests: [
          {
            image: {
              content: base64Content
            },
            features: [
              {
                type: "TEXT_DETECTION"
              }
            ]
          }
        ]
      };

      const visionResponse = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        visionPayload
      );

      const detections = visionResponse.data.responses[0].fullTextAnnotation;
      const text = detections ? detections.text : "";

      res.json({ text });
    } catch (error: any) {
      console.error("OCR Error:", error.response?.data || error.message);
      res.status(500).json({ 
        error: "Failed to process image", 
        details: error.response?.data?.error?.message || error.message 
      });
    }
  });

  return httpServer;
}
