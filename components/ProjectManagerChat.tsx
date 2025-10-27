import React, { useState, useRef, useEffect, useMemo } from 'react';
import { RocketIcon, ResetIcon, MagicWandIcon, PlusIcon } from './Icons';
import ErrorAlert from './ErrorAlert';
import type { AnalysisResult, ChatMessage, ExecutiveSummary, Priority, Tool, Agent } from '../types';

interface ProjectManagerChatProps {
  chatHistory: ChatMessage[];
  onSendMessage: (message: string) => void;
  model: string;
  setModel: (model: string) => void;
  projectManagerModel: string;
  setProjectManagerModel: (model: string) => void;
  isLoading: boolean;
  isModelThinking: boolean;
  isSwarming: boolean;
  analysisResult: AnalysisResult | null;
  analysisError: string | null;
  onLaunch: () => void;
  onReset: () => void;
  onDismissAnalysisError: () => void;
}

// Type Guards
function isAnalysisResult(item: any): item is AnalysisResult {
  return item && typeof item === 'object' && 'improvedPrompt' in item && 'agents' in item;
}
function isExecutiveSummary(item: any): item is ExecutiveSummary {
  return item && typeof item === 'object' && 'overallOutcome' in item && 'kpis' in item;
}

const ModelTypingIndicator: React.FC = () => (
    <div className="flex justify-start">
        <div className="bg-slate-700 rounded-lg p-3 max-w-lg animate-fade-in">
            <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-cyan-300 rounded-full animate-[bounce_1.2s_ease-in-out_infinite]"></div>
                <div className="w-2 h-2 bg-cyan-300 rounded-full animate-[bounce_1.2s_ease-in-out_infinite_200ms]"></div>
                <div className="w-2 h-2 bg-cyan-300 rounded-full animate-[bounce_1.2s_ease-in-out_infinite_400ms]"></div>
            </div>
        </div>
    </div>
);

const getPriorityClass = (priority: Priority) => {
    switch (priority) {
        case 'High': return 'bg-rose-600/50 border-rose-500 text-rose-200';
        case 'Medium': return 'bg-amber-600/50 border-amber-500 text-amber-200';
        case 'Low': return 'bg-sky-600/50 border-sky-500 text-sky-200';
        default: return 'bg-slate-600/50 border-slate-500 text-slate-300';
    }
}

const AgentItem: React.FC<{
    agent: AnalysisResult['agents'][0];
    index: number;
    onAgentChange: (agentIndex: number, field: keyof Agent, value: any) => void;
}> = ({ agent, index, onAgentChange }) => {
    const [showReasoning, setShowReasoning] = useState(false);
    return (
        <li className="p-2 bg-slate-800/70 rounded space-y-2">
            <div className="flex justify-between items-center">
                <strong className="text-slate-200 font-mono text-xs">{agent.name}</strong>
                <select
                    value={agent.priority}
                    onChange={(e) => onAgentChange(index, 'priority', e.target.value as Priority)}
                    className={`px-2 py-0.5 text-xs font-bold rounded-full border ${getPriorityClass(agent.priority)} appearance-none text-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-400 transition-all`}
                    aria-label={`Priority for ${agent.name}`}
                >
                    <option className="bg-slate-700 text-white" value="High">High</option>
                    <option className="bg-slate-700 text-white" value="Medium">Medium</option>
                    <option className="bg-slate-700 text-white" value="Low">Low</option>
                </select>
            </div>
             <textarea
                value={agent.description}
                onChange={e => onAgentChange(index, 'description', e.target.value)}
                placeholder="Agent instructions..."
                rows={2}
                className="w-full p-1 bg-slate-900/50 border border-slate-700/50 rounded text-slate-400 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 text-xs resize-y"
            />
            <div className="text-xs">
                <button 
                    onClick={() => setShowReasoning(!showReasoning)}
                    className="text-slate-500 hover:text-slate-300 transition-colors font-semibold"
                >
                    Why this priority? <span className="inline-block transition-transform">{showReasoning ? '▲' : '▼'}</span>
                </button>
                {showReasoning && (
                    <p className="text-slate-500 italic border-l-2 border-slate-600 pl-2 mt-1 animate-fade-in">
                        "{agent.priorityReasoning}"
                    </p>
                )}
            </div>
        </li>
    );
};


