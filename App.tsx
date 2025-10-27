

import React, { useState, useCallback, useRef, useEffect } from 'react';
import ProjectManagerChat from './components/ProjectManagerChat';
import ResultsDisplay from './components/ResultsDisplay';
import { generateSingleResponse, createProjectManagerChat, askProjectManager, generateExecutiveSummary } from './services/geminiService';
// FIX: Import the Task type to help with type inference.
import { ResponseItem, ResponseStatus, AnalysisResult, ChatMessage, Task } from './types';
import type { Chat } from '@google/genai';


function App() {
  const [model, setModel] = useState<string>('gemini-2.5-flash');
  const [projectManagerModel, setProjectManagerModel] = useState<string>('gemini-2.5-pro');
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

  const [runningTaskIds, setRunningTaskIds] = useState<Set<number>>(new Set());

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
    setRunningTaskIds(new Set());
  }, []);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!message || isModelThinking || isSwarming) return;

    setChatHistory(prev => [...prev, { role: 'user', content: message }]);
    setIsModelThinking(true);
    setAnalysisError(null);
    setSwarmError(null);
    setResponses([]);
    setRunningTaskIds(new Set());

    try {
      if (!chatSessionRef.current) {
        chatSessionRef.current = createProjectManagerChat(projectManagerModel);
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
  }, [isModelThinking, isSwarming, projectManagerModel]);


  const processStream = useCallback(async (responseItem: ResponseItem) => {
    if (!analysisResult) return;

    const taskDef = analysisResult.tasks.find(t => t.id === responseItem.id);
    if (!taskDef) {
        setResponses(prev => prev.map(r => r.id === responseItem.id ? { ...r, status: ResponseStatus.ERROR, error: `Task definition for ID ${responseItem.id} not found.` } : r));
        return;
    }
    
    const agentSpecificPrompt = `**Overall Mission:**\n${analysisResult.improvedPrompt}\n\n---\n\n**Your Task (${taskDef.name}):**\n${taskDef.description}\n\n**Task Priority:** ${taskDef.priority} (${taskDef.priorityReasoning})\n\n**Tools available to you:**\n${taskDef.tools && taskDef.tools.length > 0 ? taskDef.tools.join(', ') : 'None'}\n\n---\n\nNow, please execute your task. Provide your output below.`;

    let activeTool: string | null = null;
    try {
      const agentTools = taskDef.tools || [];
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

  // Orchestration Engine
  useEffect(() => {
    if (!isSwarming || !analysisResult) return;

    // FIX: Explicitly type taskMap to ensure correct type inference.
    const taskMap: Map<number, Task> = new Map(analysisResult.tasks.map(t => [t.id, t]));
    const completedTaskIds = new Set(responses.filter(r => r.status === ResponseStatus.SUCCESS).map(r => r.id));

    const runnableTasks = responses
        .filter(r => r.status === ResponseStatus.PENDING && !runningTaskIds.has(r.id))
        .map(r => taskMap.get(r.id)!)
        .filter(task => task.dependencies.every(depId => completedTaskIds.has(depId)));

    if (runnableTasks.length > 0) {
        const newRunningIds = new Set(runningTaskIds);
        runnableTasks.forEach(t => newRunningIds.add(t.id));
        setRunningTaskIds(newRunningIds);
        setExecutionPhase(`Executing ${runnableTasks.length} task(s)...`);

        runnableTasks.forEach(task => {
            const responseItem = responses.find(r => r.id === task.id)!;
            processStream(responseItem).finally(() => {
                setRunningTaskIds(prev => {
                    const next = new Set(prev);
                    next.delete(task.id);
                    return next;
                });
            });
        });
    } else {
        const isStillRunning = runningTaskIds.size > 0;
        const hasPending = responses.some(r => r.status === ResponseStatus.PENDING);
        const hasFailed = responses.some(r => r.status === ResponseStatus.ERROR);
        
        if (!isStillRunning && !hasPending) { // All done (either success or failed)
             setIsSwarming(false);
             setSwarmJustCompleted(true);
             setExecutionPhase(null);
        } else if (!isStillRunning && hasPending && !hasFailed) { // Deadlock
            const pendingTaskNames = responses
                .filter(r => r.status === ResponseStatus.PENDING)
                .map(r => taskMap.get(r.id)?.name || `ID ${r.id}`)
                .join(', ');
            setSwarmError(`Deadlock detected. The following tasks cannot run due to unmet dependencies: ${pendingTaskNames}`);
            setResponses(prev => prev.map(r => r.status === ResponseStatus.PENDING ? {...r, status: ResponseStatus.ERROR, error: 'Deadlock: dependency not met.'} : r));
            setIsSwarming(false);
        }
    }
  }, [responses, isSwarming, analysisResult, runningTaskIds, processStream]);


  const handleLaunchSwarm = useCallback(async () => {
    if (!analysisResult || isSwarming) return;

    setIsSwarming(true);
    setSwarmError(null);
    setRunningTaskIds(new Set());
    const initialResponses: ResponseItem[] = analysisResult.tasks.map(task => ({
      id: task.id,
      status: ResponseStatus.PENDING,
      content: '',
      activeTool: null,
    }));
    setResponses(initialResponses);
    setExecutionPhase('Initializing Orchestrator...');
  }, [analysisResult, isSwarming]);


  const handleRetryTask = useCallback(async (taskId: number) => {
    if (isSwarming || !analysisResult) return;

    const taskToRetry = responses.find(r => r.id === taskId);
    if (!taskToRetry) return;
    
    const taskMap = new Map(analysisResult.tasks.map(t => [t.id, t]));
    const dependentTasks = new Set<number>([taskId]);
    
    // Recursively find all tasks that depend on the one being retried
    const findDependents = (id: number) => {
      analysisResult.tasks.forEach(task => {
        if (task.dependencies.includes(id) && !dependentTasks.has(task.id)) {
          dependentTasks.add(task.id);
          findDependents(task.id);
        }
      });
    };
    findDependents(taskId);

    setIsSwarming(true);
    setSwarmError(null);

    setResponses(prev => prev.map(r => {
      if (dependentTasks.has(r.id)) {
        return {
          ...r,
          status: ResponseStatus.PENDING,
          content: '',
          error: undefined,
          activeTool: null,
          toolUsed: undefined,
        };
      }
      return r;
    }));
  }, [isSwarming, responses, analysisResult]);


  const handleRetryAllFailed = useCallback(async () => {
    if (isSwarming) return;

    const failedResponses = responses.filter(r => r.status === ResponseStatus.ERROR);
    if (failedResponses.length === 0) return;

    setIsSwarming(true);
    setSwarmError(null);
    setExecutionPhase(`Retrying ${failedResponses.length} failed task(s)...`);

    const taskIdsToRetry = new Set(failedResponses.map(r => r.id));

    setResponses(prev => prev.map(r => {
        if (taskIdsToRetry.has(r.id)) {
            return {
                ...r,
                status: ResponseStatus.PENDING,
                content: '',
                error: undefined,
                activeTool: null,
                toolUsed: undefined,
            };
        }
        return r;
    }));
  }, [isSwarming, responses]);


  useEffect(() => {
    if (!swarmJustCompleted) return;

    const generateSummary = async () => {
        setSwarmJustCompleted(false); // Consume the event
        setIsModelThinking(true);
        setChatHistory(prev => [...prev, { role: 'model', content: "Mission complete. Compiling executive summary..." }]);
        
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
          projectManagerModel={projectManagerModel}
          setProjectManagerModel={setProjectManagerModel}
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
            onRetry={handleRetryTask}
            onRetryAllFailed={handleRetryAllFailed}
            executionPhase={executionPhase}
          />
        </div>
      </main>
    </div>
  );
}

export default App;