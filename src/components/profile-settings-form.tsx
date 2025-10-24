'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateProfileName, updatePassword } from '@/lib/actions/profile-actions';
import { toast } from 'sonner';

interface ProfileSettingsFormProps {
  initialName: string;
  email: string;
}

export function ProfileSettingsForm({ initialName, email }: ProfileSettingsFormProps) {
  const [isPendingName, startNameTransition] = useTransition();
  const [isPendingPassword, startPasswordTransition] = useTransition();
  const [nameErrors, setNameErrors] = useState<Record<string, string[]>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string[]>>({});

  const handleNameSubmit = async (formData: FormData) => {
    startNameTransition(async () => {
      const result = await updateProfileName(formData);
      
      if (result.success) {
        toast.success('Name updated successfully!');
        setNameErrors({});
      } else {
        if (typeof result.error === 'string') {
          toast.error(result.error);
        } else {
          setNameErrors(result.error);
        }
      }
    });
  };

  const handlePasswordSubmit = async (formData: FormData) => {
    startPasswordTransition(async () => {
      const result = await updatePassword(formData);
      
      if (result.success) {
        toast.success('Password updated successfully!');
        setPasswordErrors({});
        // Reset form
        const form = document.getElementById('password-form') as HTMLFormElement;
        form?.reset();
      } else {
        if (typeof result.error === 'string') {
          toast.error(result.error);
        } else {
          setPasswordErrors(result.error);
        }
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Account Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">Email</Label>
            <div className="mt-1 text-gray-900 bg-gray-50 px-4 py-2 rounded-md border border-gray-200">
              {email}
            </div>
            <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
          </div>
        </div>
      </div>

      {/* Update Name */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Display Name</h2>
        <p className="text-sm text-gray-600 mb-4">
          This name will appear on your itineraries in the public gallery (e.g., &quot;by Kris&quot;)
        </p>
        
        <form action={handleNameSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Your Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              defaultValue={initialName}
              placeholder="Enter your name, nickname, or alias"
              disabled={isPendingName}
              className="mt-1"
            />
            {nameErrors.name && (
              <p className="mt-1 text-sm text-red-600">{nameErrors.name[0]}</p>
            )}
          </div>
          
          <Button type="submit" disabled={isPendingName}>
            {isPendingName ? 'Saving...' : 'Save Name'}
          </Button>
        </form>
      </div>

      {/* Update Password */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Change Password</h2>
        <p className="text-sm text-gray-600 mb-4">
          Update your password to keep your account secure
        </p>
        
        <form id="password-form" action={handlePasswordSubmit} className="space-y-4">
          <div>
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              placeholder="Enter your current password"
              disabled={isPendingPassword}
              className="mt-1"
            />
            {passwordErrors.currentPassword && (
              <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword[0]}</p>
            )}
          </div>

          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              placeholder="Enter new password (min 8 characters)"
              disabled={isPendingPassword}
              className="mt-1"
            />
            {passwordErrors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword[0]}</p>
            )}
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              disabled={isPendingPassword}
              className="mt-1"
            />
            {passwordErrors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword[0]}</p>
            )}
          </div>
          
          <Button type="submit" disabled={isPendingPassword}>
            {isPendingPassword ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  );
}

