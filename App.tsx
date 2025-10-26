
import React, { useState, useCallback } from 'react';
import ConfigPanel from './components/ConfigPanel';
import ResultsDisplay from './components/ResultsDisplay';
import { generateSingleResponse, analyzeAndImprovePrompt } from './services/geminiService';
import { ResponseItem, ResponseStatus, AnalysisResult } from './types';

function App() {
  const [prompt, setPrompt] = useState<string>('');
  const [swarmSize, setSwarmSize] = useState<number>(10);
  const [model, setModel] = useState<string>('gemini-2.5-flash');
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [isSwarming, setIsSwarming] = useState<boolean>(false);
  
  // State for analysis
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [swarmError, setSwarmError] = useState<string | null>(null);

  const handleReset = useCallback(() => {
    setPrompt('');
    setAnalysisResult(null);
    setAnalysisError(null);
    setSwarmError(null);
    setResponses([]);
    setIsAnalyzing(false);
    setIsSwarming(false);
  }, []);

  const handleAnalyzePrompt = useCallback(async () => {
    if (!prompt || isAnalyzing || isSwarming) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisError(null);
    setSwarmError(null);
    setResponses([]);

    try {
      const result = await analyzeAndImprovePrompt(prompt);
      setAnalysisResult(result);
    } catch (error: any) {
      setAnalysisError(error.message || 'An unknown error occurred during prompt analysis. Check the console for more details.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [prompt, isAnalyzing, isSwarming]);

  const handleLaunchSwarm = useCallback(async () => {
    if (!analysisResult || isSwarming) return;

    setIsSwarming(true);
    setSwarmError(null);
    const initialResponses: ResponseItem[] = Array.from({ length: swarmSize }, (_, i) => ({
      id: i,
      status: ResponseStatus.PENDING,
      content: '', // Initialize with empty string for streaming
    }));
    setResponses(initialResponses);

    const processStream = async (responseItem: ResponseItem) => {
      try {
        const stream = generateSingleResponse(analysisResult.improvedPrompt, model);
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
              ? { ...r, status: ResponseStatus.SUCCESS }
              : r
          )
        );
      } catch (error: any) {
        setResponses(prev =>
          prev.map(r =>
            r.id === responseItem.id
              ? { ...r, status: ResponseStatus.ERROR, error: error.stack || error.message || 'An unknown stream error occurred' }
              : r
          )
        );
      }
    };

    try {
      const swarmPromises = initialResponses.map(processStream);
      await Promise.allSettled(swarmPromises);
    } catch (error: any) {
      setSwarmError(error.message || 'An unexpected error occurred while launching the swarm. Please try again.');
    } finally {
      setIsSwarming(false);
    }
  }, [analysisResult, swarmSize, model, isSwarming]);

  const isLoading = isAnalyzing || isSwarming;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50 p-4 sticky top-0 z-10">
        <h1 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          Swarm Orchestrator
        </h1>
      </header>
      <main className="flex flex-col md:flex-row" style={{ height: 'calc(100vh - 65px)' }}>
        <ConfigPanel
          prompt={prompt}
          setPrompt={setPrompt}
          swarmSize={swarmSize}
          setSwarmSize={setSwarmSize}
          model={model}
          setModel={setModel}
          isLoading={isLoading}
          isAnalyzing={isAnalyzing}
          isSwarming={isSwarming}
          analysisResult={analysisResult}
          analysisError={analysisError}
          onAnalyze={handleAnalyzePrompt}
          onLaunch={handleLaunchSwarm}
          onReset={handleReset}
          onDismissAnalysisError={() => setAnalysisError(null)}
        />
        <div className="flex-1 overflow-y-auto">
          <ResultsDisplay 
            responses={responses} 
            isLoading={isLoading} 
            swarmError={swarmError}
            onDismissSwarmError={() => setSwarmError(null)}
            analysisResult={analysisResult}
          />
        </div>
      </main>
    </div>
  );
}

export default App;