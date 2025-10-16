'use client';

import { useQuery } from '@tanstack/react-query';

// Simple test function that simulates fetching data
async function fetchTestData() {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    message: '🎉 TanStack Query is working!',
    timestamp: new Date().toISOString(),
    status: 'success',
  };
}

export function TestQuery() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['test-data'],
    queryFn: fetchTestData,
  });

  return (
    <div className="bg-white shadow-lg rounded-lg p-8 max-w-md">
      <h2 className="text-2xl font-bold mb-4">TanStack Query Test</h2>
      
      {isLoading && (
        <div className="text-blue-600 animate-pulse">
          Loading test data...
        </div>
      )}
      
      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
          Error: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}
      
      {data && (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded">
            <p className="font-semibold">{data.message}</p>
          </div>
          
          <div className="text-sm text-gray-600">
            <p><strong>Timestamp:</strong> {data.timestamp}</p>
            <p><strong>Status:</strong> {data.status}</p>
          </div>
          
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Refetch Data
          </button>
        </div>
      )}
      
      <div className="mt-6 text-xs text-gray-500">
        <p>✅ Provider is working</p>
        <p>✅ useQuery hook is functional</p>
        <p>✅ React Query DevTools available (bottom-right)</p>
      </div>
    </div>
  );
}

