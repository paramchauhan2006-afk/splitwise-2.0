let geminiInstance: any = null;

export async function getGemini(): Promise<any> {
  if (!geminiInstance) {
    const { GoogleGenAI } = await import('@google/genai');
    geminiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }
  return geminiInstance;
}