
import React from 'react';
import { Agent, ResponseItem, ResponseStatus, Tool, Priority } from '../types';
import { LoadingSpinner, CheckCircleIcon, ExclamationCircleIcon, ResetIcon, ToolIcon } from './Icons';

interface AgentDetailModalProps {
  agent: Agent;
  response: ResponseItem;
  assignedTools: Tool[];
  onClose: () => void;
  onRetry: (agentId: number) => void;
}

const AgentDetailModal: React.FC<AgentDetailModalProps> = ({ agent, response, assignedTools, onClose, onRetry }) => {
    
    const getStatusInfo = () => {
        switch (response.status) {
            case ResponseStatus.SUCCESS:
                return { 
                    icon: <CheckCircleIcon />, 
                    text: 'Success', 
                    textColor: 'text-green-400' 
                };
            case ResponseStatus.ERROR:
                return { 
                    icon: <ExclamationCircleIcon />, 
                    text: 'Error', 
                    textColor: 'text-red-400' 
                };
            case ResponseStatus.PENDING:
            default:
                return { 
                    icon: <LoadingSpinner />, 
                    text: 'Working...', 
                    textColor: 'text-cyan-400'
                };
        }
    };

    const getPriorityClass = (priority: Priority) => {
        switch (priority) {
            case 'High': return 'text-rose-300 bg-rose-900/50 border-rose-500/50';
            case 'Medium': return 'text-amber-300 bg-amber-900/50 border-amber-500/50';
            case 'Low': return 'text-sky-300 bg-sky-900/50 border-sky-500/50';
            default: return 'text-slate-300 bg-slate-700/50 border-slate-600/50';
        }
    }

    const statusInfo = getStatusInfo();

    const handleRetryClick = () => {
        onRetry(response.id);
        onClose(); // Close modal after initiating retry
    };

    const renderOutputOrError = () => {
        if (response.status === ResponseStatus.ERROR) {
            const errorString = response.error || "No error details provided.";
            const lines = errorString.split('\n');
            const message = lines[0];
            const stackTrace = lines.slice(1).join('\n').trim();

            return (
                <div>
                    <h3 className="font-semibold text-slate-300 mb-2">Error Details</h3>
                    <div className="bg-slate-900/70 border border-slate-700 rounded-md p-3 max-h-80 overflow-y-auto font-mono text-sm">
                        <p className="text-rose-400 whitespace-pre-wrap font-semibold">{message}</p>
                        {stackTrace && (
                            <>
                                <div className="border-t border-slate-600/50 my-3"></div>
                                <details>
                                    <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition-colors">
                                        <span className="font-semibold">Show Stack Trace</span>
                                    </summary>
                                    <pre className="mt-2 text-slate-400 whitespace-pre-wrap opacity-80 text-xs">{stackTrace}</pre>
                                </details>
                            </>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div>
                <h3 className="font-semibold text-slate-300 mb-2">Full Output</h3>
                <div className="bg-slate-900/70 border border-slate-700 rounded-md p-3 max-h-80 overflow-y-auto">
                    {response.content ? (
                        <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                            {response.content}
                            {response.status === ResponseStatus.PENDING && (
                                <span className="blinking-cursor font-bold text-cyan-300">▍</span>
                            )}
                        </pre>
                    ) : (
                        <p className="text-slate-500 italic">No output received yet...</p>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" 
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="agent-detail-title"
        >
            <div 
                className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl shadow-cyan-500/10 w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-in" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
                    <h2 id="agent-detail-title" className="text-xl font-bold text-white font-mono tracking-wider">{agent.name}</h2>
                    <button 
                        onClick={onClose} 
                        className="p-1 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition"
                        aria-label="Close modal"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                            <h3 className="font-semibold text-slate-300 mb-2">Status</h3>
                            <div className={`flex items-center text-sm font-medium ${statusInfo.textColor}`}>
                                <div className="w-5 h-5 mr-2">{statusInfo.icon}</div>
                                <span>{statusInfo.text}</span>
                            </div>
                        </div>
                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                            <h3 className="font-semibold text-slate-300 mb-2">Priority Level</h3>
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${getPriorityClass(agent.priority)}`}>
                                {agent.priority}
                            </div>
                        </div>
                    </div>
                    
                    {response.content && (
                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50 animate-fade-in">
                            <h3 className="font-semibold text-slate-300 mb-2">Last Output Snippet</h3>
                            <div className="text-slate-400 text-sm font-mono bg-slate-800/50 p-3 rounded-md">
                                <p className="block truncate">
                                    {response.content.trim().split('\n').pop()}
                                </p>
                                {response.status === ResponseStatus.PENDING && (
                                    <p className="text-xs text-cyan-400/80 mt-1">...still receiving output</p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                        <h3 className="font-semibold text-slate-300 mb-2">Agent Description</h3>
                        <p className={`text-slate-400 text-sm ${!agent.description && 'italic'}`}>
                            {agent.description || 'No description available.'}
                        </p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                        <h3 className="font-semibold text-slate-300 mb-2">Priority Rationale</h3>
                        <p className="text-slate-400 text-sm italic border-l-2 border-cyan-500/50 pl-3">
                            "{agent.priorityReasoning || 'No reasoning provided.'}"
                        </p>
                    </div>

                    <div>
                        <h3 className="font-semibold text-slate-300 mb-2">Assigned Toolkit</h3>
                        {assignedTools.length > 0 ? (
                            <ul className="space-y-2">
                                {assignedTools.map(tool => {
                                    const isActive = response.activeTool === tool.name;
                                    const wasUsed = !isActive && (response.status === ResponseStatus.SUCCESS || response.status === ResponseStatus.ERROR) && response.toolUsed === tool.name;

                                    return (
                                        <li key={tool.name} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 flex items-start space-x-3">
                                            <div className="flex-shrink-0 pt-1">
                                                <ToolIcon className="w-5 h-5 text-violet-400" />
                                            </div>
                                            <div className="flex-grow">
                                                <div className="flex justify-between items-center">
                                                    <strong className="text-slate-200 font-mono text-sm">{tool.name}</strong>
                                                    {isActive && (
                                                        <span className="text-xs font-bold text-violet-300 bg-violet-900/50 px-2 py-1 rounded-full animate-pulse">
                                                            IN USE
                                                        </span>
                                                    )}
                                                    {wasUsed && (
                                                        <span className="flex items-center text-xs font-bold text-green-300 bg-green-900/50 px-2 py-1 rounded-full">
                                                            <CheckCircleIcon className="w-4 h-4 mr-1 text-green-400" />
                                                            USED
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-slate-400 text-sm mt-1">{tool.description}</p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="text-slate-500 italic text-sm">No specific tools assigned to this agent.</p>
                        )}
                    </div>
                    
                    {renderOutputOrError()}

                </div>

                 {/* Footer */}
                <div className="p-4 bg-slate-800/50 border-t border-slate-700 flex-shrink-0 flex justify-end items-center space-x-3">
                    {response.status === ResponseStatus.ERROR && (
                        <button
                            onClick={handleRetryClick}
                            className="flex items-center justify-center px-4 py-2 bg-cyan-600 text-white font-bold rounded-md hover:bg-cyan-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                        >
                            <ResetIcon className="h-5 w-5 mr-2" />
                            Retry Agent
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-600 text-white font-semibold rounded-md hover:bg-slate-700 transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AgentDetailModal;
