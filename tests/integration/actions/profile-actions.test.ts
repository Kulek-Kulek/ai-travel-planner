/**
 * Integration tests for profile actions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Import after mocks
import { createClient } from '@/lib/supabase/server';

describe('Profile Actions', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: vi.fn(),
        updateUser: vi.fn(),
        signInWithPassword: vi.fn(),
      },
      from: vi.fn(),
    };

    (createClient as any).mockResolvedValue(mockSupabase);
  });

  describe('updateProfileName', () => {
    it('should require authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const formData = new FormData();
      formData.append('name', 'New Name');

      const { updateProfileName } = await import('@/lib/actions/profile-actions');
      const result = await updateProfileName(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Not authenticated');
      }
    });

    it('should validate name length', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      const formData = new FormData();
      formData.append('name', 'A'); // Too short

      const { updateProfileName } = await import('@/lib/actions/profile-actions');
      const result = await updateProfileName(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toHaveProperty('name');
      }
    });

    it('should update name successfully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      const mockQuery = {
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue(mockQuery),
      });

      const formData = new FormData();
      formData.append('name', 'John Doe');

      const { updateProfileName } = await import('@/lib/actions/profile-actions');
      const result = await updateProfileName(formData);

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    });

    it('should handle database errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      const mockQuery = {
        eq: vi.fn().mockResolvedValue({
          error: { message: 'Update failed' },
        }),
      };

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue(mockQuery),
      });

      const formData = new FormData();
      formData.append('name', 'John Doe');

      const { updateProfileName } = await import('@/lib/actions/profile-actions');
      const result = await updateProfileName(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Failed to update name');
      }
    });
  });

  describe('updatePassword', () => {
    it('should require authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const formData = new FormData();
      formData.append('currentPassword', 'oldpass');
      formData.append('newPassword', 'newpassword123');
      formData.append('confirmPassword', 'newpassword123');

      const { updatePassword } = await import('@/lib/actions/profile-actions');
      const result = await updatePassword(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Not authenticated');
      }
    });

    it('should validate password length', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      const formData = new FormData();
      formData.append('currentPassword', 'oldpass');
      formData.append('newPassword', '123'); // Too short
      formData.append('confirmPassword', '123');

      const { updatePassword } = await import('@/lib/actions/profile-actions');
      const result = await updatePassword(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toHaveProperty('newPassword');
      }
    });

    it('should validate password match', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      const formData = new FormData();
      formData.append('currentPassword', 'oldpass');
      formData.append('newPassword', 'newpassword123');
      formData.append('confirmPassword', 'different');

      const { updatePassword } = await import('@/lib/actions/profile-actions');
      const result = await updatePassword(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toHaveProperty('confirmPassword');
      }
    });

    it('should update password successfully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null,
      });

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'user-1' }, session: {} },
        error: null,
      });

      mockSupabase.auth.updateUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      const formData = new FormData();
      formData.append('currentPassword', 'oldpass');
      formData.append('newPassword', 'newpassword123');
      formData.append('confirmPassword', 'newpassword123');

      const { updatePassword } = await import('@/lib/actions/profile-actions');
      const result = await updatePassword(formData);

      expect(result.success).toBe(true);
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'oldpass',
      });
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'newpassword123',
      });
    });

    it('should handle Supabase errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null,
      });

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'user-1' }, session: {} },
        error: null,
      });

      mockSupabase.auth.updateUser.mockResolvedValue({
        data: null,
        error: { message: 'Password update failed' },
      });

      const formData = new FormData();
      formData.append('currentPassword', 'oldpass');
      formData.append('newPassword', 'newpassword123');
      formData.append('confirmPassword', 'newpassword123');

      const { updatePassword } = await import('@/lib/actions/profile-actions');
      const result = await updatePassword(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Failed to update password');
      }
    });
  });
});

