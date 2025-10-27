
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

const SYSTEM_INSTRUCTION = `You are a senior software architect and project manager for a multi-agent AI swarm. Your role is to engage in a conversation with a user to define and refine a project plan.

**Initial Interaction:**
When the user provides their first high-level project request, your primary goal is to break it down into a comprehensive plan that the AI swarm can execute. You must respond ONLY with a valid JSON object adhering to this schema: { improvedPrompt: string, agents: Agent[], tools: Tool[], agentDependencies: AgentDependency[] }. For each agent, you MUST specify which tools from the main toolkit it will use by providing a list of tool names in its 'tools' property. Crucially, you must also assess and assign a priority level ('High', 'Medium', or 'Low') to each agent based on its dependencies and impact on the overall project goal. You must provide a specific, brief justification for this priority in the 'priorityReasoning' field. Agents critical for core functionality or that unblock other agents should have a 'High' priority. Also, you MUST determine the dependencies between agents. If Agent A's output is required for Agent B to start, this means A depends on B. List these dependencies in an 'agentDependencies' array, where each object has a 'source' (agent A's name) and a 'target' (agent B's name). If there are no dependencies, provide an empty array.

**Follow-up Interactions:**
If the user provides feedback, asks for changes, or suggests new features after the initial plan is generated, you must:
1. Acknowledge their request.
2. Incorporate their feedback to create a *new, updated* project plan, re-evaluating agent priorities, their reasoning, and dependencies as needed.
3. Respond again ONLY with the updated valid JSON object adhering to the same schema.

Your final output for any planning-related message MUST be the JSON object. Do not add any conversational text outside of the JSON structure.`;

const ANALYSIS_SCHEMA = {
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
                    description: { type: Type.STRING, description: "The agent's role and responsibilities." },
                    tools: {
                        type: Type.ARRAY,
                        description: "A list of tool names this agent will use from the main toolkit.",
                        items: { type: Type.STRING }
                    },
                    priority: {
                        type: Type.STRING,
                        description: "The priority of the agent's tasks. Must be one of: 'High', 'Medium', or 'Low'."
                    },
                    priorityReasoning: {
                        type: Type.STRING,
                        description: "A specific, concise justification for the assigned priority, explaining its impact or dependencies. Example: 'High priority as it sets up the core database schema needed by other agents.'"
                    }
                },
                required: ["name", "description", "tools", "priority", "priorityReasoning"]
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
        },
        agentDependencies: {
            type: Type.ARRAY,
            description: "A list of dependencies between agents. A dependency from 'source' to 'target' means the source agent requires the target agent's output to begin its work.",
            items: {
                type: Type.OBJECT,
                properties: {
                    source: { type: Type.STRING, description: "The name of the agent that depends on the target." },
                    target: { type: Type.STRING, description: "The name of the agent being depended upon." }
                },
                required: ["source", "target"]
            }
        }
    },
    required: ["improvedPrompt", "agents", "tools", "agentDependencies"]
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
Based on the initial mission objective, the final results from the agent swarm, and a summary of tool usage, generate a concise report.
The report MUST be a single, valid JSON object following the provided schema.
Analyze the results and tool usage to determine the overall outcome, summarize what was accomplished, create relevant KPIs, and provide recommendations.
Be insightful and critical in your analysis. Your recommendations should consider the effectiveness of tool usage.`;

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
                    count: { type: Type.INTEGER, description: "Number of times the tool was used by agents." }
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
    
    **Agent Roster:** ${analysisResult.agents.map(a => `${a.name} (Priority: ${a.priority})`).join(', ')}

    **Tool Usage Summary:**
    ${toolUsage.length > 0 ? JSON.stringify(toolUsage, null, 2) : "No tools were used by the swarm."}

    **Final Swarm Results:**
    ${JSON.stringify(formattedResponses, null, 2)}

    Please generate the executive summary based on these results.
    `;

    let attempt = 0;
    while (true) {
        try {
            const response = await ai.models.generateContent({
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
