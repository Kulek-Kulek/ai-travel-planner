/**
 * Multi-Source Photo Client with AI Verification
 * 
 * Features:
 * - Fetches photos from BOTH Pexels AND Unsplash for maximum variety
 * - AI verification selects the best photo from combined results
 * - Smart search query building based on destination and user notes
 * - Fallback strategies for reliable photo selection
 * 
 * Environment Variables:
 * - PEXELS_API_KEY: Required for Pexels photos
 * - UNSPLASH_ACCESS_KEY: Required for Unsplash photos
 * - OPENROUTER_API_KEY: Required for AI verification (optional)
 * - ENABLE_AI_PHOTO_VERIFICATION: Set to 'false' to disable AI verification
 * 
 * To disable AI verification, add to .env.local:
 * ENABLE_AI_PHOTO_VERIFICATION=false
 */

import { createClient } from 'pexels';
import { createApi } from 'unsplash-js';
import { openrouter } from '@/lib/openrouter/client';

const pexelsClient = process.env.PEXELS_API_KEY 
  ? createClient(process.env.PEXELS_API_KEY)
  : null;

const unsplashClient = process.env.UNSPLASH_ACCESS_KEY
  ? createApi({ accessKey: process.env.UNSPLASH_ACCESS_KEY })
  : null;

export type PhotoResult = {
  url: string;
  photographer?: string;
  photographerUrl?: string;
};

// Unified photo type for AI evaluation (works with both Pexels and Unsplash)
type UnifiedPhoto = {
  source: 'pexels' | 'unsplash';
  alt: string;
  photographer: string;
  photographerUrl: string;
  imageUrl: string;
};

// AI plan structure
type AIPlace = { name: string; desc: string; time: string };
type AIDay = { title: string; places: AIPlace[] };
type AIPlan = { city: string; days: AIDay[] };

/**
 * Fetch photos from both Pexels and Unsplash, let AI pick the best
 * @param destination - Main destination (e.g., "Rome", "Paris")
 * @param notes - User notes that may contain specific landmarks
 * @param aiPlan - AI-generated itinerary with specific places to visit
 * @returns Photo URL with optional attribution or null if not found
 */
export async function fetchDestinationPhoto(
  destination: string,
  notes?: string,
  aiPlan?: AIPlan
): Promise<PhotoResult | null> {
  try {
    const searchQuery = buildSearchQuery(destination, notes, aiPlan);
    console.log(`🔍 Searching both Pexels and Unsplash for: "${searchQuery}"`);

    // Fetch from both sources in parallel
    const [pexelsPhotos, unsplashPhotos] = await Promise.all([
      fetchFromPexels(searchQuery),
      fetchFromUnsplash(searchQuery),
    ]);

    // Combine results
    const allPhotos: UnifiedPhoto[] = [
      ...pexelsPhotos,
      ...unsplashPhotos,
    ];

    if (allPhotos.length === 0) {
      console.warn(`No photos found for ${destination}, trying fallback`);
      return fetchFallbackPhoto(destination);
    }

    console.log(`📸 Found ${allPhotos.length} photos total (${pexelsPhotos.length} Pexels + ${unsplashPhotos.length} Unsplash)`);

    // AI Verification: Let AI pick the best from both sources
    const enableAIVerification = process.env.ENABLE_AI_PHOTO_VERIFICATION !== 'false';
    
    if (enableAIVerification && process.env.OPENROUTER_API_KEY && allPhotos.length > 1) {
      console.log(`🤖 AI will pick the best photo from ${allPhotos.length} candidates`);
      
      // Build context from AI plan
      const planLandmarks = extractLandmarksFromPlan(aiPlan);
      const planContext = planLandmarks.length > 0 
        ? planLandmarks.slice(0, 5).join(', ') 
        : undefined;
      
      const verifiedPhoto = await verifyPhotoWithAI(destination, notes, allPhotos, searchQuery, planContext);
      
      if (verifiedPhoto) {
        console.log(`✅ AI selected best photo for ${destination}`);
        return verifiedPhoto;
      }
      
      console.warn(`⚠️ AI verification failed, using smart random selection`);
    } else {
      console.log(`📸 AI verification disabled, using smart random selection`);
    }
    
    // Smart Random Selection: Prefer photos from the top results
    const topPhotos = allPhotos.slice(0, 10);
    const randomIndex = Math.floor(Math.random() * topPhotos.length);
    const selectedPhoto = topPhotos[randomIndex];

    return {
      url: selectedPhoto.imageUrl,
      photographer: selectedPhoto.photographer,
      photographerUrl: selectedPhoto.photographerUrl,
    };
  } catch (error) {
    console.error('Error fetching destination photo:', error);
    return null;
  }
}

