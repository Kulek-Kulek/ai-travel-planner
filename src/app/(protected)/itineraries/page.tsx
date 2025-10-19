import { getUser } from '@/lib/actions/auth-actions';

export default async function ItinerariesPage() {
  const user = await getUser();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          My Itineraries
        </h1>
        <p className="text-gray-600 mb-4">
          Welcome, {user?.email}! This is where your saved itineraries will appear.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            Coming Soon 🚀
          </h2>
          <p className="text-blue-700">
            The itinerary saving functionality will be implemented in the next phase.
            For now, you can:
          </p>
          <ul className="list-disc list-inside text-blue-700 mt-2 space-y-1">
            <li>Generate itineraries from the home page</li>
            <li>View your generated plans</li>
            <li>Manage your profile settings</li>
          </ul>
        </div>
      </div>
    </div>
  );
}


