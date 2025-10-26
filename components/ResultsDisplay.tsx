import React from 'react';
import { ResponseItem, ResponseStatus } from '../types';
import ResponseCard from './ResponseCard';
import ErrorAlert from './ErrorAlert';

interface ResultsDisplayProps {
    responses: ResponseItem[];
    isLoading: boolean;
    swarmError: string | null;
    onDismissSwarmError: () => void;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ responses, isLoading, swarmError, onDismissSwarmError }) => {
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {responses.map(response => (
                        <ResponseCard key={response.id} response={response} />
                    ))}
                </div>
              </>
            )}
        </div>
    );
};

export default ResultsDisplay;
