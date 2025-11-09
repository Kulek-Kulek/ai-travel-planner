/**
 * Utility to extract client IP address from request headers
 * Handles various proxy/CDN headers
 */

import { headers } from 'next/headers';

/**
 * Get the client's IP address from request headers
 * Checks multiple headers in order of preference:
 * 1. x-real-ip (common in Nginx proxies)
 * 2. x-forwarded-for (standard proxy header, takes first IP)
 * 3. x-client-ip (some CDNs)
 * 4. cf-connecting-ip (Cloudflare specific)
 * 5. true-client-ip (Cloudflare Enterprise)
 * 
 * @returns IP address string or '0.0.0.0' if unavailable
 */
export async function getClientIP(): Promise<string> {
  const headersList = await headers();
  
  // Try various headers in order of preference
  const ip = 
    headersList.get('x-real-ip') ||
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headersList.get('x-client-ip') ||
    headersList.get('cf-connecting-ip') ||
    headersList.get('true-client-ip') ||
    '0.0.0.0'; // Fallback if no IP found
  
  return ip;
}

/**
 * Check if an IP address is from a private network
 * Useful for development/testing environments
 */
export function isPrivateIP(ip: string): boolean {
  if (ip === '0.0.0.0' || ip === '127.0.0.1' || ip === '::1') {
    return true;
  }
  
  // Private IPv4 ranges
  const privateRanges = [
    /^10\./,          // 10.0.0.0/8
    /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
    /^192\.168\./,   // 192.168.0.0/16
    /^127\./,        // 127.0.0.0/8 (loopback)
  ];
  
  return privateRanges.some(range => range.test(ip));
}

