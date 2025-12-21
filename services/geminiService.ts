import { GoogleGenAI } from "@google/genai";
import { SupportGroup, SearchFilters, SortOption, MeetingType, CostFilter } from "../types";

// Helper to generate a unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

export const searchSupportGroups = async (
  topic: string,
  location: string,
  filters: SearchFilters,
  sortBy: SortOption
): Promise<SupportGroup[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set the API_KEY environment variable.");
  }

  const ai = new GoogleGenAI({ apiKey });

  let criteria = `Find mental health support groups for "${topic}" in "${location}".`;
  
  if (filters.meetingType === MeetingType.ONLINE) {
    criteria += " MUST be Online/Virtual.";
  } else if (filters.meetingType === MeetingType.IN_PERSON) {
    criteria += " MUST be In-Person.";
  }

  if (filters.cost === CostFilter.FREE) {
    criteria += " Prefer Free/Non-profit.";
  }

  const prompt = `
    ${criteria}
    
    Exclude: IOP, PHP, Residential, Rehab.
    Focus: Peer support, Community groups, Group therapy.

    Use Google Search to find 5 active groups.
    Return ONLY a raw JSON array. No markdown.
    
    JSON Fields:
    - name: string
    - description: short string (max 12 words)
    - location: string (address or "Online")
    - schedule: string (e.g. "Mon 7pm" or "Varies")
    - phoneNumber: string (Find a contact number if possible, else null)
    - url: string (The specific URL found in the search results. Do not guess.)
    - sourceName: string (e.g. "NAMI", "Psychology Today")
    - rating: number (Optional: 1-5 stars if visible in search, else null)
    - reviewCount: number (Optional: count of reviews if visible, else null)
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const textResponse = response.text || "";
    
    // Extract verified URLs from grounding metadata
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const verifiedUrls = new Set<string>();
    
    groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
            verifiedUrls.add(chunk.web.uri);
        }
    });

    const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
    const cleanJson = jsonMatch 
      ? jsonMatch[0] 
      : textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let parsedData: any[] = [];
    try {
      parsedData = JSON.parse(cleanJson);
    } catch (e) {
      console.error("JSON Parse Error", e);
      return [];
    }

    if (!Array.isArray(parsedData)) return [];

    return parsedData.map((item: any) => {
      let finalUrl: string | null = null;
      let isFallback = false;

      // Clean the model's URL
      let modelUrl = item.url ? item.url.trim() : null;
      
      // Filter out internal redirects or malformed urls
      if (modelUrl && (modelUrl.includes('grounding-api-redirect') || modelUrl.startsWith('/'))) {
          modelUrl = null;
      }

      // STRATEGY 1: EXACT MATCH (Highest Confidence)
      if (modelUrl && verifiedUrls.has(modelUrl)) {
          finalUrl = modelUrl;
      }

      // STRATEGY 2: DOMAIN MATCH RECOVERY (Medium Confidence)
      if (!finalUrl && modelUrl) {
          try {
             // Handle www. prefix consistently
             const cleanHost = (url: string) => new URL(url).hostname.replace(/^www\./, '');
             const modelHost = cleanHost(modelUrl);
             
             // Find any verified URL that shares this host
             const bestMatch = Array.from(verifiedUrls).find(vUrl => {
                 try {
                     return cleanHost(vUrl) === modelHost;
                 } catch { return false; }
             });

             if (bestMatch) {
                 finalUrl = bestMatch;
             }
          } catch (e) {
             // Invalid model URL format, proceed to fallback
          }
      }

      // STRATEGY 3: FALLBACK (Lowest Confidence)
      if (!finalUrl) {
          const searchQuery = `${item.name} ${topic} support group ${location}`;
          finalUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
          isFallback = true;
      }

      return {
        id: generateId(),
        name: item.name || "Support Group",
        description: item.description || "Support community.",
        location: item.location || location,
        topic: topic,
        url: finalUrl,
        phoneNumber: item.phoneNumber,
        schedule: item.schedule,
        sourceName: item.sourceName || "Web",
        isFallbackUrl: isFallback,
        rating: item.rating || undefined,
        reviewCount: item.reviewCount || undefined
      };
    });

  } catch (error) {
    console.error("Search Error:", error);
    throw error;
  }
};