

import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResult, ExecutiveSummary, ResponseItem } from "../types";
import type { Chat } from "@google/genai";


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
           message.includes('500') || message.includes('internal') ||
           message.includes('rate limit');
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

const SYSTEM_INSTRUCTION = `You are a senior software architect and project manager for a multi-agent AI system. Your role is to break down a user's high-level project request into a detailed, executable plan.

**Your Goal:**
When the user provides a request, you must decompose it into a series of small, discrete, and logically ordered tasks. Your response MUST ONLY be a valid JSON object adhering to this schema: { improvedPrompt: string, tasks: Task[], tools: Tool[] }.

**Task Breakdown Rules:**
1.  **Task ID:** Each task MUST have a unique integer \`id\`, starting from 0.
2.  **Dependencies:** For each task, you MUST identify its dependencies. The \`dependencies\` field must be an array of \`id\`s of other tasks that must be completed *before* this task can start. If a task has no dependencies, provide an empty array \`[]\`.
3.  **Simplicity:** Tasks should be simple and focused on a single responsibility.
4.  **Priority:** Assign a priority ('High', 'Medium', or 'Low') based on its criticality to the project's completion and its position in the dependency chain. Provide a brief justification in \`priorityReasoning\`. Tasks on the critical path should be 'High'.
5.  **Tools:** Assign the necessary tools for each task from the main \`tools\` list.

**Follow-up Interactions:**
If the user provides feedback or asks for changes, you must regenerate the *entire* task plan, re-evaluating all tasks, dependencies, and priorities. Your response must always be the complete, valid JSON object. Do not add any conversational text outside the JSON structure.`;

const ANALYSIS_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        improvedPrompt: {
            type: Type.STRING,
            description: "A detailed and improved prompt for the swarm to execute."
        },
        tasks: {
            type: Type.ARRAY,
            description: "A list of discrete, executable tasks for the project.",
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.INTEGER, description: "A unique integer ID for the task, starting from 0." },
                    name: { type: Type.STRING, description: "A short, descriptive name for the task (e.g., 'SetupDatabaseSchema')." },
                    description: { type: Type.STRING, description: "The detailed instructions for the agent assigned to this task." },
                    tools: {
                        type: Type.ARRAY,
                        description: "A list of tool names this task requires from the main toolkit.",
                        items: { type: Type.STRING }
                    },
                    dependencies: {
                        type: Type.ARRAY,
                        description: "An array of task IDs that must be completed before this task can start.",
                        items: { type: Type.INTEGER }
                    },
                    priority: {
                        type: Type.STRING,
                        description: "The priority of the task. Must be one of: 'High', 'Medium', or 'Low'."
                    },
                    priorityReasoning: {
                        type: Type.STRING,
                        description: "A specific, concise justification for the assigned priority."
                    }
                },
                required: ["id", "name", "description", "tools", "dependencies", "priority", "priorityReasoning"]
            }
        },
        tools: {
            type: Type.ARRAY,
            description: "A list of tools or capabilities needed by the tasks.",
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
    required: ["improvedPrompt", "tasks", "tools"]
};


export const createProjectManagerChat = (model: string): Chat => {
    return ai.chats.create({
        model: model,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: ANALYSIS_SCHEMA,
        },
    });
};

export const askProjectManager = async (
    chat: Chat,
    message: string,
    maxRetries = 5,
    initialDelay = 1000
): Promise<AnalysisResult> => {
    let attempt = 0;
    while (true) {
        try {
            const response = await chat.sendMessage({ message });
            const jsonText = response.text.trim();

            // Sanitize the response to ensure it's valid JSON
            let cleanJsonText = jsonText;
            if (cleanJsonText.startsWith('```json')) {
                cleanJsonText = cleanJsonText.substring(7);
            }
            if (cleanJsonText.endsWith('```')) {
                cleanJsonText = cleanJsonText.slice(0, -3);
            }

            const result = JSON.parse(cleanJsonText);
            return result; // Success, return result

        } catch (error) {
            attempt++;
            if (attempt >= maxRetries || !isRetryableError(error)) {
                console.error(`Gemini Chat API Error (Attempt ${attempt}/${maxRetries}): Not retrying.`, error);
                if (error instanceof Error) {
                    throw new Error(`Failed to get plan from Project Manager: ${error.message}`);
                }
                throw new Error('An unknown error occurred during project planning.');
            }
            const delay = initialDelay * Math.pow(2, attempt - 1) + (Math.random() * 1000); // Add jitter
            console.warn(`Gemini Chat API failed (attempt ${attempt}/${maxRetries}). Retrying in ${Math.round(delay/1000)}s...`);
            await sleep(delay);
        }
    }
};