/**
 * Fetch photos from Pexels
 */
async function fetchFromPexels(query: string): Promise<UnifiedPhoto[]> {
  if (!pexelsClient) {
    console.log('Pexels API not configured, skipping');
    return [];
  }

  try {
    const randomPage = Math.floor(Math.random() * 3) + 1;
    const result = await pexelsClient.photos.search({
      query,
      per_page: 8,
      page: randomPage,
      orientation: 'landscape',
    });

    if ('error' in result || !result.photos || result.photos.length === 0) {
      console.log('No Pexels photos found');
      return [];
    }

    return result.photos.map(photo => ({
      source: 'pexels' as const,
      alt: photo.alt || 'Travel destination photo',
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      imageUrl: photo.src.large,
    }));
  } catch (error) {
    console.error('Pexels fetch error:', error);
    return [];
  }
}

/**
 * Fetch photos from Unsplash
 */
async function fetchFromUnsplash(query: string): Promise<UnifiedPhoto[]> {
  if (!unsplashClient) {
    console.log('Unsplash API not configured, skipping');
    return [];
  }

  try {
    const randomPage = Math.floor(Math.random() * 3) + 1;
    const result = await unsplashClient.search.getPhotos({
      query,
      page: randomPage,
      perPage: 8,
      orientation: 'landscape',
    });

    if (result.errors || !result.response || result.response.results.length === 0) {
      console.log('No Unsplash photos found');
      return [];
    }

    return result.response.results.map(photo => ({
      source: 'unsplash' as const,
      alt: photo.alt_description || photo.description || 'Travel destination photo',
      photographer: photo.user.name,
      photographerUrl: photo.user.links.html,
      imageUrl: photo.urls.regular,
    }));
  } catch (error) {
    console.error('Unsplash fetch error:', error);
    return [];
  }
}

/**
 * Verify photo relevance and quality using AI
 * Returns the best photo from the candidates or null if all are unsuitable
 */
