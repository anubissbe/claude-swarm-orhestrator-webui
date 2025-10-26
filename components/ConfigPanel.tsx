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
      <div className="space-y-4 text-sm border-t border-gray-700 pt-4 mt-4 animate-fade-in">
        <div>
          <h3 className="font-semibold text-blue-300 mb-2">Improved Prompt</h3>
          <p className="p-3 bg-gray-800 border border-gray-600 rounded-md text-gray-300 whitespace-pre-wrap">{analysisResult.improvedPrompt}</p>
        </div>
        <div>
          <h3 className="font-semibold text-green-300 mb-2">Suggested Agents</h3>
          <ul className="space-y-2">
            {analysisResult.agents.map(agent => (
              <li key={agent.name} className="p-2 bg-gray-800/50 rounded-md">
                <strong className="text-gray-200">{agent.name}:</strong>
                <span className="text-gray-400 ml-2">{agent.description}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-purple-300 mb-2">Suggested Tools</h3>
          <ul className="space-y-2">
            {analysisResult.tools.map(tool => (
              <li key={tool.name} className="p-2 bg-gray-800/50 rounded-md">
                <strong className="text-gray-200">{tool.name}:</strong>
                <span className="text-gray-400 ml-2">{tool.description}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };
  
  return (
    <div className="w-full md:w-[450px] bg-gray-900/80 backdrop-blur-sm border-r border-gray-700/50 p-6 flex flex-col">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Configuration</h2>
        {(isAnalyzed || analysisError) && (
           <button onClick={onReset} className="text-sm text-gray-400 hover:text-white flex items-center transition">
             <ResetIcon /> Start Over
           </button>
        )}
      </div>

      <div className="flex-grow mt-6 overflow-y-auto space-y-6 pr-2">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">
            Your Project Idea
          </label>
          <textarea
            id="prompt"
            rows={isAnalyzed ? 3 : 6}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-md text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
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
          <div className="border-t border-gray-700 pt-4 mt-4 space-y-6">
            <div>
              <label htmlFor="swarmSize" className="block text-sm font-medium text-gray-300 mb-2">
                Swarm Size: <span className="font-bold text-blue-400">{swarmSize}</span>
              </label>
              <input
                id="swarmSize"
                type="range"
                min="1"
                max="50"
                value={swarmSize}
                onChange={(e) => setSwarmSize(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-300 mb-2">
                Swarm Model
              </label>
              <select
                id="model"
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-md text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
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

      <div className="mt-6">
        {isInitialState && (
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing || !prompt}
            className="w-full flex items-center justify-center px-4 py-3 bg-purple-600 text-white font-bold rounded-md hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
          >
            <MagicWandIcon />
            {isAnalyzing ? 'Analyzing...' : 'Analyze & Plan'}
          </button>
        )}
        {isAnalyzing && (
            <button
                disabled
                className="w-full flex items-center justify-center px-4 py-3 bg-purple-600 text-white font-bold rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300"
              >
              <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Analyzing Project...
            </button>
        )}
        {isAnalyzed && (
          <button
            onClick={onLaunch}
            disabled={isSwarming || !analysisResult}
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
          >
            <RocketIcon />
            {isSwarming ? 'Swarm In Progress...' : 'Launch Swarm'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ConfigPanel;
