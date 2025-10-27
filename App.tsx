
import React, { useState, useCallback, useRef, useEffect } from 'react';
import ProjectManagerChat from './components/ProjectManagerChat';
import ResultsDisplay from './components/ResultsDisplay';
import { generateSingleResponse, createProjectManagerChat, askProjectManager, generateExecutiveSummary } from './services/geminiService';
import { ResponseItem, ResponseStatus, AnalysisResult, ChatMessage } from './types';
import type { Chat } from '@google/genai';


function App() {
  const [model, setModel] = useState<string>('gemini-2.5-flash');
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [isSwarming, setIsSwarming] = useState<boolean>(false);
  
  // State for analysis and chat
  const chatSessionRef = useRef<Chat | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      role: 'model',
      content: 'Welcome! I am your AI Project Manager. Please describe the high-level goal of the project you want to build.'
    }
  ]);
  const [isModelThinking, setIsModelThinking] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [swarmError, setSwarmError] = useState<string | null>(null);
  const [swarmJustCompleted, setSwarmJustCompleted] = useState<boolean>(false);
  const [executionPhase, setExecutionPhase] = useState<string | null>(null);

  const handleReset = useCallback(() => {
    setAnalysisResult(null);
    setAnalysisError(null);
    setSwarmError(null);
    setResponses([]);
    setIsSwarming(false);
    chatSessionRef.current = null;
    setChatHistory([
      {
        role: 'model',
        content: 'Welcome! I am your AI Project Manager. Please describe the high-level goal of the project you want to build.'
      }
    ]);
    setIsModelThinking(false);
    setSwarmJustCompleted(false);
    setExecutionPhase(null);
  }, []);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!message || isModelThinking || isSwarming) return;

    setChatHistory(prev => [...prev, { role: 'user', content: message }]);
    setIsModelThinking(true);
    setAnalysisError(null);
    setSwarmError(null);
    setResponses([]);

    try {
      if (!chatSessionRef.current) {
        chatSessionRef.current = createProjectManagerChat();
      }
      
      const result = await askProjectManager(chatSessionRef.current, message);
      setAnalysisResult(result);
      setChatHistory(prev => [...prev, { role: 'model', content: result }]);

    } catch (error: any) {
      const errorMessage = error.message || 'An unknown error occurred during analysis. Check the console.';
      setAnalysisError(errorMessage);
      setChatHistory(prev => [...prev, { role: 'model', content: `Analysis Failed: ${errorMessage}` }]);
    } finally {
      setIsModelThinking(false);
    }
  }, [isModelThinking, isSwarming]);


  const processStream = useCallback(async (responseItem: ResponseItem) => {
    if (!analysisResult) return;

    // Direct mapping of responseItem.id to agent index
    const agentDef = analysisResult.agents[responseItem.id];
    if (!agentDef) {
        setResponses(prev => prev.map(r => r.id === responseItem.id ? { ...r, status: ResponseStatus.ERROR, error: `Agent definition for ID ${responseItem.id} not found.` } : r));
        return;
    }
    
    // Create a specific prompt for this agent
    const agentSpecificPrompt = `**Overall Mission:**\n${analysisResult.improvedPrompt}\n\n---\n\n**Your Role (${agentDef.name}):**\n${agentDef.description}\n\n**Your Priority:** ${agentDef.priority} (${agentDef.priorityReasoning})\n\n**Tools available to you:**\n${agentDef.tools && agentDef.tools.length > 0 ? agentDef.tools.join(', ') : 'None'}\n\n---\n\nNow, please execute your task based on your role and the overall mission. Provide your output below.`;

    let activeTool: string | null = null;
    try {
      // Simulate tool activation
      const agentTools = agentDef.tools || [];
      if (agentTools.length > 0) {
          activeTool = agentTools[Math.floor(Math.random() * agentTools.length)];
          setResponses(prev => prev.map(r => r.id === responseItem.id ? { ...r, activeTool } : r));
      }

      const stream = generateSingleResponse(agentSpecificPrompt, model);
      for await (const chunk of stream) {
        setResponses(prev =>
          prev.map(r =>
            r.id === responseItem.id
              ? { ...r, content: (r.content || '') + chunk }
              : r
          )
        );
      }
      setResponses(prev =>
        prev.map(r =>
          r.id === responseItem.id
            ? { ...r, status: ResponseStatus.SUCCESS, activeTool: null, toolUsed: activeTool ?? undefined }
            : r
        )
      );
    } catch (error: any) {
      setResponses(prev =>
        prev.map(r =>
          r.id === responseItem.id
            ? { ...r, status: ResponseStatus.ERROR, error: error.stack || error.message || 'An unknown stream error occurred', activeTool: null, toolUsed: activeTool ?? undefined }
            : r
        )
      );
    }
  }, [analysisResult, model]);


  const handleLaunchSwarm = useCallback(async () => {
    if (!analysisResult || isSwarming) return;

    setIsSwarming(true);
    setSwarmError(null);
    const swarmSize = analysisResult.agents.length;
    const initialResponses: ResponseItem[] = Array.from({ length: swarmSize }, (_, i) => ({
      id: i,
      status: ResponseStatus.PENDING,
      content: '', // Initialize with empty string for streaming
      activeTool: null,
    }));
    setResponses(initialResponses);

    try {
        const agentsWithResponses = initialResponses.map(responseItem => ({
            responseItem,
            agentDef: analysisResult.agents[responseItem.id]
        }));

        const highPriority = agentsWithResponses.filter(a => a.agentDef.priority === 'High');
        const mediumPriority = agentsWithResponses.filter(a => a.agentDef.priority === 'Medium');
        const lowPriority = agentsWithResponses.filter(a => a.agentDef.priority === 'Low');

        const runBatch = async (batch: typeof agentsWithResponses) => {
            const promises = batch.map(item => processStream(item.responseItem));
            await Promise.allSettled(promises);
        };

        if (highPriority.length > 0) {
            setExecutionPhase('Executing HIGH priority agents...');
            await runBatch(highPriority);
        }
        if (mediumPriority.length > 0) {
            setExecutionPhase('Executing MEDIUM priority agents...');
            await runBatch(mediumPriority);
        }
        if (lowPriority.length > 0) {
            setExecutionPhase('Executing LOW priority agents...');
            await runBatch(lowPriority);
        }

    } catch (error: any) {
      setSwarmError(error.message || 'An unexpected error occurred while launching the swarm. Please try again.');
    } finally {
      setIsSwarming(false);
      setSwarmJustCompleted(true);
      setExecutionPhase(null);
    }
  }, [analysisResult, isSwarming, processStream]);


  const handleRetryAgent = useCallback(async (agentId: number) => {
    if (isSwarming) return;
    const responseItemToRetry = responses.find(r => r.id === agentId);
    if (!responseItemToRetry) return;

    setIsSwarming(true);
    setSwarmError(null);

    // Reset the specific agent's state before retrying
    const resetItem = {
      ...responseItemToRetry,
      status: ResponseStatus.PENDING,
      content: '',
      error: undefined,
      activeTool: null,
      toolUsed: undefined,
    };

    setResponses(prev => prev.map(r => (r.id === agentId ? resetItem : r)));

    // Use a fresh reference to the reset item for the stream
    await processStream(resetItem);

    setIsSwarming(false);

  }, [isSwarming, responses, processStream]);


  useEffect(() => {
    if (!swarmJustCompleted) return;

    const generateSummary = async () => {
        setSwarmJustCompleted(false); // Consume the event
        setIsModelThinking(true);
        setChatHistory(prev => [...prev, { role: 'model', content: "Swarm mission complete. Compiling executive summary..." }]);
        
        try {
            if (!analysisResult) throw new Error("Mission analysis not found.");
            const summary = await generateExecutiveSummary(analysisResult, responses);
            setChatHistory(prev => [...prev, { role: 'model', content: summary }]);
        } catch (error: any) {
            const errorMessage = error.message || 'Failed to generate summary.';
            setChatHistory(prev => [...prev, { role: 'model', content: `Summary Failed: ${errorMessage}` }]);
            setAnalysisError(errorMessage); // Reuse analysis error display
        } finally {
            setIsModelThinking(false);
        }
    };

    generateSummary();
  }, [swarmJustCompleted, analysisResult, responses]);


  const isLoading = isModelThinking || isSwarming;

  return (
    <div className="min-h-screen text-slate-300 flex flex-col">
      <header className="bg-slate-950/50 backdrop-blur-sm border-b border-slate-700/50 p-3 text-center sticky top-0 z-20">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-violet-400 tracking-widest uppercase">
          SWARM AI
        </h1>
      </header>
      <main className="flex flex-1 overflow-hidden">
        <ProjectManagerChat
          chatHistory={chatHistory}
          onSendMessage={handleSendMessage}
          model={model}
          setModel={setModel}
          isLoading={isLoading}
          isModelThinking={isModelThinking}
          isSwarming={isSwarming}
          analysisResult={analysisResult}
          analysisError={analysisError}
          onLaunch={handleLaunchSwarm}
          onReset={handleReset}
          onDismissAnalysisError={() => setAnalysisError(null)}
        />
        <div className="flex-1 overflow-y-auto bg-slate-900/40">
          <ResultsDisplay 
            responses={responses} 
            isLoading={isLoading} 
            swarmError={swarmError}
            onDismissSwarmError={() => setSwarmError(null)}
            analysisResult={analysisResult}
            onRetry={handleRetryAgent}
            executionPhase={executionPhase}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