const SUMMARY_SYSTEM_INSTRUCTION = `You are an AI Project Manager providing a post-mission executive summary.
Based on the initial mission objective, the final results from the task orchestrator, and a summary of tool usage, generate a concise yet comprehensive report.
The report MUST be a single, valid JSON object following the provided schema.

**Your analysis must be insightful and critical:**
- **Overall Outcome:** Determine this based on the number of successful vs. failed tasks.
- **Summary:** Briefly narrate what the system attempted to do and what it achieved. Mention any significant failures.
- **KPIs:** Generate at least 3 relevant KPIs. Examples include: 'Success Rate' (percentage of successful tasks), 'Error Rate', or 'Tool Efficiency' (comment on if tools were used effectively).
- **Tool Usage:** Your analysis here should go beyond just counts. Comment on whether the right tools were used for the tasks.
- **Recommendations:** Provide specific, actionable next steps. If the mission failed, suggest what to fix. If it succeeded, suggest potential enhancements or next projects. Your recommendations should directly correlate with the mission's outcome and your analysis.`;

const SUMMARY_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        overallOutcome: { type: Type.STRING, description: "The final verdict of the mission. (e.g., 'Success', 'Partial Success', 'Failure')." },
        summary: { type: Type.STRING, description: "A narrative summary of what was accomplished, including successes and failures." },
        kpis: {
            type: Type.ARRAY,
            description: "A list of Key Performance Indicators.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "Name of the KPI (e.g., 'Success Rate')." },
                    value: { type: Type.STRING, description: "Value of the KPI (e.g., '90%')." },
                    description: { type: Type.STRING, description: "Brief explanation of the KPI." }
                },
                required: ["name", "value", "description"]
            }
        },
        toolUsage: {
            type: Type.ARRAY,
            description: "An analysis of which tools were used and their frequency.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "Name of the tool used." },
                    count: { type: Type.INTEGER, description: "Number of times the tool was used." }
                },
                required: ["name", "count"]
            }
        },
        recommendations: { type: Type.STRING, description: "Actionable next steps or suggestions for improvement." }
    },
    required: ["overallOutcome", "summary", "kpis", "toolUsage", "recommendations"]
};


export const generateExecutiveSummary = async (
    analysisResult: AnalysisResult,
    responses: ResponseItem[],
    maxRetries = 3,
    initialDelay = 1000
): Promise<ExecutiveSummary> => {
    const formattedResponses = responses.map(r => ({
        id: r.id,
        taskName: analysisResult.tasks.find(t => t.id === r.id)?.name || 'Unknown Task',
        status: r.status,
        // Truncate content to keep the prompt manageable
        output_snippet: r.status === 'success' ? r.content?.substring(0, 200) + '...' : undefined,
        error: r.error
    }));

    const toolUsageCounts: Record<string, number> = {};
    for (const response of responses) {
        if (response.toolUsed) {
            toolUsageCounts[response.toolUsed] = (toolUsageCounts[response.toolUsed] || 0) + 1;
        }
    }
    const toolUsage = Object.entries(toolUsageCounts).map(([name, count]) => ({ name, count }));

    const prompt = `
    **Mission Objective:** ${analysisResult.improvedPrompt}
    
    **Task Roster:** ${analysisResult.tasks.map(t => `${t.name} (Priority: ${t.priority})`).join(', ')}

    **Tool Usage Summary:**
    ${toolUsage.length > 0 ? JSON.stringify(toolUsage, null, 2) : "No tools were used."}

    **Final Task Results:**
    ${JSON.stringify(formattedResponses, null, 2)}

    Please generate the executive summary based on these results.
    `;

    let attempt = 0;
    while (true) {
        try {
            const response = await ai.models.generateContent({
// FIX: Use correct model name for gemini pro.
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: {
                    systemInstruction: SUMMARY_SYSTEM_INSTRUCTION,
                    responseMimeType: 'application/json',
                    responseSchema: SUMMARY_SCHEMA
                }
            });

            const jsonText = response.text.trim();
            const result = JSON.parse(jsonText);
            return result;

        } catch (error) {
            attempt++;
            if (attempt >= maxRetries || !isRetryableError(error)) {
                console.error(`Gemini Summary API Error (Attempt ${attempt}/${maxRetries}): Not retrying.`, error);
                if (error instanceof Error) {
                    throw new Error(`Failed to generate executive summary: ${error.message}`);
                }
                throw new Error('An unknown error occurred during summary generation.');
            }
            const delay = initialDelay * Math.pow(2, attempt - 1) + (Math.random() * 1000); // Add jitter
            console.warn(`Gemini Summary API failed (attempt ${attempt}/${maxRetries}). Retrying in ${Math.round(delay/1000)}s...`);
            await sleep(delay);
        }
    }
};