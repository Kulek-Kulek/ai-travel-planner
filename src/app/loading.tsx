'use client';

export default function AppLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin">⏳</div>
          <p className="text-gray-700">Loading...</p>
        </div>
      </div>
    </div>
  );
}


