'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export default function TestPexelsPage() {
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testPexels = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/test-pexels');
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError('Failed to test Pexels API');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6">🧪 Test Pexels API</h1>
          
          <p className="text-gray-600 mb-6">
            Click the button to test if your Pexels API key is working correctly.
          </p>

          <Button 
            onClick={testPexels} 
            disabled={isLoading}
            size="lg"
            className="w-full mb-6"
          >
            {isLoading ? 'Testing...' : 'Test Pexels API'}
          </Button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 font-semibold">❌ Error:</p>
              <p className="text-red-700">{error}</p>
              <div className="mt-4 text-sm text-red-600">
                <p className="font-semibold mb-2">Troubleshooting:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Check if PEXELS_API_KEY is in .env.local</li>
                  <li>Restart your dev server</li>
                  <li>Verify API key is correct from Pexels dashboard</li>
                </ul>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-semibold">✅ Success!</p>
                <p className="text-green-700">Pexels API is working correctly</p>
              </div>

              {result.photo && (
                <div>
                  <h3 className="font-semibold mb-2">Test Photo (Beach):</h3>
                  <div className="relative w-full h-64 bg-gray-200 rounded-lg overflow-hidden">
                    <Image
                      src={result.photo.url}
                      alt="Test beach photo"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Photographer: {result.photo.photographer}
                  </p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>API Details:</strong>
                </p>
                <pre className="text-xs text-blue-700 mt-2 overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

