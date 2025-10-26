import React from 'react';
import { MagicWandIcon, RocketIcon, ResetIcon } from './Icons';
import ErrorAlert from './ErrorAlert';
import type { AnalysisResult } from '../types';

interface ConfigPanelProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  swarmSize: number;
  setSwarmSize: (size: number) => void;
  model: string;
  setModel: (model: string) => void;
  isLoading: boolean;
  isAnalyzing: boolean;
  isSwarming: boolean;
  analysisResult: AnalysisResult | null;
  analysisError: string | null;
  onAnalyze: () => void;
  onLaunch: () => void;
  onReset: () => void;
  onDismissAnalysisError: () => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({
  prompt,
  setPrompt,
  swarmSize,
  setSwarmSize,
  model,
  setModel,
  isLoading,
  isAnalyzing,
  isSwarming,
  analysisResult,
  analysisError,
  onAnalyze,
  onLaunch,
  onReset,
  onDismissAnalysisError,
}) => {
  const isAnalyzed = analysisResult !== null;
  const isInitialState = !isAnalyzed && !isAnalyzing && !analysisError;

  const renderAnalysisSection = () => {
    if (!analysisResult) return null;
    
    return (
      <div className="space-y-4 text-sm animate-fade-in">
        <details className="bg-slate-900/50 p-3 rounded-md border border-slate-700">
            <summary className="font-semibold text-cyan-300 cursor-pointer">STRATEGIC BRIEFING</summary>
            <p className="mt-2 p-2 bg-slate-800 border border-slate-600 rounded-md text-slate-300 whitespace-pre-wrap font-mono text-xs">{analysisResult.improvedPrompt}</p>
        </details>
        <details className="bg-slate-900/50 p-3 rounded-md border border-slate-700">
            <summary className="font-semibold text-cyan-300 cursor-pointer">AGENT ROSTER</summary>
            <ul className="mt-2 space-y-2">
                {analysisResult.agents.map(agent => (
                <li key={agent.name} className="p-2 bg-slate-800/70 rounded-md">
                    <strong className="text-slate-200 font-mono">{agent.name}:</strong>
                    <span className="text-slate-400 ml-2 text-xs">{agent.description}</span>
                </li>
                ))}
            </ul>
        </details>
        <details className="bg-slate-900/50 p-3 rounded-md border border-slate-700">
            <summary className="font-semibold text-cyan-300 cursor-pointer">TOOLKIT</summary>
            <ul className="mt-2 space-y-2">
                {analysisResult.tools.map(tool => (
                <li key={tool.name} className="p-2 bg-slate-800/70 rounded-md">
                    <strong className="text-slate-200 font-mono">{tool.name}:</strong>
                    <span className="text-slate-400 ml-2 text-xs">{tool.description}</span>
                </li>
                ))}
            </ul>
        </details>
      </div>
    );
  };
  
  return (
    <div className="w-full md:w-[450px] bg-slate-950/70 backdrop-blur-sm border-r border-slate-700/50 p-4 flex flex-col">
      <div className="flex justify-between items-center flex-shrink-0">
        <h2 className="text-lg font-bold text-white tracking-wider">COMMAND CONSOLE</h2>
        {(isAnalyzed || analysisError) && (
           <button onClick={onReset} className="text-sm text-slate-400 hover:text-white flex items-center transition" title="Start Over">
             <ResetIcon />
           </button>
        )}
      </div>

      <div className="flex-grow mt-4 overflow-y-auto space-y-4 pr-2">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-cyan-300 mb-2">
            MISSION OBJECTIVE
          </label>
          <textarea
            id="prompt"
            rows={isAnalyzed ? 2 : 5}
            className="w-full p-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 text-sm"
            placeholder="e.g., Build a simple to-do list app with React."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading || isAnalyzed}
          />
        </div>

        {analysisError && (
          <ErrorAlert
            title="Analysis Failed"
            message={analysisError}
            onDismiss={onDismissAnalysisError}
          />
        )}

        {renderAnalysisSection()}

        {isAnalyzed && (
          <div className="border-t border-slate-700 pt-4 mt-4 space-y-4">
            <div>
              <label htmlFor="swarmSize" className="block text-sm font-medium text-cyan-300 mb-2">
                SWARM SIZE: <span className="font-bold text-cyan-300 font-mono">{swarmSize} Agents</span>
              </label>
              <input
                id="swarmSize"
                type="range"
                min="1"
                max="50"
                value={swarmSize}
                onChange={(e) => setSwarmSize(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="model" className="block text-sm font-medium text-cyan-300 mb-2">
                AGENT MODEL
              </label>
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
        )}
      </div>

      <div className="mt-4 flex-shrink-0">
        {isInitialState && (
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing || !prompt}
            className="w-full flex items-center justify-center px-4 py-3 bg-violet-600 text-white font-bold rounded-md hover:bg-violet-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-[0_0_15px_rgba(139,92,246,0.5)]"
          >
            <MagicWandIcon />
            {isAnalyzing ? 'ANALYZING...' : 'INITIALIZE PLAN'}
          </button>
        )}
        {isAnalyzing && (
            <button
                disabled
                className="w-full flex items-center justify-center px-4 py-3 bg-slate-600 text-white font-bold rounded-md"
              >
              <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ANALYZING...
            </button>
        )}
        {isAnalyzed && (
          <button
            onClick={onLaunch}
            disabled={isSwarming || !analysisResult}
            className="w-full flex items-center justify-center px-4 py-3 bg-cyan-600 text-white font-bold rounded-md hover:bg-cyan-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-[0_0_15px_rgba(34,211,238,0.5)]"
          >
            <RocketIcon />
            {isSwarming ? 'SWARM IN PROGRESS...' : 'DEPLOY SWARM'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ConfigPanel;