async function verifyPhotoWithAI(
  destination: string,
  notes: string | undefined,
  photos: UnifiedPhoto[],
  searchQuery: string,
  planContext?: string
): Promise<PhotoResult | null> {
  try {
    // Skip AI verification if OpenRouter is not configured
    if (!process.env.OPENROUTER_API_KEY) {
      console.warn('OpenRouter not configured, skipping AI photo verification');
      return null;
    }

    // Build photo descriptions for AI to evaluate
    const photoDescriptions = photos.map((photo, index) => ({
      index,
      source: photo.source,
      alt: photo.alt || 'No description',
      photographer: photo.photographer,
    }));
    
    console.log(`📋 Evaluating ${photos.length} photos for ${destination}:`, 
      photoDescriptions.map(p => `[${p.source}] ${p.alt}`));

    const prompt = `You are a travel photo curator for a TOURIST/TRAVEL APP. Select inspiring, positive photos that make people want to visit ${destination}.

You have photos from BOTH Pexels and Unsplash. Pick the BEST one regardless of source.

Destination: ${destination}
${notes ? `🎯 User's interests: ${notes}\n` : ''}
${planContext ? `📍 Key places in itinerary: ${planContext}\n` : ''}
Search query: "${searchQuery}"

Photos to evaluate (${photos.length} total from both sources):
${photoDescriptions.map(p => `${p.index + 1}. [${p.source.toUpperCase()}] "${p.alt}"`).join('\n')}

Rate each photo 1-10 based on:
1. Tourism appeal - Shows ${destination}'s beauty, landmarks, culture, or attractions
2. Positive/aspirational - Inspiring, inviting, makes people want to visit
3. Visual quality - Beautiful, well-composed, clear
${planContext ? `4. ⭐ PRIORITY: Matches landmarks in the itinerary (${planContext})` : ''}
${notes ? `5. Matches user interests: ${notes}` : ''}

✅ PREFER photos showing:
- Iconic landmarks and tourist attractions
- Beautiful architecture and cityscapes
- Scenic views and landscapes
- Local cuisine and dining experiences
- Cultural sites, museums, historical places
- Happy tourists/travelers enjoying the destination
- Beaches, nature, parks (if relevant to destination)

❌ REJECT photos (score < 5) showing:
- War, conflict, refugees, poverty, or social issues
- Protests, political events, or controversial content
- Sad, depressing, or disturbing imagery
- Completely wrong destination (different city/country)
- Very low quality, blurry, or dark images
- Totally unrelated content

BE LENIENT - Most travel photos showing the destination positively are acceptable.

Return ONLY JSON:
{
  "bestPhotoIndex": 0,
  "reason": "1 sentence why",
  "scores": [8, 5, 3, 9, 6]
}

Pick highest score. Set bestPhotoIndex to -1 ONLY if ALL photos score below 5.`;

    const completion = await openrouter.chat.completions.create({
      model: 'anthropic/claude-3.5-sonnet',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 300,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      console.warn('No AI response for photo verification');
      return null;
    }

    const result = JSON.parse(content);
    const { bestPhotoIndex, reason, scores } = result;

    console.log(`🤖 AI scores for ${destination}:`, scores);
    console.log(`🎯 AI decision: Photo ${bestPhotoIndex + 1}, Reason: ${reason}`);

    if (bestPhotoIndex === -1 || bestPhotoIndex >= photos.length) {
      console.warn(`⚠️ AI rejected all photos for ${destination}: ${reason}`);
      console.warn(`📊 Photo scores were:`, scores);
      return null;
    }

    const selectedPhoto = photos[bestPhotoIndex];
    console.log(`✅ AI selected photo ${bestPhotoIndex + 1}/${photos.length} from ${selectedPhoto.source.toUpperCase()}: ${reason}`);

    return {
      url: selectedPhoto.imageUrl,
      photographer: selectedPhoto.photographer,
      photographerUrl: selectedPhoto.photographerUrl,
    };
  } catch (error) {
    console.error('❌ Error verifying photo with AI:', error);
    return null;
  }
}

/**
 * Extract key landmarks and places from AI-generated plan
 */
function extractLandmarksFromPlan(aiPlan?: AIPlan): string[] {
  if (!aiPlan || !aiPlan.days || aiPlan.days.length === 0) {
    return [];
  }

  const landmarks: string[] = [];
  
  // Get places from first 2 days (most iconic usually)
  for (const day of aiPlan.days.slice(0, 2)) {
    for (const place of day.places.slice(0, 3)) {
      // Extract landmark names
      const name = place.name.toLowerCase();
      
      // Common landmark patterns
      if (
        name.includes('colosseum') ||
        name.includes('tower') ||
        name.includes('cathedral') ||
        name.includes('basilica') ||
        name.includes('museum') ||
        name.includes('palace') ||
        name.includes('temple') ||
        name.includes('bridge') ||
        name.includes('fountain') ||
        name.includes('square') ||
        name.includes('arch') ||
        name.includes('castle') ||
        name.includes('garden') ||
        name.includes('beach') ||
        name.includes('park')
      ) {
        landmarks.push(place.name);
      }
    }
  }
  
  return landmarks;
}

/**
 * Build smart search query based on destination, user notes, and AI plan
 */
function buildSearchQuery(destination: string, notes?: string, aiPlan?: AIPlan): string {
  const destinationLower = destination.toLowerCase();
  const notesLower = notes?.toLowerCase() || '';
  
  // Extract landmarks from AI plan
  const planLandmarks = extractLandmarksFromPlan(aiPlan);
  if (planLandmarks.length > 0) {
    // Use the first landmark mentioned in the plan
    const firstLandmark = planLandmarks[0];
    console.log(`🎯 Using landmark from AI plan: ${firstLandmark}`);
    return `${firstLandmark} ${destination}`;
  }

  // Landmark keywords mapping
  const landmarkKeywords: Record<string, string[]> = {
    // Rome
    colosseum: ['colosseum rome', 'roman colosseum'],
    vatican: ['vatican rome', 'st peters basilica'],
    'trevi fountain': ['trevi fountain rome'],
    pantheon: ['pantheon rome'],
    'spanish steps': ['spanish steps rome'],
    
    // Paris
    'eiffel tower': ['eiffel tower paris'],
    louvre: ['louvre museum paris'],
    'arc de triomphe': ['arc de triomphe paris'],
    'notre dame': ['notre dame paris cathedral'],
    montmartre: ['montmartre paris'],
    versailles: ['versailles palace'],
    
    // London
    'big ben': ['big ben london'],
    'tower bridge': ['tower bridge london'],
    'london eye': ['london eye'],
    buckingham: ['buckingham palace'],
    westminster: ['westminster abbey'],
    
    // Tokyo
    shibuya: ['shibuya crossing tokyo'],
    'mount fuji': ['mount fuji japan'],
    'senso-ji': ['senso-ji temple'],
    'tokyo tower': ['tokyo tower'],
    shinjuku: ['shinjuku tokyo night'],
    
    // New York
    'statue of liberty': ['statue of liberty'],
    'empire state': ['empire state building'],
    'times square': ['times square new york'],
    'central park': ['central park new york'],
    brooklyn: ['brooklyn bridge'],
    manhattan: ['manhattan skyline'],
    
    // Miami
    miami: ['miami beach ocean'],
    'south beach': ['south beach miami'],
    'ocean drive': ['ocean drive miami'],
    
    // Los Angeles
    hollywood: ['hollywood sign'],
    'santa monica': ['santa monica pier'],
    malibu: ['malibu beach'],
    
    // San Francisco
    'golden gate': ['golden gate bridge'],
    'golden gate bridge': ['golden gate bridge'],
    alcatraz: ['alcatraz island'],
    
    // Las Vegas
    'las vegas': ['las vegas strip night'],
    strip: ['las vegas strip'],
    
    // Barcelona
    sagrada: ['sagrada familia'],
    'sagrada familia': ['sagrada familia barcelona'],
    'park guell': ['park guell barcelona'],
    gaudi: ['gaudi barcelona'],
    
    // Amsterdam
    amsterdam: ['amsterdam canals'],
    canal: ['amsterdam canal'],
    
    // Dubai
    dubai: ['burj khalifa'],
    burj: ['burj khalifa dubai'],
    
    // Sydney
    sydney: ['sydney opera house'],
    'opera house': ['sydney opera house'],
    
    // Generic keywords
    beach: ['tropical beach paradise'],
    mountain: ['mountain landscape'],
    food: ['local cuisine food'],
    pizza: ['pizza italian'],
    sushi: ['sushi japanese'],
    museum: ['art museum'],
    art: ['art gallery'],
    nature: ['nature landscape'],
  };

  // Check for specific landmarks in notes OR destination
  for (const [keyword, searches] of Object.entries(landmarkKeywords)) {
    if (notesLower.includes(keyword) || destinationLower.includes(keyword)) {
      // Use the first search term that includes the destination if possible
      const matchingSearch = searches.find(s => s.toLowerCase().includes(destinationLower));
      return matchingSearch || searches[0];
    }
  }

  // Destination-specific defaults (when no specific landmark mentioned)
  const destinationDefaults: Record<string, string> = {
    miami: 'miami beach aerial view',
    'los angeles': 'los angeles skyline sunset',
    'san francisco': 'golden gate bridge',
    'new york': 'manhattan skyline',
    'las vegas': 'las vegas strip lights',
    paris: 'eiffel tower sunset',
    london: 'london cityscape big ben',
    rome: 'colosseum rome sunset',
    barcelona: 'sagrada familia barcelona',
    amsterdam: 'amsterdam canals houses',
    tokyo: 'tokyo skyline night',
    dubai: 'burj khalifa dubai night',
    sydney: 'sydney opera house harbor',
    madrid: 'madrid royal palace',
    berlin: 'berlin brandenburg gate',
    vienna: 'vienna architecture',
    prague: 'prague old town',
    budapest: 'budapest parliament',
    lisbon: 'lisbon tram yellow',
    athens: 'acropolis athens',
  };

  // Check if we have a specific default for this destination
  for (const [destKeyword, searchTerm] of Object.entries(destinationDefaults)) {
    if (destinationLower.includes(destKeyword)) {
      return searchTerm;
    }
  }

  // Generic fallback: cityscape or landmark
  return `${destination} cityscape architecture`;
}

/**
 * Fallback to generic destination photo if specific search fails
 */
async function fetchFallbackPhoto(destination: string): Promise<PhotoResult | null> {
  try {
    if (!pexelsClient) return null;

    // Try multiple fallback searches in order of preference
    const fallbackQueries = [
      `${destination} skyline`,
      `${destination} landmark`,
      `${destination} architecture`,
      `${destination} travel`,
    ];

    for (const query of fallbackQueries) {
      // Randomize page for variety
      const randomPage = Math.floor(Math.random() * 2) + 1;
      
      const result = await pexelsClient.photos.search({
        query,
        per_page: 10, // Fetch multiple for variety
        page: randomPage,
        orientation: 'landscape',
      });

      if (!('error' in result) && result.photos && result.photos.length > 0) {
        // For fallback, use smart random (no AI verification to avoid over-filtering)
        // Prefer photos from top results which are usually more relevant
        const topPhotos = result.photos.slice(0, 6);
        const randomIndex = Math.floor(Math.random() * topPhotos.length);
        const photo = topPhotos[randomIndex];
        console.log(`📸 Selected fallback photo for ${destination} from ${query}`);
        return {
          url: photo.src.large,
          photographer: photo.photographer,
          photographerUrl: photo.photographer_url,
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching fallback photo:', error);
    return null;
  }
}

