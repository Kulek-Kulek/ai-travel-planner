'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { 
  updateUserRole, 
  updateUserTierAdmin, 
  type AdminUser 
} from '@/lib/actions/admin-user-actions';

interface UserManagementClientProps {
  initialUsers: AdminUser[];
  totalCount: number;
}

export function UserManagementClient({ 
  initialUsers, 
  totalCount 
}: UserManagementClientProps) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [filter, setFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [isPending, startTransition] = useTransition();

  const filteredUsers = users.filter(user => {
    if (filter === 'all') return true;
    return user.role === filter;
  });

  const handleRoleChange = async (userId: string, newRole: 'user' | 'admin') => {
    startTransition(async () => {
      const result = await updateUserRole(userId, newRole);
      if (result.success) {
        toast.success(`User role updated to ${newRole}`);
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } else {
        toast.error('Failed to update user role', {
          description: result.error,
        });
      }
    });
  };

  const handleTierChange = async (
    userId: string, 
    newTier: 'free' | 'payg' | 'pro'
  ) => {
    startTransition(async () => {
      const result = await updateUserTierAdmin(userId, newTier);
      if (result.success) {
        toast.success(`User tier updated to ${newTier.toUpperCase()}`);
        setUsers(users.map(u => u.id === userId ? { ...u, subscription_tier: newTier } : u));
      } else {
        toast.error('Failed to update user tier', {
          description: result.error,
        });
      }
    });
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      {/* Filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            All Users ({users.length})
          </Button>
          <Button
            variant={filter === 'user' ? 'default' : 'outline'}
            onClick={() => setFilter('user')}
            size="sm"
          >
            Regular Users ({users.filter(u => u.role === 'user').length})
          </Button>
          <Button
            variant={filter === 'admin' ? 'default' : 'outline'}
            onClick={() => setFilter('admin')}
            size="sm"
          >
            Admins ({users.filter(u => u.role === 'admin').length})
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Itineraries
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.email}</div>
                  <div className="text-xs text-gray-500">{user.id.slice(0, 8)}...</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value as 'user' | 'admin')}
                    disabled={isPending}
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      user.role === 'admin'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    } border-none focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                      user.role === 'admin' ? 'focus:ring-red-500' : 'focus:ring-blue-500'
                    }`}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={user.subscription_tier}
                    onChange={(e) => handleTierChange(
                      user.id, 
                      e.target.value as 'free' | 'payg' | 'pro'
                    )}
                    disabled={isPending}
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      user.subscription_tier === 'free'
                        ? 'bg-gray-100 text-gray-800'
                        : user.subscription_tier === 'payg'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-purple-100 text-purple-800'
                    } border-none focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                      user.subscription_tier === 'free'
                        ? 'focus:ring-gray-500'
                        : user.subscription_tier === 'payg'
                        ? 'focus:ring-orange-500'
                        : 'focus:ring-purple-500'
                    }`}
                  >
                    <option value="free">Free</option>
                    <option value="payg">PAYG</option>
                    <option value="pro">Pro</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.itinerary_count || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No users found</p>
        </div>
      )}
    </div>
  );
}