const AnalysisResultView: React.FC<{ 
    result: AnalysisResult;
    originalResult: AnalysisResult;
    onAgentChange: (agentIndex: number, field: keyof Agent, value: any) => void;
    onToolChange: (index: number, field: keyof Tool, value: string) => void;
    onAddTool: () => void;
    onRemoveTool: (index: number) => void;
}> = ({ result, originalResult, onAgentChange, onToolChange, onAddTool, onRemoveTool }) => {
  const [copyButtonText, setCopyButtonText] = useState('Copy Prompt');

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(result.improvedPrompt).then(() => {
        setCopyButtonText('Copied!');
        setTimeout(() => setCopyButtonText('Copy Prompt'), 2000);
    }, () => {
        setCopyButtonText('Failed!');
        setTimeout(() => setCopyButtonText('Copy Prompt'), 2000);
    });
  };

  return (
  <div className="space-y-3 text-sm animate-fade-in mt-2">
    <details className="bg-slate-900/50 p-3 rounded-md border border-slate-600">
      <summary className="font-semibold text-cyan-300 cursor-pointer flex items-center">
        STRATEGIC BRIEFING
        <button 
          onClick={handleCopy}
          className="ml-auto text-xs bg-slate-700 text-slate-300 hover:bg-slate-600 rounded px-2 py-1 font-sans transition-colors"
          title="Copy improved prompt"
        >
          {copyButtonText}
        </button>
      </summary>
      <p className="mt-2 p-2 bg-slate-800 border border-slate-600 rounded text-slate-300 whitespace-pre-wrap font-mono text-xs">{result.improvedPrompt}</p>
    </details>
    <details className="bg-slate-900/50 p-3 rounded-md border border-slate-600" open>
      <summary className="font-semibold text-cyan-300 cursor-pointer">AGENT ROSTER ({result.agents.length})</summary>
      <ul className="mt-2 space-y-2">
        {result.agents.map((agent, index) => (
           <AgentItem key={agent.name} agent={agent} index={index} onAgentChange={onAgentChange} />
        ))}
      </ul>
    </details>
    <details className="bg-slate-900/50 p-3 rounded-md border border-slate-600" open>
      <summary className="font-semibold text-cyan-300 cursor-pointer">TOOLKIT</summary>
      <ul className="mt-2 space-y-2">
        {result.tools.map((tool, index) => {
            const isNewTool = index >= originalResult.tools.length;
            return (
                <li key={index} className="p-3 bg-slate-800/70 rounded relative group space-y-2">
                    <div className="flex items-center space-x-2">
                        {isNewTool ? (
                            <input 
                                type="text"
                                value={tool.name}
                                onChange={e => onToolChange(index, 'name', e.target.value)}
                                placeholder="New Tool Name"
                                className="flex-grow p-1 bg-slate-900 border border-slate-600 rounded text-slate-200 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 text-xs font-mono"
                            />
                        ) : (
                           <strong className="text-slate-200 font-mono text-xs">{tool.name}</strong>
                        )}
                         <button 
                            onClick={() => onRemoveTool(index)} 
                            className="absolute top-2 right-2 p-1 rounded-full text-slate-500 bg-slate-800/50 hover:bg-slate-700 hover:text-rose-400 transition opacity-0 group-hover:opacity-100"
                            aria-label="Remove tool"
                            title="Remove tool"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <textarea
                        value={tool.description}
                        onChange={e => onToolChange(index, 'description', e.target.value)}
                        placeholder="Tool description"
                        rows={2}
                        className="w-full p-1 bg-slate-900/50 border border-slate-700/50 rounded text-slate-400 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 text-xs resize-y"
                    />
                </li>
            )
        })}
      </ul>
      <button 
        onClick={onAddTool}
        className="mt-3 w-full flex items-center justify-center text-sm p-2 bg-slate-700/50 text-slate-300 hover:bg-slate-700 rounded-md border border-slate-600 border-dashed transition-colors"
       >
        <PlusIcon className="mr-2 h-4 w-4"/> Add Tool
      </button>
    </details>
  </div>
);
}

const getOutcomeClass = (outcome: string) => {
    switch (outcome.toLowerCase()) {
        case 'success': return 'text-green-400 border-green-500';
        case 'partial success': return 'text-amber-400 border-amber-500';
        case 'failure': return 'text-rose-400 border-rose-500';
        default: return 'text-slate-300 border-slate-500';
    }
}

