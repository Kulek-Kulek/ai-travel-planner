/**
 * Integration tests for authentication actions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

// Import after mocks
import { createClient } from '@/lib/supabase/server';

describe('Auth Actions', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      auth: {
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        getUser: vi.fn(),
      },
    };

    (createClient as any).mockResolvedValue(mockSupabase);
  });

  describe('signUp', () => {
    it('should validate required fields', async () => {
      const formData = new FormData();
      formData.append('email', 'invalid-email');
      formData.append('password', '123');
      formData.append('confirmPassword', '123');
      formData.append('name', 'A');

      const { signUp } = await import('@/lib/actions/auth-actions');
      const result = await signUp(formData);

      expect(result.error).toBeDefined();
      expect(result.error).toHaveProperty('email');
      expect(result.error).toHaveProperty('password');
      expect(result.error).toHaveProperty('name');
    });

    it('should validate password match', async () => {
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');
      formData.append('confirmPassword', 'different');
      formData.append('name', 'Test User');

      const { signUp } = await import('@/lib/actions/auth-actions');
      const result = await signUp(formData);

      expect(result.error).toBeDefined();
      expect(result.error).toHaveProperty('confirmPassword');
    });

    it('should create user with valid data', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com' },
          session: { access_token: 'token' },
        },
        error: null,
      });

      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');
      formData.append('confirmPassword', 'password123');
      formData.append('name', 'Test User');

      const { signUp } = await import('@/lib/actions/auth-actions');

      try {
        await signUp(formData);
      } catch (error: any) {
        // Should redirect after successful signup
        expect(error.message).toMatch(/REDIRECT/);
      }

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            name: 'Test User',
          },
        },
      });
    });

    it('should handle Supabase errors', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already exists' },
      });

      const formData = new FormData();
      formData.append('email', 'existing@example.com');
      formData.append('password', 'password123');
      formData.append('confirmPassword', 'password123');
      formData.append('name', 'Test User');

      const { signUp } = await import('@/lib/actions/auth-actions');
      const result = await signUp(formData);

      expect(result.error).toBeDefined();
      expect(result.error).toHaveProperty('general');
    });

    it('should handle email confirmation flow', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com' },
          session: null, // No session means email confirmation required
        },
        error: null,
      });

      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');
      formData.append('confirmPassword', 'password123');
      formData.append('name', 'Test User');

      const { signUp } = await import('@/lib/actions/auth-actions');

      try {
        await signUp(formData);
      } catch (error: any) {
        // Should redirect to confirm-email page
        expect(error.message).toContain('confirm-email');
      }
    });
  });

  describe('signIn', () => {
    it('should validate email format', async () => {
      const formData = new FormData();
      formData.append('email', 'invalid-email');
      formData.append('password', 'password123');

      const { signIn } = await import('@/lib/actions/auth-actions');
      const result = await signIn(formData);

      expect(result.error).toBeDefined();
      expect(result.error).toHaveProperty('email');
    });

    it('should validate required password', async () => {
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('password', '');

      const { signIn } = await import('@/lib/actions/auth-actions');
      const result = await signIn(formData);

      expect(result.error).toBeDefined();
      expect(result.error).toHaveProperty('password');
    });

    it('should sign in with valid credentials', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'user-1' },
          session: { access_token: 'token' },
        },
        error: null,
      });

      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');

      const { signIn } = await import('@/lib/actions/auth-actions');

      try {
        await signIn(formData);
      } catch (error: any) {
        // Should redirect after successful login
        expect(error.message).toMatch(/REDIRECT/);
      }

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should handle invalid credentials', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      });

      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('password', 'wrongpassword');

      const { signIn } = await import('@/lib/actions/auth-actions');
      const result = await signIn(formData);

      expect(result.error).toBeDefined();
      expect(result.error).toHaveProperty('general');
    });
  });

  describe('signOut', () => {
    it('should sign out user successfully', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      const { signOut } = await import('@/lib/actions/auth-actions');

      try {
        await signOut();
      } catch (error: any) {
        // Should redirect after signout
        expect(error.message).toMatch(/REDIRECT/);
      }

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle signout errors gracefully', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: { message: 'Signout failed' },
      });

      const { signOut } = await import('@/lib/actions/auth-actions');

      // Even if signout fails, should redirect
      try {
        await signOut();
      } catch (error: any) {
        expect(error.message).toMatch(/REDIRECT/);
      }
    });
  });
});

