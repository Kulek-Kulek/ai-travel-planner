/**
 * Anonymous Session Monitoring & Alerting
 * 
 * Provides monitoring functions to detect and alert on anonymous user abuse patterns.
 * Can be integrated with logging services (Sentry, LogRocket) or alerting systems (Slack, PagerDuty).
 */

import { createClient } from '@/lib/supabase/server';

export interface AbuseMetrics {
  newSessions24h: number;
  uniqueIPs24h: number;
  blockedSessions: number;
  blockedIPs: number;
  limitViolations: number;
  rateLimitedIPs: number;
  anonymousItinerariesToday: number;
  uniqueSessionsToday: number;
  bypassAttemptRatio: number;
  oldSessionsNeedingCleanup: number;
  suspiciousRefreshPatterns: number;
}

export interface AlertLevel {
  level: 'normal' | 'warning' | 'critical';
  message: string;
  metrics: AbuseMetrics;
  recommendations: string[];
}

/**
 * Get current abuse metrics
 */
export async function getAbuseMetrics(): Promise<AbuseMetrics> {
  const supabase = await createClient();
  
  try {
    // 1. New sessions in last 24 hours
    const { data: newSessions } = await supabase
      .from('anonymous_sessions')
      .select('ip_address', { count: 'exact' })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    const newSessions24h = newSessions?.length || 0;
    const uniqueIPs24h = new Set(newSessions?.map(s => s.ip_address) || []).size;
    
    // 2. Currently blocked sessions and IPs
    const { count: blockedSessions } = await supabase
      .from('anonymous_sessions')
      .select('*', { count: 'exact', head: true })
      .gt('blocked_until', new Date().toISOString());
    
    const { data: blockedIPsData } = await supabase
      .from('anonymous_sessions')
      .select('ip_address')
      .gt('blocked_until', new Date().toISOString());
    
    const blockedIPs = new Set(blockedIPsData?.map(s => s.ip_address) || []).size;
    
    // 3. Session limit violations in last hour
    const { count: limitViolations } = await supabase
      .from('anonymous_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('itineraries_created', 1)
      .gte('last_activity_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());
    
    // 4. IP rate limit hits
    const { count: rateLimitedIPs } = await supabase
      .from('ip_rate_limits')
      .select('*', { count: 'exact', head: true })
      .or('generations_last_hour.gte.2,generations_today.gte.3');
    
    // 5. Anonymous itineraries created today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const { data: anonItineraries } = await supabase
      .from('itineraries')
      .select('anonymous_session_id')
      .is('user_id', null)
      .gte('created_at', startOfDay.toISOString());
    
    const anonymousItinerariesToday = anonItineraries?.length || 0;
    const uniqueSessionsToday = new Set(
      anonItineraries?.map(i => i.anonymous_session_id).filter(Boolean) || []
    ).size;
    
    // 6. Bypass attempt ratio (should be close to 1.0 if fix working)
    const bypassAttemptRatio = uniqueSessionsToday > 0 
      ? anonymousItinerariesToday / uniqueSessionsToday 
      : 0;
    
    // 7. Old sessions needing cleanup
    const { count: oldSessionsNeedingCleanup } = await supabase
      .from('anonymous_sessions')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    
    // 8. Suspicious refresh patterns (>5 refreshes)
    const { count: suspiciousRefreshPatterns } = await supabase
      .from('anonymous_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('refresh_attempts', 5);
    
    return {
      newSessions24h: newSessions24h || 0,
      uniqueIPs24h: uniqueIPs24h || 0,
      blockedSessions: blockedSessions || 0,
      blockedIPs: blockedIPs || 0,
      limitViolations: limitViolations || 0,
      rateLimitedIPs: rateLimitedIPs || 0,
      anonymousItinerariesToday: anonymousItinerariesToday || 0,
      uniqueSessionsToday: uniqueSessionsToday || 0,
      bypassAttemptRatio: bypassAttemptRatio || 0,
      oldSessionsNeedingCleanup: oldSessionsNeedingCleanup || 0,
      suspiciousRefreshPatterns: suspiciousRefreshPatterns || 0,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Analyze metrics and determine alert level
 */
export function analyzeMetrics(metrics: AbuseMetrics): AlertLevel {
  const recommendations: string[] = [];
  let level: AlertLevel['level'] = 'normal';
  let message = 'All systems operating normally';
  
  // Check for mass attack (>1000 new sessions per hour)
  const sessionsPerHour = metrics.newSessions24h / 24;
  if (sessionsPerHour > 1000) {
    level = 'critical';
    message = 'CRITICAL: Possible bot attack detected';
    recommendations.push('Review blocked IPs immediately');
    recommendations.push('Consider temporarily increasing Turnstile difficulty');
    recommendations.push('Check application logs for patterns');
  } else if (sessionsPerHour > 500) {
    level = 'warning';
    message = 'WARNING: Elevated session creation rate';
    recommendations.push('Monitor closely for next hour');
  }
  
  // Check for bypass attempts (ratio should be close to 1.0)
  if (metrics.bypassAttemptRatio > 1.5) {
    level = 'critical';
    message = 'CRITICAL: Session limit bypass detected';
    recommendations.push('Verify database functions are working correctly');
    recommendations.push('Check application logs for bypass attempts');
    recommendations.push('Review recent code changes');
  } else if (metrics.bypassAttemptRatio > 1.2) {
    level = level === 'critical' ? 'critical' : 'warning';
    message = 'WARNING: Higher than expected bypass ratio';
    recommendations.push('Investigate potential session tracking issues');
  }
  
  // Check for excessive violations
  if (metrics.limitViolations > 100) {
    level = level === 'critical' ? 'critical' : 'warning';
    message = 'WARNING: High number of limit violations';
    recommendations.push('Users may be trying to bypass limits');
    recommendations.push('Review user education/messaging');
  }
  
  // Check for blocked sessions
  if (metrics.blockedSessions > 100) {
    level = 'warning';
    recommendations.push('Significant number of sessions blocked');
    recommendations.push('May indicate coordinated abuse attempt');
  }
  
  // Check cleanup needed
  if (metrics.oldSessionsNeedingCleanup > 10000) {
    recommendations.push('Database cleanup needed: Run cleanup_expired_anonymous_sessions()');
  }
  
  // Check suspicious refresh patterns
  if (metrics.suspiciousRefreshPatterns > 50) {
    recommendations.push('Suspicious refresh patterns detected');
    recommendations.push('Review sessions with high refresh_attempts');
  }
  
  // All good
  if (level === 'normal' && recommendations.length === 0) {
    recommendations.push('Continue normal monitoring');
  }
  
  return {
    level,
    message,
    metrics,
    recommendations,
  };
}

/**
 * Log alert (can be extended to send to Slack, PagerDuty, etc.)
 * Returns formatted alert message for logging service
 */
export function formatAlertMessage(alert: AlertLevel): string {
  const emoji = {
    normal: '✅',
    warning: '⚠️',
    critical: '🚨',
  };
  
  const lines = [
    `${emoji[alert.level]} Anonymous Session Monitoring Alert`,
    `Level: ${alert.level.toUpperCase()}`,
    `Message: ${alert.message}`,
    '',
    'Metrics:',
    `  - New sessions (24h): ${alert.metrics.newSessions24h}`,
    `  - Unique IPs (24h): ${alert.metrics.uniqueIPs24h}`,
    `  - Blocked sessions: ${alert.metrics.blockedSessions}`,
    `  - Blocked IPs: ${alert.metrics.blockedIPs}`,
    `  - Limit violations: ${alert.metrics.limitViolations}`,
    `  - Rate limited IPs: ${alert.metrics.rateLimitedIPs}`,
    `  - Anonymous itineraries today: ${alert.metrics.anonymousItinerariesToday}`,
    `  - Unique sessions today: ${alert.metrics.uniqueSessionsToday}`,
    `  - Bypass ratio: ${alert.metrics.bypassAttemptRatio.toFixed(2)}`,
    `  - Suspicious refreshes: ${alert.metrics.suspiciousRefreshPatterns}`,
    `  - Old sessions: ${alert.metrics.oldSessionsNeedingCleanup}`,
    '',
    'Recommendations:',
    ...alert.recommendations.map(rec => `  - ${rec}`),
  ];
  
  return lines.join('\n');
}

/**
 * Get cost savings estimate
 */
export async function getCostSavings(): Promise<{
  blockedAttempts: number;
  estimatedSavingsLow: number;
  estimatedSavingsHigh: number;
}> {
  const supabase = await createClient();
  
  try {
    // Get sessions that were blocked from creating more itineraries
    const { data: sessions } = await supabase
      .from('anonymous_sessions')
      .select('refresh_attempts, itineraries_created')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    
    // Count blocked attempts
    // - Refresh attempts that didn't result in itineraries
    // - Sessions that hit the limit (itineraries_created >= 1 but tried to create more)
    const blockedRefreshes = sessions?.reduce((sum, s) => sum + (s.refresh_attempts || 0), 0) || 0;
    const sessionBlocks = sessions?.filter(s => s.itineraries_created >= 1).length || 0;
    
    const blockedAttempts = blockedRefreshes + sessionBlocks;
    
    // Estimate cost savings ($0.05 - $0.50 per blocked API call)
    const estimatedSavingsLow = blockedAttempts * 0.05;
    const estimatedSavingsHigh = blockedAttempts * 0.50;
    
    return {
      blockedAttempts,
      estimatedSavingsLow,
      estimatedSavingsHigh,
    };
  } catch {
    return {
      blockedAttempts: 0,
      estimatedSavingsLow: 0,
      estimatedSavingsHigh: 0,
    };
  }
}

/**
 * Main monitoring function - call this periodically (e.g., every 5 minutes via cron)
 */
export async function monitorAnonymousSessions(): Promise<AlertLevel> {
  try {
    const metrics = await getAbuseMetrics();
    const alert = analyzeMetrics(metrics);
    
    // Format alert message if warning or critical
    if (alert.level !== 'normal') {
      // TODO: Send to external alerting system
      // const message = formatAlertMessage(alert);
      // await sendSlackAlert(message);
      // await sendPagerDutyAlert(message);
    }
    
    return alert;
  } catch (error) {
    throw error;
  }
}

/**
 * Cleanup expired sessions (call this daily via cron)
 */
export async function cleanupExpiredSessions(): Promise<{ deleted: number }> {
  const supabase = await createClient();
  
  try {
    await supabase.rpc('cleanup_expired_anonymous_sessions');
    
    return { deleted: 0 }; // Function doesn't return deleted count
  } catch (error) {
    throw error;
  }
}