const ExecutiveSummaryView: React.FC<{ summary: ExecutiveSummary }> = ({ summary }) => (
    <div className="space-y-3 text-sm animate-fade-in mt-2">
        <div className="bg-slate-900/50 p-3 rounded-md border border-slate-600">
            <h3 className="font-semibold text-cyan-300 uppercase tracking-wider mb-2">Executive Summary</h3>
            <div className={`text-center p-2 border-2 rounded-md mb-3 ${getOutcomeClass(summary.overallOutcome)}`}>
                <span className="font-bold text-lg">{summary.overallOutcome}</span>
            </div>
            <p className="text-slate-300 text-xs">{summary.summary}</p>
        </div>
        <details className="bg-slate-900/50 p-3 rounded-md border border-slate-600">
            <summary className="font-semibold text-cyan-300 cursor-pointer">KEY PERFORMANCE INDICATORS</summary>
            <ul className="mt-2 space-y-2">
                {summary.kpis.map(kpi => (
                    <li key={kpi.name} className="p-2 bg-slate-800/70 rounded">
                        <strong className="text-slate-200 font-mono text-xs">{kpi.name}: <span className="text-cyan-300">{kpi.value}</span></strong>
                        <p className="text-slate-400 text-xs">{kpi.description}</p>
                    </li>
                ))}
            </ul>
        </details>
        {summary.toolUsage && summary.toolUsage.length > 0 && (
            <details className="bg-slate-900/50 p-3 rounded-md border border-slate-600">
                <summary className="font-semibold text-cyan-300 cursor-pointer">TOOL USAGE ANALYSIS</summary>
                <ul className="mt-2 space-y-2">
                    {summary.toolUsage.map(tool => (
                        <li key={tool.name} className="p-2 bg-slate-800/70 rounded flex justify-between items-center">
                            <strong className="text-slate-200 font-mono text-xs">{tool.name}</strong>
                            <span className="text-cyan-300 font-mono text-xs font-bold bg-slate-900 px-2 py-0.5 rounded-full">{tool.count} uses</span>
                        </li>
                    ))}
                </ul>
            </details>
        )}
        <details className="bg-slate-900/50 p-3 rounded-md border border-slate-600" open>
            <summary className="font-semibold text-cyan-300 cursor-pointer">RECOMMENDATIONS</summary>
            <p className="mt-2 text-slate-300 text-xs whitespace-pre-wrap">{summary.recommendations}</p>
        </details>
    </div>
);


