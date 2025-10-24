import { getUser } from '@/lib/actions/auth-actions';
import { getProfile } from '@/lib/actions/profile-actions';
import { ProfileSettingsForm } from '@/components/profile-settings-form';
import { redirect } from 'next/navigation';

export default async function ProfilePage() {
  const user = await getUser();
  
  if (!user) {
    redirect('/sign-in');
  }
  
  const profileResult = await getProfile();
  
  if (!profileResult.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              Profile Settings
            </h1>
            <p className="text-red-600">Failed to load profile. Please try again.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Profile Settings
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your account settings and preferences
          </p>
        </div>
        
        <ProfileSettingsForm 
          initialName={profileResult.data.name} 
          email={profileResult.data.email} 
        />

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            Travel Preferences Coming Soon 🚀
          </h2>
          <p className="text-blue-700">
            In the next phase, you&apos;ll be able to customize:
          </p>
          <ul className="list-disc list-inside text-blue-700 mt-2 space-y-1">
            <li>Travel interests and preferences</li>
            <li>Budget ranges and spending habits</li>
            <li>Dietary requirements and restrictions</li>
            <li>Accessibility needs</li>
            <li>Travel pace (slow, moderate, fast)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}


