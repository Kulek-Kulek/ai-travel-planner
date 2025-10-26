'use client';

import { useState } from 'react';
import { 
  Hotel, 
  Home, 
  Building2, 
  Palmtree, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  Calendar,
  Users,
  Moon
} from 'lucide-react';
import { generateBookingLinks, type BookingLinkParams } from '@/lib/utils/booking-affiliate';
import { cn } from '@/lib/utils';

interface BookingAccommodationCardProps {
  destination: string;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  childrenCount?: number;
  childAges?: number[];
  className?: string;
}

export function BookingAccommodationCard({
  destination,
  checkIn,
  checkOut,
  adults,
  childrenCount = 0,
  childAges,
  className,
}: BookingAccommodationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate number of nights
  const nights = Math.ceil(
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Generate booking links
  const params: BookingLinkParams = {
    destination,
    checkIn,
    checkOut,
    adults,
    children: childrenCount,
    childAges,
  };

  const links = generateBookingLinks(params);

  const accommodationTypes = [
    {
      id: 'hotels',
      label: 'Hotels & Resorts',
      icon: Hotel,
      description: 'Full-service hotels with amenities',
      link: links.hotels,
    },
    {
      id: 'apartments',
      label: 'Apartments & Homes',
      icon: Home,
      description: 'Perfect for families and longer stays',
      link: links.apartments,
    },
    {
      id: 'hostels',
      label: 'Hostels',
      icon: Building2,
      description: 'Budget-friendly shared accommodations',
      link: links.hostels,
    },
    {
      id: 'resorts',
      label: 'Resorts',
      icon: Palmtree,
      description: 'Luxury stays with premium facilities',
      link: links.resorts,
    },
  ];

  const handleLinkClick = () => {
    // Track click event (can be enhanced with analytics later)
  };

  return (
    <div className={cn('bg-white rounded-lg shadow-lg p-6', className)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Find Accommodation
          </h2>
          <p className="text-gray-600">
            Book your stay in {destination}
          </p>
        </div>
        <Hotel className="w-8 h-8 text-blue-600" />
      </div>

      {/* Trip Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-700">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>
              {checkIn.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })} - {checkOut.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Moon className="w-4 h-4 text-blue-600" />
            <span>{nights} {nights === 1 ? 'night' : 'nights'}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Users className="w-4 h-4 text-blue-600" />
            <span>
              {adults} adult{adults > 1 ? 's' : ''}
              {childrenCount > 0 && `, ${childrenCount} ${childrenCount === 1 ? 'child' : 'children'}`}
            </span>
          </div>
        </div>
      </div>

      {/* Primary CTA */}
      <a
        href={links.all}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleLinkClick}
        className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors mb-4"
      >
        Search All Accommodations
        <ExternalLink className="w-4 h-4" />
      </a>

      {/* Expandable Section */}
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-center gap-2 w-full text-blue-600 hover:text-blue-800 font-medium py-2 transition-colors"
        >
          <span>Browse by Type</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {isExpanded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {accommodationTypes.map((type) => {
              const IconComponent = type.icon;
              return (
                <a
                  key={type.id}
                  href={type.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleLinkClick}
                  className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all group"
                >
                  <IconComponent className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                      {type.label}
                    </h3>
                    <p className="text-sm text-gray-600">{type.description}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0 mt-1" />
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          We partner with Booking.com to help you find accommodations. 
          If you make a booking through our links, we may earn a commission at no extra cost to you.
        </p>
      </div>
    </div>
  );
}