const ProjectManagerChat: React.FC<ProjectManagerChatProps> = ({
  chatHistory,
  onSendMessage,
  model,
  setModel,
  projectManagerModel,
  setProjectManagerModel,
  isLoading,
  isModelThinking,
  isSwarming,
  analysisResult,
  analysisError,
  onLaunch,
  onReset,
  onDismissAnalysisError,
}) => {
  const [currentMessage, setCurrentMessage] = useState('');
  const [editableResult, setEditableResult] = useState<AnalysisResult | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isModelThinking]);

  useEffect(() => {
    setEditableResult(analysisResult ? JSON.parse(JSON.stringify(analysisResult)) : null);
  }, [analysisResult]);

  const agentsHaveChanged = useMemo(() => {
    if (!analysisResult || !editableResult) return false;
    // Using stringify is a simple way to deep compare. For very large objects, this could be optimized.
    return JSON.stringify(analysisResult.agents) !== JSON.stringify(editableResult.agents);
  }, [analysisResult, editableResult]);
  
  const toolsHaveChanged = useMemo(() => {
    if (!analysisResult || !editableResult) return false;
    return JSON.stringify(analysisResult.tools) !== JSON.stringify(editableResult.tools);
  }, [analysisResult, editableResult]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentMessage.trim()) {
      onSendMessage(currentMessage.trim());
      setCurrentMessage('');
    }
  };

  const handleAgentChange = (agentIndex: number, field: keyof Agent, value: any) => {
    if (!editableResult) return;
    const updatedAgents = [...editableResult.agents];
    updatedAgents[agentIndex] = { ...updatedAgents[agentIndex], [field]: value };
    setEditableResult({ ...editableResult, agents: updatedAgents });
  };
  
  const handleToolChange = (index: number, field: keyof Tool, value: string) => {
    if (!editableResult) return;
    const updatedTools = [...editableResult.tools];
    updatedTools[index] = { ...updatedTools[index], [field]: value };
    setEditableResult({ ...editableResult, tools: updatedTools });
  };

  const handleAddTool = () => {
    if (!editableResult) return;
    const newTool = { name: '', description: '' };
    const updatedTools = [...editableResult.tools, newTool];
    setEditableResult({ ...editableResult, tools: updatedTools });
  };

  const handleRemoveTool = (index: number) => {
    if (!editableResult) return;
    const updatedTools = editableResult.tools.filter((_, i) => i !== index);
    setEditableResult({ ...editableResult, tools: updatedTools });
  };

  const handlePMModelChange = (newModel: string) => {
    if (chatHistory.length > 1) {
        if (window.confirm("Changing the Project Manager model will reset the current conversation. Are you sure?")) {
            onReset();
            setProjectManagerModel(newModel);
        }
    } else {
        setProjectManagerModel(newModel);
    }
  };

  const handleRegeneratePlan = () => {
    if (!editableResult) return;
    const message = `I have adjusted the plan. Please review and regenerate the plan, updating agent descriptions, tool assignments, and priority reasoning as necessary based on these updated instructions, priorities, and toolkit. Here is the updated structure:\n\n${JSON.stringify({ agents: editableResult.agents, tools: editableResult.tools }, null, 2)}`;
    onSendMessage(message);
  };

  const renderContent = (content: ChatMessage['content']) => {
    if (isAnalysisResult(content)) {
      // Use the editable result for rendering if it exists
      const resultToRender = editableResult || content;
      return <AnalysisResultView 
        result={resultToRender} 
        originalResult={content} // The original result from chat history
        onAgentChange={handleAgentChange} 
        onToolChange={handleToolChange}
        onAddTool={handleAddTool}
        onRemoveTool={handleRemoveTool}
      />;
    }
    if (isExecutiveSummary(content)) {
      return <ExecutiveSummaryView summary={content} />;
    }
    return <p className="whitespace-pre-wrap">{String(content)}</p>;
  }

  const hasChanges = agentsHaveChanged || toolsHaveChanged;

  return (
    <div className="w-full md:w-[450px] bg-slate-950/70 backdrop-blur-sm border-r border-slate-700/50 p-4 flex flex-col h-full">
      <div className="flex justify-between items-center flex-shrink-0">
        <h2 className="text-lg font-bold text-white tracking-wider">PROJECT MANAGER</h2>
        <button onClick={onReset} className="text-sm text-slate-400 hover:text-white flex items-center transition" title="Start Over">
          <ResetIcon />
        </button>
      </div>

      <details className="my-4 flex-shrink-0" open>
        <summary className="font-semibold text-cyan-300 cursor-pointer text-sm uppercase tracking-wider">Configuration</summary>
        <div className="p-4 bg-slate-900/50 rounded-md border border-slate-700/50 mt-2 space-y-4">
            <div>
            <label htmlFor="pm_model" className="block text-sm font-medium text-slate-300 mb-2">Project Manager Model</label>
            <select
                id="pm_model"
                className="w-full p-2 bg-slate-800 border border-slate-600 rounded-md text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition text-sm"
                value={projectManagerModel}
                onChange={(e) => handlePMModelChange(e.target.value)}
                disabled={isModelThinking || isSwarming}
            >
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            </select>
            </div>
            <div>
            <label htmlFor="model" className="block text-sm font-medium text-slate-300 mb-2">Agent Model</label>
            <select
                id="model"
                className="w-full p-2 bg-slate-800 border border-slate-600 rounded-md text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition text-sm"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={isLoading}
            >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
            </select>
            </div>
        </div>
      </details>

      <div ref={chatContainerRef} className="flex-grow my-4 overflow-y-auto space-y-4 pr-2">
        {chatHistory.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`rounded-lg p-3 max-w-lg text-sm ${msg.role === 'user' ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                {renderContent(msg.content)}
            </div>
          </div>
        ))}
        {isModelThinking && <ModelTypingIndicator />}
      </div>
      
      {analysisError && (
        <div className="flex-shrink-0">
          <ErrorAlert
            title="Operation Failed"
            message={analysisError}
            onDismiss={onDismissAnalysisError}
          />
        </div>
      )}

      <div className="flex-shrink-0 space-y-4">
        <form onSubmit={handleSubmit} className="flex items-start space-x-2">
          <textarea
            rows={1}
            className="flex-grow p-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 text-sm resize-none"
            placeholder="Describe your project..."
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !currentMessage.trim()}
            className="px-4 py-2 bg-violet-600 text-white font-bold rounded-md hover:bg-violet-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all"
          >
            Send
          </button>
        </form>

        {analysisResult && !isSwarming && !isModelThinking && (
          <div className="border-t border-slate-700 pt-4 space-y-4 animate-fade-in">
             {hasChanges && (
                <button
                    onClick={handleRegeneratePlan}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center px-4 py-2 bg-amber-600 text-white font-bold rounded-md hover:bg-amber-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                >
                    <MagicWandIcon />
                    Regenerate Plan
                </button>
            )}
            <button
              onClick={onLaunch}
              disabled={isSwarming || !analysisResult || hasChanges}
              className="w-full flex items-center justify-center px-4 py-3 bg-cyan-600 text-white font-bold rounded-md hover:bg-cyan-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-[0_0_15px_rgba(34,211,238,0.5)]"
              title={hasChanges ? "Please regenerate the plan before deploying" : "Deploy the swarm"}
            >
              <RocketIcon />
              {isSwarming ? 'SWARM IN PROGRESS...' : 'DEPLOY SWARM'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectManagerChat;
