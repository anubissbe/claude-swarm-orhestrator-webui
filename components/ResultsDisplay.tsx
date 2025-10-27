import React, { useState, useRef, useLayoutEffect } from 'react';
import { ResponseItem, ResponseStatus, AnalysisResult, Tool, Priority } from '../types';
import ErrorAlert from './ErrorAlert';
import AgentDetailModal from './AgentDetailModal';
import { LoadingSpinner, CheckCircleIcon, ExclamationCircleIcon, HexagonIcon, ToolIcon, PlusIcon, MinusIcon, CenterFocusIcon } from './Icons';

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

// Calculates agent positions in concentric circles for better visualization of large swarms.
const calculateNodePositions = (numAgents: number, width: number, height: number, nodeScale: number) => {
    if (numAgents === 0 || width === 0) return [];

    const positions: { x: number; y: number }[] = [];
    const centerX = width / 2;
    const centerY = height / 2;
    let agentsPlaced = 0;
    let ringIndex = 0;

    const baseRadius = Math.min(width, height) * 0.22;
    const ringSpacing = Math.min(width, height) * 0.12;
    const nodeSize = 100 * nodeScale; // Effective node size after scaling

    while (agentsPlaced < numAgents) {
        const radius = baseRadius + ringIndex * ringSpacing;
        
        if (radius > Math.min(centerX, centerY) - (nodeSize / 2)) {
            break;
        }

        // Increased spacing factor from 1.3 to 1.4 to prevent node overlap on the ring.
        let maxAgentsInRing = Math.floor((2 * Math.PI * radius) / (nodeSize * 1.4));
        
        if (ringIndex === 0) {
            maxAgentsInRing = Math.min(maxAgentsInRing, 12);
        }

        if (maxAgentsInRing < 1) break;

        const agentsInThisRing = Math.min(numAgents - agentsPlaced, maxAgentsInRing);
        const angleOffset = (ringIndex % 2 === 0) ? 0 : Math.PI / agentsInThisRing;

        for (let i = 0; i < agentsInThisRing; i++) {
            const agentIndex = agentsPlaced + i;
            const angle = (i / agentsInThisRing) * 2 * Math.PI + angleOffset;
            
            positions[agentIndex] = {
                x: centerX + radius * Math.cos(angle - Math.PI / 2),
                y: centerY + radius * Math.sin(angle - Math.PI / 2),
            };
        }

        agentsPlaced += agentsInThisRing;
        ringIndex++;
    }
    
    if (agentsPlaced < numAgents) {
         console.warn(`Swarm too large for display. ${numAgents - agentsPlaced} agents are stacked at the center.`);
        for (let i = agentsPlaced; i < numAgents; i++) {
            positions[i] = { x: centerX, y: centerY };
        }
    }
    
    return positions;
};

const calculateToolPositions = (numTools: number, width: number, height: number, agentPositions: {x: number, y: number}[]) => {
    if (numTools === 0 || width === 0) return [];
    
    const centerX = width / 2;
    const centerY = height / 2;

    let maxAgentRadius = 0;
    if (agentPositions.length > 0) {
        for (const pos of agentPositions) {
            const dx = pos.x - centerX;
            const dy = pos.y - centerY;
            const distance = Math.sqrt(dx*dx + dy*dy);
            if (distance > maxAgentRadius) {
                maxAgentRadius = distance;
            }
        }
    } else {
        maxAgentRadius = Math.min(width, height) * 0.2;
    }

    const toolRingRadius = maxAgentRadius + 120;

    const positions: { x: number; y: number }[] = [];
    for (let i = 0; i < numTools; i++) {
        const angle = (i / numTools) * 2 * Math.PI + (Math.PI / numTools); // Offset for better spacing
        positions[i] = {
            x: centerX + toolRingRadius * Math.cos(angle - Math.PI / 2),
            y: centerY + toolRingRadius * Math.sin(angle - Math.PI / 2),
        };
    }
    return positions;
};


