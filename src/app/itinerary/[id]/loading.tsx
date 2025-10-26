'use client';

export default function LoadingItinerary() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="space-y-4">
            <div className="h-6 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 bg-gray-100 rounded animate-pulse w-2/3" />

            <div className="mt-6 space-y-3">
              <div className="h-20 bg-gray-100 rounded animate-pulse" />
              <div className="h-20 bg-gray-100 rounded animate-pulse" />
              <div className="h-20 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


