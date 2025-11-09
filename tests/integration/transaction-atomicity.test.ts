/**
 * Integration Tests for Transaction Atomicity (HIGH-1)
 * 
 * These tests verify that the transaction functions work correctly:
 * - create_itinerary_with_transaction()
 * - update_itinerary_with_transaction()
 * 
 * Tests ensure atomicity: either all operations succeed or all rollback
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Use actual Supabase client for integration tests
// These tests require a real database connection (local or staging)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase credentials not configured for tests');
}

const supabase = createClient(supabaseUrl, supabaseKey);

describe('Transaction Atomicity Tests (HIGH-1)', () => {
  let testUserId: string = 'test-user-id-placeholder';
  let testProfileId: string = 'test-profile-id-placeholder';

  beforeEach(async () => {
    // Create test user and profile
    // In real tests, you'd use a dedicated test database
    console.log('⚠️  Note: These tests require a test database instance');
    console.log('⚠️  Do NOT run against production!');
    
    // TODO: Implement actual test user creation when database is configured
    // const { data: testUser } = await supabase.auth.signUp({ email: 'test@test.com', password: 'test' });
    // testUserId = testUser.user.id;
  });

  afterEach(async () => {
    // Cleanup test data
    // TODO: Implement cleanup when database is configured
  });

  describe('create_itinerary_with_transaction()', () => {
    it('should create itinerary and deduct credits atomically', async () => {
      // This test verifies the basic success case
      
      const testData = {
        p_user_id: testUserId,
        p_destination: 'Paris',
        p_days: 3,
        p_travelers: 2,
        p_start_date: '2025-06-01',
        p_end_date: '2025-06-04',
        p_children: 0,
        p_child_ages: [],
        p_has_accessibility_needs: false,
        p_notes: 'Test trip',
        p_ai_plan: { days: [] },
        p_tags: ['city', 'europe'],
        p_is_private: false,
        p_image_url: null,
        p_image_photographer: null,
        p_image_photographer_url: null,
        p_status: 'published',
        p_model_key: 'gemini-flash',
        p_model_cost: 0.5,
        p_operation: 'create',
      };

      // Get initial credit balance
      const { data: profileBefore } = await supabase
        .from('profiles')
        .select('credits_balance')
        .eq('id', testUserId)
        .single();

      const initialBalance = profileBefore?.credits_balance || 0;

      // Call transaction function
      const { data, error } = await supabase.rpc(
        'create_itinerary_with_transaction',
        testData
      );

      // Assertions
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.success).toBe(true);
      expect(data.itinerary_id).toBeDefined();

      // Verify itinerary was created
      const { data: itinerary } = await supabase
        .from('itineraries')
        .select('*')
        .eq('id', data.itinerary_id)
        .single();

      expect(itinerary).toBeDefined();
      expect(itinerary.destination).toBe('Paris');
      expect(itinerary.user_id).toBe(testUserId);

      // Verify credits were deducted
      const { data: profileAfter } = await supabase
        .from('profiles')
        .select('credits_balance')
        .eq('id', testUserId)
        .single();

      expect(profileAfter?.credits_balance).toBe(initialBalance - 0.5);

      // Verify usage log was created
      const { data: usageLog } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .eq('plan_id', data.itinerary_id)
        .single();

      expect(usageLog).toBeDefined();
      expect(usageLog.credits_deducted).toBe(0.5);
      expect(usageLog.success).toBe(true);
    });

    it('should rollback when insufficient credits', async () => {
      // This test verifies rollback on credit check failure
      
      // Set user to PAYG with 0.3 credits
      await supabase
        .from('profiles')
        .update({
          subscription_tier: 'payg',
          credits_balance: 0.3,
        })
        .eq('id', testUserId);

      const testData = {
        p_user_id: testUserId,
        p_destination: 'Rome',
        p_days: 3,
        p_travelers: 2,
        p_start_date: null,
        p_end_date: null,
        p_children: 0,
        p_child_ages: [],
        p_has_accessibility_needs: false,
        p_notes: null,
        p_ai_plan: { days: [] },
        p_tags: ['city'],
        p_is_private: false,
        p_image_url: null,
        p_image_photographer: null,
        p_image_photographer_url: null,
        p_status: 'published',
        p_model_key: 'gemini-flash',
        p_model_cost: 0.5, // Costs more than available
        p_operation: 'create',
      };

      // Call transaction function (should fail)
      const { data, error } = await supabase.rpc(
        'create_itinerary_with_transaction',
        testData
      );

      // Assertions - transaction should fail
      expect(data.success).toBe(false);
      expect(data.error).toContain('Insufficient credits');

      // Verify NO itinerary was created
      const { data: itineraries } = await supabase
        .from('itineraries')
        .select('id')
        .eq('user_id', testUserId)
        .eq('destination', 'Rome');

      expect(itineraries).toEqual([]);

      // Verify credits were NOT deducted
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits_balance')
        .eq('id', testUserId)
        .single();

      expect(profile?.credits_balance).toBe(0.3); // Still 0.3

      // Verify NO usage log was created
      const { data: usageLogs } = await supabase
        .from('ai_usage_logs')
        .select('id')
        .eq('user_id', testUserId)
        .eq('ai_model', 'gemini-flash')
        .order('created_at', { ascending: false })
        .limit(1);

      // Should be empty or not have a recent log
      if (usageLogs && usageLogs.length > 0) {
        // If there is a log, it should be marked as failure
        const { data: log } = await supabase
          .from('ai_usage_logs')
          .select('success')
          .eq('id', usageLogs[0].id)
          .single();
        
        expect(log?.success).toBe(false);
      }
    });

    it('should rollback entire transaction on database error', async () => {
      // This test simulates a database error during itinerary creation
      // In practice, this could be a constraint violation
      
      // Set up valid credits
      await supabase
        .from('profiles')
        .update({
          subscription_tier: 'payg',
          credits_balance: 5.0,
        })
        .eq('id', testUserId);

      const initialBalance = 5.0;

      // Try to create with invalid data that will fail DB constraint
      const testData = {
        p_user_id: testUserId,
        p_destination: '', // Empty destination should fail
        p_days: 0, // Invalid days should fail CHECK constraint
        p_travelers: 2,
        p_start_date: null,
        p_end_date: null,
        p_children: 0,
        p_child_ages: [],
        p_has_accessibility_needs: false,
        p_notes: null,
        p_ai_plan: { days: [] },
        p_tags: [],
        p_is_private: false,
        p_image_url: null,
        p_image_photographer: null,
        p_image_photographer_url: null,
        p_status: 'published',
        p_model_key: 'gemini-flash',
        p_model_cost: 0.5,
        p_operation: 'create',
      };

      // Call transaction function (should fail due to DB constraints)
      const { data, error } = await supabase.rpc(
        'create_itinerary_with_transaction',
        testData
      );

      // Transaction should fail
      expect(data.success).toBe(false);

      // Verify credits were NOT deducted (rollback worked)
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits_balance')
        .eq('id', testUserId)
        .single();

      expect(profile?.credits_balance).toBe(initialBalance);

      // Verify no orphaned itinerary
      const { data: itineraries } = await supabase
        .from('itineraries')
        .select('id')
        .eq('user_id', testUserId)
        .eq('days', 0);

      expect(itineraries).toEqual([]);
    });

    it('should handle concurrent transactions correctly', async () => {
      // This test verifies that concurrent transactions don't cause race conditions
      
      // Set user to PAYG with 1.0 credits
      await supabase
        .from('profiles')
        .update({
          subscription_tier: 'payg',
          credits_balance: 1.0,
        })
        .eq('id', testUserId);

      // Create test data for 3 concurrent requests (each costs 0.5)
      const createRequest = (destination: string) => ({
        p_user_id: testUserId,
        p_destination: destination,
        p_days: 2,
        p_travelers: 1,
        p_start_date: null,
        p_end_date: null,
        p_children: 0,
        p_child_ages: [],
        p_has_accessibility_needs: false,
        p_notes: null,
        p_ai_plan: { days: [] },
        p_tags: ['test'],
        p_is_private: false,
        p_image_url: null,
        p_image_photographer: null,
        p_image_photographer_url: null,
        p_status: 'published',
        p_model_key: 'gemini-flash',
        p_model_cost: 0.5,
        p_operation: 'create',
      });

      // Send 3 concurrent requests
      const promises = [
        supabase.rpc('create_itinerary_with_transaction', createRequest('Barcelona')),
        supabase.rpc('create_itinerary_with_transaction', createRequest('Madrid')),
        supabase.rpc('create_itinerary_with_transaction', createRequest('Lisbon')),
      ];

      const results = await Promise.all(promises);

      // Count successful transactions
      const successful = results.filter(r => r.data?.success).length;
      const failed = results.filter(r => !r.data?.success).length;

      // With 1.0 credits and 0.5 cost, only 2 should succeed
      expect(successful).toBe(2);
      expect(failed).toBe(1);

      // Verify final balance is 0
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits_balance')
        .eq('id', testUserId)
        .single();

      expect(profile?.credits_balance).toBe(0);

      // Verify exactly 2 itineraries were created
      const { data: itineraries } = await supabase
        .from('itineraries')
        .select('id')
        .eq('user_id', testUserId)
        .in('destination', ['Barcelona', 'Madrid', 'Lisbon']);

      expect(itineraries?.length).toBe(2);
    });
  });

  describe('update_itinerary_with_transaction()', () => {
    let existingItineraryId: string;

    beforeEach(async () => {
      // Create an itinerary to update
      const { data } = await supabase
        .from('itineraries')
        .insert({
          user_id: testUserId,
          destination: 'Original City',
          days: 3,
          travelers: 2,
          ai_plan: { days: [] },
          tags: ['original'],
          is_private: false,
          status: 'published',
        })
        .select('id')
        .single();

      existingItineraryId = data!.id;
    });

    it('should update itinerary and deduct credits atomically', async () => {
      // Set up credits
      await supabase
        .from('profiles')
        .update({
          subscription_tier: 'payg',
          credits_balance: 2.0,
        })
        .eq('id', testUserId);

      const testData = {
        p_user_id: testUserId,
        p_itinerary_id: existingItineraryId,
        p_destination: 'Updated City',
        p_days: 5,
        p_travelers: 4,
        p_start_date: null,
        p_end_date: null,
        p_children: 0,
        p_child_ages: [],
        p_has_accessibility_needs: false,
        p_notes: 'Updated notes',
        p_ai_plan: { days: [], updated: true },
        p_tags: ['updated'],
        p_image_url: null,
        p_image_photographer: null,
        p_image_photographer_url: null,
        p_model_key: 'gemini-flash',
        p_model_cost: 0.5,
        p_operation: 'edit',
      };

      // Call update transaction
      const { data, error } = await supabase.rpc(
        'update_itinerary_with_transaction',
        testData
      );

      // Assertions
      expect(error).toBeNull();
      expect(data.success).toBe(true);

      // Verify itinerary was updated
      const { data: itinerary } = await supabase
        .from('itineraries')
        .select('*')
        .eq('id', existingItineraryId)
        .single();

      expect(itinerary.destination).toBe('Updated City');
      expect(itinerary.days).toBe(5);
      expect(itinerary.travelers).toBe(4);
      expect(itinerary.edit_count).toBeGreaterThan(0);

      // Verify credits were deducted
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits_balance')
        .eq('id', testUserId)
        .single();

      expect(profile?.credits_balance).toBe(1.5); // 2.0 - 0.5
    });

    it('should reject unauthorized updates', async () => {
      const differentUserId = 'different-user-id';

      const testData = {
        p_user_id: differentUserId, // Different user trying to update
        p_itinerary_id: existingItineraryId,
        p_destination: 'Hacked City',
        p_days: 5,
        p_travelers: 4,
        p_start_date: null,
        p_end_date: null,
        p_children: 0,
        p_child_ages: [],
        p_has_accessibility_needs: false,
        p_notes: null,
        p_ai_plan: { days: [] },
        p_tags: [],
        p_image_url: null,
        p_image_photographer: null,
        p_image_photographer_url: null,
        p_model_key: 'gemini-flash',
        p_model_cost: 0.5,
        p_operation: 'edit',
      };

      // Should fail authorization check
      const { data, error } = await supabase.rpc(
        'update_itinerary_with_transaction',
        testData
      );

      expect(data.success).toBe(false);
      expect(data.error).toContain('not found or unauthorized');

      // Verify itinerary was NOT updated
      const { data: itinerary } = await supabase
        .from('itineraries')
        .select('destination')
        .eq('id', existingItineraryId)
        .single();

      expect(itinerary).toBeDefined();
      expect(itinerary?.destination).toBe('Original City'); // Unchanged
    });
  });

  describe('Transaction Function Signature Tests', () => {
    it('should have all required parameters for create function', async () => {
      // Test that function exists with correct signature
      const { data, error } = await supabase.rpc(
        'create_itinerary_with_transaction',
        {
          p_user_id: 'test',
          p_destination: 'test',
          p_days: 1,
          p_travelers: 1,
          p_start_date: null,
          p_end_date: null,
          p_children: 0,
          p_child_ages: [],
          p_has_accessibility_needs: false,
          p_notes: null,
          p_ai_plan: {},
          p_tags: [],
          p_is_private: false,
          p_image_url: null,
          p_image_photographer: null,
          p_image_photographer_url: null,
          p_status: 'published',
          p_model_key: 'gemini-flash',
          p_model_cost: 0.5,
          p_operation: 'create',
        }
      );

      // Should not error on signature mismatch
      // (will error on profile not found, which is expected)
      expect(error?.message).not.toContain('function');
      expect(error?.message).not.toContain('parameter');
    });

    it('should have all required parameters for update function', async () => {
      // Test that function exists with correct signature
      const { data, error } = await supabase.rpc(
        'update_itinerary_with_transaction',
        {
          p_user_id: 'test',
          p_itinerary_id: 'test-id',
          p_destination: 'test',
          p_days: 1,
          p_travelers: 1,
          p_start_date: null,
          p_end_date: null,
          p_children: 0,
          p_child_ages: [],
          p_has_accessibility_needs: false,
          p_notes: null,
          p_ai_plan: {},
          p_tags: [],
          p_image_url: null,
          p_image_photographer: null,
          p_image_photographer_url: null,
          p_model_key: 'gemini-flash',
          p_model_cost: 0.5,
          p_operation: 'edit',
        }
      );

      // Should not error on signature mismatch
      expect(error?.message).not.toContain('function');
      expect(error?.message).not.toContain('parameter');
    });
  });
});

/**
 * MANUAL TESTING GUIDE
 * ====================
 * 
 * These integration tests require a test database. To run them:
 * 
 * 1. Set up test environment:
 *    - Create a test Supabase project OR
 *    - Use local Supabase with: npx supabase start
 * 
 * 2. Run migrations:
 *    npx supabase db push
 * 
 * 3. Set test environment variables:
 *    export NEXT_PUBLIC_SUPABASE_URL="your-test-url"
 *    export NEXT_PUBLIC_SUPABASE_ANON_KEY="your-test-key"
 * 
 * 4. Run tests:
 *    npm test transaction-atomicity.test.ts
 * 
 * WARNING: Never run these tests against production!
 */

