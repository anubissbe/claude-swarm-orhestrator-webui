
import React, { useState } from 'react';
import { ResponseItem, ResponseStatus, AnalysisResult } from '../types';
import ErrorAlert from './ErrorAlert';
import AgentDetailModal from './AgentDetailModal';
import { LoadingSpinner, CheckCircleIcon, ExclamationCircleIcon, HexagonIcon } from './Icons';

interface ResultsDisplayProps {
    responses: ResponseItem[];
    isLoading: boolean;
    swarmError: string | null;
    onDismissSwarmError: () => void;
    analysisResult: AnalysisResult | null;
}

const CircularProgressBar: React.FC<{ progress: number; completed: number; total: number }> = ({ progress, completed, total }) => {
    const strokeWidth = 10;
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center">
            <svg
                className="progress-ring"
                width="200"
                height="200"
            >
                <circle
                    className="text-slate-800"
                    strokeWidth={strokeWidth}
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="100"
                    cy="100"
                />
                <circle
                    className="progress-ring__circle text-cyan-400"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="100"
                    cy="100"
                />
            </svg>
             <div className="absolute text-center">
                <div className="text-4xl font-bold text-white font-mono">{Math.round(progress)}%</div>
                <div className="text-sm text-slate-400 font-mono tracking-widest">{completed}/{total}</div>
                <div className="text-xs text-cyan-400 uppercase tracking-wider">Complete</div>
            </div>
        </div>
    );
};


const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ responses, isLoading, swarmError, onDismissSwarmError, analysisResult }) => {
    const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);

    if (responses.length === 0 && !swarmError) {
        let message = "Awaiting Mission Objective";
        if (isLoading) {
            message = "Initializing Swarm Protocol...";
        }
        return (
            <div className="flex-grow flex flex-col items-center justify-center text-slate-500 p-8">
                <HexagonIcon className="w-24 h-24 text-slate-700 opacity-50" />
                <p className="mt-4 text-lg font-mono tracking-widest">{message}</p>
                 <p className="text-sm text-slate-600">Provide an objective and initialize the plan to deploy the swarm.</p>
            </div>
        );
    }

    const completedCount = responses.filter(r => r.status !== ResponseStatus.PENDING).length;
    const progress = responses.length > 0 ? (completedCount / responses.length) * 100 : 0;

    const selectedResponse = responses.find(r => r.id === selectedAgentId);
    const selectedAgent = analysisResult && selectedResponse ? analysisResult.agents[selectedResponse.id % analysisResult.agents.length] : null;

    const getStatusClass = (status: ResponseStatus) => {
        switch (status) {
            case ResponseStatus.SUCCESS: return 'success';
            case ResponseStatus.ERROR: return 'error';
            case ResponseStatus.PENDING:
            default: return 'pending';
        }
    };
    
    const getAgentStatusIcon = (status: ResponseStatus) => {
        const iconProps = { className: "h-4 w-4 flex-shrink-0" };
        switch (status) {
            case ResponseStatus.SUCCESS:
                return <CheckCircleIcon {...iconProps} />;
            case ResponseStatus.ERROR:
                return <ExclamationCircleIcon {...iconProps} />;
            case ResponseStatus.PENDING:
            default:
                return <LoadingSpinner {...iconProps} />;
        }
    };

    return (
        <div className="flex-grow p-4 md:p-6 lg:p-8 flex flex-col h-full">
            {swarmError && (
                <ErrorAlert 
                    title="Swarm Execution Error"
                    message={swarmError}
                    onDismiss={onDismissSwarmError}
                />
            )}

            {responses.length > 0 && analysisResult && (
              <>
                <div className="flex-shrink-0 flex flex-col items-center justify-center mb-6">
                    <CircularProgressBar progress={progress} completed={completedCount} total={responses.length} />
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="hex-grid">
                        {responses.map((response) => {
                            const agent = analysisResult.agents[response.id % analysisResult.agents.length];
                            
                            return (
                                <button 
                                    key={response.id}
                                    onClick={() => setSelectedAgentId(response.id)}
                                    className={`hex ${getStatusClass(response.status)} ${selectedAgentId === response.id ? 'selected' : ''}`}
                                    aria-label={`View details for agent ${agent.name}`}
                                >
                                   <div className="hex-inner">
                                        <div className="flex items-center justify-center gap-1.5 w-full">
                                            {getAgentStatusIcon(response.status)}
                                            <span className="text-sm font-bold text-slate-300 truncate">{agent.name}</span>
                                        </div>
                                       <span className="text-xs text-slate-500 uppercase mt-1">{response.status}</span>
                                   </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
              </>
            )}

            {selectedResponse && selectedAgent && (
                <AgentDetailModal
                    agent={selectedAgent}
                    response={selectedResponse}
                    onClose={() => setSelectedAgentId(null)}
                />
            )}
        </div>
    );
};

export default ResultsDisplay;