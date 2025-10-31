import { redirect } from 'next/navigation';
import Link from 'next/link';
import { isAdmin } from '@/lib/auth/admin';
import { 
  getAllUsers, 
  getUserStats, 
  type AdminUser 
} from '@/lib/actions/admin-user-actions';
import { UserManagementClient } from './user-management-client';
import { Button } from '@/components/ui/button';
import { Shield, LayoutDashboard, ArrowLeft } from 'lucide-react';

type UserStats = {
  totalUsers: number;
  adminUsers: number;
  regularUsers: number;
  freeUsers: number;
  paygUsers: number;
  proUsers: number;
};

export default async function AdminUsersPage() {
  // Check admin access
  const userIsAdmin = await isAdmin();
  if (!userIsAdmin) {
    redirect('/');
  }

  // Fetch users
  const usersResult = await getAllUsers({ limit: 100 });
  if (!usersResult.success) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error loading users: {usersResult.error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Fetch stats
  const statsResult = await getUserStats();
  const stats: UserStats = statsResult.success 
    ? statsResult.data 
    : {
        totalUsers: 0,
        adminUsers: 0,
        regularUsers: 0,
        freeUsers: 0,
        paygUsers: 0,
        proUsers: 0,
      };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <Shield className="w-8 h-8 text-blue-600" />
                Admin Dashboard - User Management
              </h1>
              <p className="text-gray-600">
                Manage user accounts, roles, and subscription tiers
              </p>
            </div>
            
            <Button asChild>
              <Link href="/admin/itineraries" className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" />
                View Itineraries
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Total Users</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Admins</p>
            <p className="text-2xl font-bold text-red-600">{stats.adminUsers}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Regular Users</p>
            <p className="text-2xl font-bold text-blue-600">{stats.regularUsers}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Free Tier</p>
            <p className="text-2xl font-bold text-gray-600">{stats.freeUsers}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <p className="text-sm text-gray-600">PAYG Tier</p>
            <p className="text-2xl font-bold text-orange-600">{stats.paygUsers}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Pro Tier</p>
            <p className="text-2xl font-bold text-purple-600">{stats.proUsers}</p>
          </div>
        </div>

        {/* User Management Table */}
        <UserManagementClient 
          initialUsers={usersResult.data.users} 
          totalCount={usersResult.data.total}
        />
      </div>
    </div>
  );
}

