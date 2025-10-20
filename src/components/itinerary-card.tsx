import Link from 'next/link';
import Image from 'next/image';
import type { Itinerary } from '@/lib/actions/itinerary-actions';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface ItineraryCardProps {
  itinerary: Itinerary;
  showActions?: boolean;
  onTogglePrivacy?: (id: string, currentPrivacy: boolean) => void;
  onToggleStatus?: (id: string, currentStatus: string) => void;
  onDelete?: (id: string, destination: string) => void;
}

export function ItineraryCard({ 
  itinerary, 
  showActions = false,
  onTogglePrivacy,
  onToggleStatus,
  onDelete 
}: ItineraryCardProps) {
  const { 
    id, 
    destination, 
    days, 
    travelers, 
    start_date, 
    end_date, 
    children, 
    child_ages, 
    has_accessibility_needs,
    tags, 
    ai_plan, 
    created_at, 
    is_private, 
    status, 
    user_id, 
    image_url
  } = itinerary;
  
  // Get first few places as preview
  const previewPlaces = ai_plan.days
    .slice(0, 2)
    .flatMap(day => day.places.slice(0, 2).map(place => place.name))
    .slice(0, 4);
  
  const cardContent = (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden h-full border border-gray-200 hover:border-blue-400">
      {/* Image Header */}
      {image_url && (
        <div className="relative w-full h-48 bg-gray-200">
          <Image
            src={image_url}
            alt={`${ai_plan.city || destination} - Travel destination`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )}
      
      {/* Content */}
      <div className="p-5">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-xl font-bold text-gray-900">
            {ai_plan.city || destination}
          </h3>
          {/* Admin viewing indicator */}
          {showActions && !user_id && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium shrink-0">
              Anonymous
            </span>
          )}
        </div>
        <div className="space-y-1 mb-2">
          {/* Date range if available */}
          {start_date && end_date && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <span>📅</span>
              <span>{new Date(start_date).toLocaleDateString('en-GB')} - {new Date(end_date).toLocaleDateString('en-GB')}</span>
            </div>
          )}
          {!start_date && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <span>📅</span>
              <span>{days} {days === 1 ? 'day' : 'days'}</span>
            </div>
          )}
          
          {/* Travelers info */}
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <span>👥</span>
            <span>
              {travelers} adult{travelers > 1 ? 's' : ''}
              {children && children > 0 && (
                <>, {children} {children === 1 ? 'child' : 'children'} 
                {child_ages && child_ages.length > 0 && ` (ages: ${child_ages.join(', ')})`}</>
              )}
            </span>
          </div>
          
          {/* Accessibility indicator */}
          {has_accessibility_needs && (
            <div className="flex items-center gap-1 text-sm text-blue-600">
              <span>♿</span>
              <span>Accessible</span>
            </div>
          )}
        </div>
        
        {/* Privacy and Status badges (only when showActions is true) */}
        {showActions && (
          <div className="flex items-center gap-2">
            <span
              className={`inline-block px-2 py-1 text-xs rounded-full ${
                is_private
                  ? 'bg-gray-200 text-gray-700'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {is_private ? '🔒 Private' : '🌍 Public'}
            </span>
            {status === 'completed' && (
              <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                ✅ Completed
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Preview places - always show */}
      <div className="mb-3 h-[60px]">
        <p className="text-sm text-gray-700 line-clamp-3">
          {previewPlaces.length > 0 
            ? `Includes: ${previewPlaces.join(', ')}${ai_plan.days.flatMap(d => d.places).length > 4 ? ', and more...' : ''}`
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
      
      {/* Footer - different for gallery vs my plans */}
      {!showActions ? (
        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            {new Date(created_at).toLocaleDateString()}
          </span>
          <span className="text-sm text-blue-600 font-medium hover:underline">
            View Details →
          </span>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-4">
            Created {new Date(created_at).toLocaleDateString()}
          </p>
          
          {/* Actions (only in My Plans) */}
          <div className="pt-4 border-t border-gray-200">
            {/* Primary actions row */}
            <div className="flex gap-2">
              <Link href={`/itinerary/${id}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  👁️ View
                </Button>
              </Link>
              <Link href={`/itinerary/${id}/edit`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  ✏️ Edit & Regenerate
                </Button>
              </Link>
              
              {/* More Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="px-3">
                    <span className="text-lg">⋮</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {onTogglePrivacy && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        onTogglePrivacy(id, is_private);
                      }}
                      className="cursor-pointer"
                    >
                      {is_private ? (
                        <>
                          <span className="mr-2">🌍</span>
                          Make Public
                        </>
                      ) : (
                        <>
                          <span className="mr-2">🔒</span>
                          Make Private
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                  
                  {is_private && onToggleStatus && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        onToggleStatus(id, status || 'active');
                      }}
                      className="cursor-pointer"
                    >
                      {status === 'completed' ? (
                        <>
                          <span className="mr-2">↩️</span>
                          Reactivate
                        </>
                      ) : (
                        <>
                          <span className="mr-2">✅</span>
                          Mark as Done
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                  
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          onDelete(id, ai_plan.city);
                        }}
                        className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                      >
                        <span className="mr-2">🗑️</span>
                        Delete Itinerary
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );

  // Wrap with Link only if not showing actions (public gallery)
  if (!showActions) {
    return (
      <Link href={`/itinerary/${id}`} prefetch>
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}