const SwarmNetworkGraph: React.FC<{
    responses: ResponseItem[];
    onNodeClick: (id: number) => void;
    analysisResult: AnalysisResult;
}> = ({ responses, onNodeClick, analysisResult }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 }); // Pan (x, y) and zoom (k)
    const isPanning = useRef(false);
    const lastMousePos = useRef({ x: 0, y: 0 });

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
    
    // Refined scaling logic: more gradual decrease over a wider range of agent counts.
    // Minimum scale reduced to 0.5 to better accommodate very large swarms.
    const nodeScale = Math.max(0.5, Math.min(1, 1 - (numAgents - 15) / 80));

    const nodePositions = calculateNodePositions(numAgents, dimensions.width, dimensions.height, nodeScale);

    const nodes = responses.map((response, i) => ({
        ...response,
        x: nodePositions[i]?.x ?? centerX,
        y: nodePositions[i]?.y ?? centerY,
    }));
    
    const toolPositions = calculateToolPositions(analysisResult.tools.length, dimensions.width, dimensions.height, nodePositions);

    const toolNodes = analysisResult.tools.map((tool, i) => {
        const isActive = responses.some(r => r.activeTool === tool.name);
        return {
            ...tool,
            x: toolPositions[i]?.x ?? centerX,
            y: toolPositions[i]?.y ?? centerY,
            isActive
        };
    });

    const activeToolEdges = responses
        .filter(response => response.activeTool)
        .map(response => {
            const agentNode = nodes.find(n => n.id === response.id);
            const toolNode = toolNodes.find(t => t.name === response.activeTool);
            if (agentNode && toolNode) {
                return {
                    key: `tool-edge-${response.id}`,
                    x1: agentNode.x,
                    y1: agentNode.y,
                    x2: toolNode.x,
                    y2: toolNode.y,
                };
            }
            return null;
        })
        .filter((edge): edge is { key: string; x1: number; y1: number; x2: number; y2: number; } => edge !== null);


    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const zoomFactor = 1.1;
        const newK = e.deltaY < 0 ? transform.k * zoomFactor : transform.k / zoomFactor;
        const k = Math.max(0.2, Math.min(3, newK)); // Clamp zoom level

        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Zoom centered on the mouse pointer
            const x = mouseX - (mouseX - transform.x) * (k / transform.k);
            const y = mouseY - (mouseY - transform.y) * (k / transform.k);
            
            setTransform({ x, y, k });
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        isPanning.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        if (e.target instanceof HTMLElement) e.target.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isPanning.current) return;
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        isPanning.current = false;
        if (e.target instanceof HTMLElement) e.target.style.cursor = 'grab';
    };

    const handleZoom = (direction: 'in' | 'out') => {
        const zoomFactor = 1.25;
        const newK = direction === 'in' ? transform.k * zoomFactor : transform.k / zoomFactor;
        const k = Math.max(0.2, Math.min(3, newK));

        // Zoom centered on the view center
        const x = centerX - (centerX - transform.x) * (k / transform.k);
        const y = centerY - (centerY - transform.y) * (k / transform.k);

        setTransform({ x, y, k });
    };

    const resetView = () => setTransform({ x: 0, y: 0, k: 1 });

    return (
        <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-transparent" style={{ cursor: 'grab' }}>
            <div
                className="w-full h-full absolute transition-transform duration-100 ease-linear"
                style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})` }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp} // Stop panning if mouse leaves
            >
                {/* Edges */}
                <svg className="absolute top-0 left-0" style={{ width: dimensions.width, height: dimensions.height, overflow: 'visible' }}>
                    {/* Edges from Center to Agents */}
                    {nodes.map(node => (
                         <line 
                            key={`line-mission-${node.id}`} 
                            x1={centerX} 
                            y1={centerY} 
                            x2={node.x} 
                            y2={node.y} 
                            className={`graph-edge ${getStatusClass(node.status)}`}
                        />
                    ))}
                    {/* Edges from Agents to Tools */}
                    {activeToolEdges.map(edge => (
                        <line
                            key={edge.key}
                            x1={edge.x1}
                            y1={edge.y1}
                            x2={edge.x2}
                            y2={edge.y2}
                            className="graph-edge tool-active"
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
                            onClick={(e) => { e.stopPropagation(); onNodeClick(node.id); }}
                            className={`graph-agent-node ${getStatusClass(node.status)} ${node.activeTool ? 'tool-active' : ''} ${getPriorityClass(agent?.priority)}`}
                            style={{
                                top: node.y,
                                left: node.x,
                                transform: `scale(${nodeScale})`,
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
                
                {/* Tool Nodes */}
                {toolNodes.map((toolNode, i) => (
                    <div
                        key={`tool-node-${toolNode.name}`}
                        className={`graph-tool-node ${toolNode.isActive ? 'active' : ''}`}
                        style={{
                            top: toolNode.y,
                            left: toolNode.x,
                            animationDelay: `${(responses.length + i) * 50}ms`,
                        }}
                    >
                        <HexagonIcon className="background-hex" />
                        <ToolIcon className="w-6 h-6 mb-1 flex-shrink-0" />
                        <span className="text-xs font-bold truncate">{toolNode.name}</span>
                    </div>
                ))}
            </div>

            {/* UI Controls */}
            <div className="graph-controls">
                <button onClick={() => handleZoom('in')} className="graph-control-btn" aria-label="Zoom in">
                    <PlusIcon />
                </button>
                <button onClick={() => handleZoom('out')} className="graph-control-btn" aria-label="Zoom out">
                    <MinusIcon />
                </button>
                <button onClick={resetView} className="graph-control-btn" aria-label="Reset view">
                    <CenterFocusIcon />
                </button>
            </div>
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