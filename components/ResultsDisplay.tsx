
import React, { useState, useRef, useLayoutEffect } from 'react';
import { ResponseItem, ResponseStatus, AnalysisResult, Tool, Priority } from '../types';
import ErrorAlert from './ErrorAlert';
import AgentDetailModal from './AgentDetailModal';
import { LoadingSpinner, CheckCircleIcon, ExclamationCircleIcon, HexagonIcon } from './Icons';

interface ResultsDisplayProps {
    responses: ResponseItem[];
    isLoading: boolean;
    swarmError: string | null;
    onDismissSwarmError: () => void;
    analysisResult: AnalysisResult | null;
    onRetry: (agentId: number) => void;
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

const getStatusClass = (status: ResponseStatus) => {
    switch (status) {
        case ResponseStatus.SUCCESS: return 'success';
        case ResponseStatus.ERROR: return 'error';
        case ResponseStatus.PENDING:
        default: return 'pending';
    }
};

const getPriorityClass = (priority: Priority | undefined) => {
    if (!priority) return '';
    switch (priority) {
        case 'High': return 'priority-high';
        case 'Medium': return 'priority-medium';
        case 'Low': return 'priority-low';
        default: return '';
    }
};

const getAgentStatusIcon = (status: ResponseStatus) => {
    const iconProps = { className: "h-5 w-5 flex-shrink-0" };
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


const SwarmNetworkGraph: React.FC<{
    responses: ResponseItem[];
    onNodeClick: (id: number) => void;
    analysisResult: AnalysisResult;
}> = ({ responses, onNodeClick, analysisResult }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useLayoutEffect(() => {
        if (containerRef.current) {
            const observer = new ResizeObserver(entries => {
                const { width, height } = entries[0].contentRect;
                setDimensions({ width, height });
            });
            observer.observe(containerRef.current);
            return () => observer.disconnect();
        }
    }, []);
    
    const numAgents = responses.length;
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const radius = Math.min(dimensions.width, dimensions.height) * 0.35;
    
    const nodes = responses.map((response, i) => {
        const angle = (i / numAgents) * 2 * Math.PI - Math.PI / 2; // Start from top
        return {
            ...response,
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
        };
    });

    return (
        <div ref={containerRef} className="w-full h-full relative">
            {/* Edges */}
            <svg className="absolute top-0 left-0 w-full h-full" style={{ overflow: 'visible' }}>
                {nodes.map(node => (
                     <line 
                        key={`line-${node.id}`} 
                        x1={centerX} 
                        y1={centerY} 
                        x2={node.x} 
                        y2={node.y} 
                        className={`graph-edge ${getStatusClass(node.status)} ${node.activeTool ? 'tool-active' : ''}`}
                    />
                ))}
            </svg>
            
            {/* Center Node */}
            <div 
              className="absolute flex flex-col items-center justify-center w-32 h-32 rounded-full bg-slate-800 border-2 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5)] z-10"
              style={{ top: centerY, left: centerX, transform: 'translate(-50%, -50%)' }}
            >
                <HexagonIcon className="w-8 h-8 text-cyan-400"/>
                <span className="text-xs font-bold text-slate-300 mt-1 uppercase tracking-wider">Mission</span>
            </div>

            {/* Agent Nodes */}
            {nodes.map((node, i) => {
                 const agent = analysisResult.agents[node.id % analysisResult.agents.length];
                 return (
                    <button
                        key={`node-${node.id}`}
                        onClick={() => onNodeClick(node.id)}
                        className={`graph-agent-node ${getStatusClass(node.status)} ${node.activeTool ? 'tool-active' : ''} ${getPriorityClass(agent?.priority)}`}
                        style={{
                            top: node.y,
                            left: node.x,
                            animationDelay: `${i * 50}ms`,
                        }}
                        aria-label={`View details for agent ${agent.name}`}
                    >
                        {getAgentStatusIcon(node.status)}
                        <span className="text-sm font-bold text-slate-300 truncate mt-1.5">{agent.name}</span>
                        <span className="text-xs text-slate-500 uppercase">{node.status}</span>
                    </button>
                 );
            })}
        </div>
    );
};


const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ responses, isLoading, swarmError, onDismissSwarmError, analysisResult, onRetry }) => {
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
    const assignedToolsForModal = (analysisResult && selectedAgent?.tools) 
        ? analysisResult.tools.filter(tool => selectedAgent.tools!.includes(tool.name)) 
        : [];

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

                <div className="flex-1 min-h-0">
                   <SwarmNetworkGraph
                        responses={responses}
                        onNodeClick={setSelectedAgentId}
                        analysisResult={analysisResult}
                   />
                </div>
              </>
            )}

            {selectedResponse && selectedAgent && (
                <AgentDetailModal
                    agent={selectedAgent}
                    response={selectedResponse}
                    assignedTools={assignedToolsForModal}
                    onClose={() => setSelectedAgentId(null)}
                    onRetry={onRetry}
                />
            )}
        </div>
    );
};

export default ResultsDisplay;
