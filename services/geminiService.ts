import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResult } from "../types";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}
  
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Helper for retry logic ---
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isRetryableError = (error: any): boolean => {
    const message = String(error?.message || '').toLowerCase();
    // Check for common transient error statuses and messages
    return message.includes('503') || message.includes('unavailable') || 
           message.includes('500') || message.includes('internal');
};


export async function* generateSingleResponse(
    prompt: string, 
    model: string,
    maxRetries = 5,
    initialDelay = 1000
): AsyncGenerator<string> {
    let attempt = 0;
    while (true) {
        try {
            const responseStream = await ai.models.generateContentStream({
                model: model,
                contents: prompt,
            });

            for await (const chunk of responseStream) {
                // It's possible for a chunk to not have text.
                if (chunk.text) {
                    yield chunk.text;
                }
            }
            return; // Success, exit the loop
        } catch (error) {
            attempt++;
            if (attempt >= maxRetries || !isRetryableError(error)) {
                console.error(`Gemini API Stream Error (Attempt ${attempt}/${maxRetries}): Not retrying.`, error);
                if (error instanceof Error) {
                    throw error;
                }
                throw new Error('An unknown error occurred during API stream.');
            }
            const delay = initialDelay * Math.pow(2, attempt - 1) + (Math.random() * 1000); // Add jitter
            console.warn(`Gemini API Stream failed (attempt ${attempt}/${maxRetries}). Retrying in ${Math.round(delay/1000)}s...`);
            await sleep(delay);
        }
    }
};


export const analyzeAndImprovePrompt = async (
    userPrompt: string,
    maxRetries = 5,
    initialDelay = 1000
): Promise<AnalysisResult> => {
    const systemInstruction = `You are a senior software architect and project planner for a multi-agent AI swarm. Your goal is to analyze a user's high-level project request and break it down into a comprehensive plan that the AI swarm can execute.

You must:
1.  Create an "improvedPrompt": A detailed, clear, and actionable prompt for a code-generation AI. This prompt should expand on the user's original idea, specifying technologies, features, and structure.
2.  Define "agents": A list of specialized AI agents that will collaborate to build the project. For each agent, provide a name and a description of its role and responsibilities.
3.  Define "tools": A list of tools or capabilities these agents would need. For each tool, provide a name and a description of its function.

Respond ONLY with a valid JSON object that adheres to the provided schema.`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            improvedPrompt: {
                type: Type.STRING,
                description: "A detailed and improved prompt for the code generation swarm."
            },
            agents: {
                type: Type.ARRAY,
                description: "A list of specialized AI agents for the project.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "The name of the agent (e.g., 'FrontendDeveloper')." },
                        description: { type: Type.STRING, description: "The agent's role and responsibilities." }
                    },
                    required: ["name", "description"]
                }
            },
            tools: {
                type: Type.ARRAY,
                description: "A list of tools or capabilities needed by the agents.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "The name of the tool (e.g., 'FileWriteTool')." },
                        description: { type: Type.STRING, description: "The function of the tool." }
                    },
                    required: ["name", "description"]
                }
            }
        },
        required: ["improvedPrompt", "agents", "tools"]
    };

    let attempt = 0;
    while (true) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: userPrompt,
                config: {
                    systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: schema,
                },
            });
            
            const jsonText = response.text.trim();
            const result = JSON.parse(jsonText);
            return result; // Success, return result

        } catch (error) {
            attempt++;
            if (attempt >= maxRetries || !isRetryableError(error)) {
                console.error(`Gemini Analysis API Error (Attempt ${attempt}/${maxRetries}): Not retrying.`, error);
                if (error instanceof Error) {
                    throw new Error(`Failed to analyze prompt: ${error.message}`);
                }
                throw new Error('An unknown error occurred during prompt analysis.');
            }
            const delay = initialDelay * Math.pow(2, attempt - 1) + (Math.random() * 1000); // Add jitter
            console.warn(`Gemini Analysis API failed (attempt ${attempt}/${maxRetries}). Retrying in ${Math.round(delay/1000)}s...`);
            await sleep(delay);
        }
    }
};