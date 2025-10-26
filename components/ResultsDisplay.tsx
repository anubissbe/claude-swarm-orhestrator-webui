
import React, { useState } from 'react';
import { ResponseItem, ResponseStatus, AnalysisResult } from '../types';
import ResponseCard from './ResponseCard';
import ErrorAlert from './ErrorAlert';
import AgentDetailModal from './AgentDetailModal';
import { LoadingSpinner, CheckCircleIcon, ExclamationCircleIcon } from './Icons';

interface ResultsDisplayProps {
    responses: ResponseItem[];
    isLoading: boolean;
    swarmError: string | null;
    onDismissSwarmError: () => void;
    analysisResult: AnalysisResult | null;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ responses, isLoading, swarmError, onDismissSwarmError, analysisResult }) => {
    const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);

    if (responses.length === 0 && !swarmError) {
        let message = "Launch a swarm to see the results here.";
        if (isLoading) {
            message = "Analyzing project plan... Please wait.";
        }
        return (
            <div className="flex-grow flex items-center justify-center text-gray-500">
                <div className="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                    <p className="mt-2">{message}</p>
                </div>
            </div>
        );
    }

    const completedCount = responses.filter(r => r.status !== ResponseStatus.PENDING).length;
    const progress = responses.length > 0 ? (completedCount / responses.length) * 100 : 0;

    const selectedResponse = responses.find(r => r.id === selectedAgentId);
    const selectedAgent = analysisResult && selectedResponse ? analysisResult.agents[selectedResponse.id % analysisResult.agents.length] : null;

    return (
        <div className="flex-grow p-4 md:p-6 lg:p-8">
            {swarmError && (
                <ErrorAlert 
                    title="Swarm Execution Error"
                    message={swarmError}
                    onDismiss={onDismissSwarmError}
                />
            )}

            {responses.length > 0 && (
              <>
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-2 text-white">
                        <h2 className="text-lg font-semibold">Swarm Results</h2>
                        <span>{completedCount} / {responses.length} Completed</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>

                {analysisResult && analysisResult.agents.length > 0 && (
                    <div className="mb-6 animate-fade-in">
                        <h3 className="text-md font-semibold mb-3 text-white">Active Agents</h3>
                        <div className="flex flex-wrap gap-2">
                            {responses.map((response) => {
                                const agent = analysisResult.agents[response.id % analysisResult.agents.length];
                                const MAX_CHARS_FOR_PROGRESS = 500;

                                let statusIcon;
                                let pillClasses;
                                let progressBar = null;

                                switch (response.status) {
                                    case ResponseStatus.SUCCESS:
                                        statusIcon = <CheckCircleIcon />;
                                        pillClasses = 'bg-green-500/20 border-green-500/50 hover:border-green-400';
                                        break;
                                    case ResponseStatus.ERROR:
                                        statusIcon = <ExclamationCircleIcon />;
                                        pillClasses = 'bg-red-500/20 border-red-500/50 hover:border-red-400';
                                        break;
                                    case ResponseStatus.PENDING:
                                    default:
                                        statusIcon = <LoadingSpinner />;
                                        pillClasses = 'bg-gray-800 border-blue-500/50 hover:border-blue-400';
                                        const progressWidth = Math.min(((response.content?.length || 0) / MAX_CHARS_FOR_PROGRESS) * 100, 100);
                                        progressBar = (
                                            <div 
                                                className="absolute top-0 left-0 h-full bg-blue-600/40"
                                                style={{ 
                                                    width: `${progressWidth}%`, 
                                                    transition: 'width 0.4s linear'
                                                }}
                                            />
                                        );
                                        break;
                                }

                                return (
                                    <button 
                                        key={response.id}
                                        onClick={() => setSelectedAgentId(response.id)}
                                        className={`relative rounded-full py-1 pl-1 pr-3 flex items-center space-x-1.5 text-xs transition-all duration-300 overflow-hidden border ${pillClasses}`}
                                    >
                                        {progressBar}
                                        <div className="relative z-10 w-5 h-5 flex items-center justify-center flex-shrink-0">
                                            {statusIcon}
                                        </div>
                                        <span className="relative z-10 font-medium text-gray-300">{agent.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {responses.map(response => (
                        <ResponseCard key={response.id} response={response} />
                    ))}
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
