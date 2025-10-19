import { getUser } from '@/lib/actions/auth-actions';

export default async function ProfilePage() {
  const user = await getUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Profile Settings
        </h1>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="text-gray-900 bg-gray-50 px-4 py-2 rounded-md">
              {user?.email}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User ID
            </label>
            <div className="text-gray-600 bg-gray-50 px-4 py-2 rounded-md font-mono text-sm">
              {user?.id}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">
              Profile Preferences Coming Soon 🚀
            </h2>
            <p className="text-blue-700">
              In the next phase, you'll be able to set:
            </p>
            <ul className="list-disc list-inside text-blue-700 mt-2 space-y-1">
              <li>Travel interests and preferences</li>
              <li>Budget ranges</li>
              <li>Dietary requirements</li>
              <li>Accessibility needs</li>
              <li>Travel pace (slow, moderate, fast)</li>
            </ul>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}


