import { GoogleGenAI, Type } from "@google/genai";
import { PartyPlan } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export const generatePartyPlan = async (videoTitle: string, mood: string): Promise<PartyPlan> => {
  try {
    const ai = getClient();
    
    const prompt = `Create a watch party plan for a video titled "${videoTitle}" with a "${mood}" mood.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            theme: { type: Type.STRING, description: "A creative name for the party theme" },
            suggestedActivities: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "3 fun mini-games or activities to do while watching"
            },
            snackIdeas: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 snack or drink ideas that match the theme"
            }
          },
          required: ["theme", "suggestedActivities", "snackIdeas"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as PartyPlan;

  } catch (error) {
    console.error("Gemini API Error:", error);
    // Fallback mock response if API fails or key is missing
    return {
      theme: "Chill Vibes Only (AI Unavailable)",
      suggestedActivities: ["Guess the next scene", "Drink water every time they smile", "Rate the outfits"],
      snackIdeas: ["Popcorn", "Soda", "Nachos"]
    };
  }
};