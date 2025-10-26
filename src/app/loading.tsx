'use client';

export default function AppLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></div>
            <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" style={{animationDelay: '0.2s'}}></div>
            <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" style={{animationDelay: '0.4s'}}></div>
          </div>
        </div>
      </div>
    </div>
  );
}


