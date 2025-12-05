import 'dotenv/config';
import { GoogleGenAI } from "@google/genai";

const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: key });

const models = ['gemini-flash-latest'];

async function test() {
    for (const model of models) {
        console.log(`Testing ${model} with tools + JSON...`);
        try {
            const res = await ai.models.generateContent({
                model: model,
                contents: "Find the CEO of Apple and return JSON: {\"ceo\": \"name\"}",
                config: {
                    responseMimeType: "application/json",
                    tools: [{ googleSearch: {} }]
                }
            });
            console.log(`[SUCCESS] ${model} supports JSON + Tools. Response:`, res.text);
        } catch (e: any) {
            console.log(`[FAIL] ${model}: ${e.message || e}`);
        }
    }
}

test();
