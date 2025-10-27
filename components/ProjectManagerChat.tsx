
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { RocketIcon, ResetIcon, MagicWandIcon } from './Icons';
import ErrorAlert from './ErrorAlert';
import type { AnalysisResult, ChatMessage, ExecutiveSummary, Priority } from '../types';

interface ProjectManagerChatProps {
  chatHistory: ChatMessage[];
  onSendMessage: (message: string) => void;
  model: string;
  setModel: (model: string) => void;
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
    onPriorityChange: (agentIndex: number, newPriority: Priority) => void;
}> = ({ agent, index, onPriorityChange }) => {
    const [showReasoning, setShowReasoning] = useState(false);
    return (
        <li className="p-2 bg-slate-800/70 rounded">
            <div className="flex justify-between items-center">
                <strong className="text-slate-200 font-mono text-xs">{agent.name}</strong>
                <select
                    value={agent.priority}
                    onChange={(e) => onPriorityChange(index, e.target.value as Priority)}
                    className={`px-2 py-0.5 text-xs font-bold rounded-full border ${getPriorityClass(agent.priority)} appearance-none text-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-400 transition-all`}
                    aria-label={`Priority for ${agent.name}`}
                >
                    <option className="bg-slate-700 text-white" value="High">High</option>
                    <option className="bg-slate-700 text-white" value="Medium">Medium</option>
                    <option className="bg-slate-700 text-white" value="Low">Low</option>
                </select>
            </div>
            <p className="text-slate-400 text-xs mt-1">{agent.description}</p>
            <div className="text-xs mt-1">
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
    onPriorityChange: (agentIndex: number, newPriority: Priority) => void;
}> = ({ result, onPriorityChange }) => {
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
           <AgentItem key={agent.name} agent={agent} index={index} onPriorityChange={onPriorityChange} />
        ))}
      </ul>
    </details>
    <details className="bg-slate-900/50 p-3 rounded-md border border-slate-600">
      <summary className="font-semibold text-cyan-300 cursor-pointer">TOOLKIT</summary>
      <ul className="mt-2 space-y-2">
        {result.tools.map(tool => (
          <li key={tool.name} className="p-2 bg-slate-800/70 rounded">
            <strong className="text-slate-200 font-mono text-xs">{tool.name}:</strong>
            <span className="text-slate-400 ml-2 text-xs">{tool.description}</span>
          </li>
        ))}
      </ul>
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

  const prioritiesHaveChanged = useMemo(() => {
    if (!analysisResult || !editableResult) return false;
    if (analysisResult.agents.length !== editableResult.agents.length) return true;
    for (let i = 0; i < analysisResult.agents.length; i++) {
        if (analysisResult.agents[i].priority !== editableResult.agents[i].priority) {
            return true;
        }
    }
    return false;
  }, [analysisResult, editableResult]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentMessage.trim()) {
      onSendMessage(currentMessage.trim());
      setCurrentMessage('');
    }
  };

  const handlePriorityChange = (agentIndex: number, newPriority: Priority) => {
    if (!editableResult) return;
    const updatedAgents = [...editableResult.agents];
    updatedAgents[agentIndex] = { ...updatedAgents[agentIndex], priority: newPriority };
    setEditableResult({ ...editableResult, agents: updatedAgents });
  };

  const handleRegeneratePlan = () => {
    if (!editableResult) return;
    const message = `I have adjusted the agent priorities. Please review and regenerate the plan, updating descriptions and priority reasoning if necessary based on these new priorities. Here is the updated agent list:\n\n${JSON.stringify(editableResult.agents, null, 2)}`;
    onSendMessage(message);
  };

  const renderContent = (content: ChatMessage['content']) => {
    if (isAnalysisResult(content)) {
      // Use the editable result for rendering if it exists
      const resultToRender = editableResult || content;
      return <AnalysisResultView result={resultToRender} onPriorityChange={handlePriorityChange} />;
    }
    if (isExecutiveSummary(content)) {
      return <ExecutiveSummaryView summary={content} />;
    }
    return <p className="whitespace-pre-wrap">{String(content)}</p>;
  }

  return (
    <div className="w-full md:w-[450px] bg-slate-950/70 backdrop-blur-sm border-r border-slate-700/50 p-4 flex flex-col h-full">
      <div className="flex justify-between items-center flex-shrink-0">
        <h2 className="text-lg font-bold text-white tracking-wider">PROJECT MANAGER</h2>
        <button onClick={onReset} className="text-sm text-slate-400 hover:text-white flex items-center transition" title="Start Over">
          <ResetIcon />
        </button>
      </div>

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
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-cyan-300 mb-2">AGENT MODEL</label>
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
             {prioritiesHaveChanged && (
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
              disabled={isSwarming || !analysisResult || prioritiesHaveChanged}
              className="w-full flex items-center justify-center px-4 py-3 bg-cyan-600 text-white font-bold rounded-md hover:bg-cyan-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-[0_0_15px_rgba(34,211,238,0.5)]"
              title={prioritiesHaveChanged ? "Please regenerate the plan before deploying" : "Deploy the swarm"}
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
