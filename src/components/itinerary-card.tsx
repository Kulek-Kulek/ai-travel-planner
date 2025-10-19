import Link from 'next/link';
import type { Itinerary } from '@/lib/actions/itinerary-actions';

interface ItineraryCardProps {
  itinerary: Itinerary;
}

export function ItineraryCard({ itinerary }: ItineraryCardProps) {
  const { id, destination, days, travelers, tags, ai_plan, created_at } = itinerary;
  
  // Get first few places as preview
  const previewPlaces = ai_plan.days
    .slice(0, 2)
    .flatMap(day => day.places.slice(0, 2).map(place => place.name))
    .slice(0, 4);
  
  return (
    <Link href={`/itinerary/${id}`}>
      <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 p-5 h-full cursor-pointer border border-gray-200 hover:border-blue-400">
        {/* Header */}
        <div className="mb-3">
          <h3 className="text-xl font-bold text-gray-900 mb-1">
            {ai_plan.city || destination}
          </h3>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              📅 {days} {days === 1 ? 'day' : 'days'}
            </span>
            <span className="flex items-center gap-1">
              👥 {travelers} {travelers === 1 ? 'traveler' : 'travelers'}
            </span>
          </div>
        </div>
        
        {/* Preview places */}
        <div className="mb-3">
          <p className="text-sm text-gray-700 line-clamp-2">
            {previewPlaces.length > 0 
              ? `Includes: ${previewPlaces.join(', ')}${ai_plan.days.flatMap(d => d.places).length > 4 ? '...' : ''}`
              : 'Click to view full itinerary'}
          </p>
        </div>
        
        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.slice(0, 6).map((tag, idx) => (
              <span
                key={idx}
                className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full border border-blue-200"
              >
                {tag}
              </span>
            ))}
            {tags.length > 6 && (
              <span className="inline-block text-blue-600 text-xs px-2 py-1">
                +{tags.length - 6} more
              </span>
            )}
          </div>
        )}
        
        {/* Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            {new Date(created_at).toLocaleDateString()}
          </span>
          <span className="text-sm text-blue-600 font-medium hover:underline">
            View Details →
          </span>
        </div>
      </div>
    </Link>
  );
}

