import { getItinerary } from '@/lib/actions/itinerary-actions';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ItineraryActions } from '@/components/itinerary-actions';
import { ItineraryLikeButton } from '@/components/itinerary-like-button';
import { ItineraryShareButton } from '@/components/itinerary-share-button';
import { DownloadPDFButton } from '@/components/download-pdf-button';
import { BookingAccommodationCard } from '@/components/booking-accommodation-card';
import { ItineraryMap } from '@/components/itinerary-map';
import { GoogleMapsButton } from '@/components/google-maps-button';
import { ScrollToTop } from '@/components/scroll-to-top';
import { isGoogleMapsEnabled } from '@/lib/config/google-maps';
import { createClient } from '@/lib/supabase/server';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { 
  Calendar, 
  Users, 
  Accessibility, 
  CalendarDays, 
  FileText, 
  Tag, 
  Clock,
  Map,
  Hotel,
  ExternalLink
} from 'lucide-react';

export default async function ItineraryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getItinerary(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const itinerary = result.data;
  const { 
    ai_plan, 
    destination, 
    days, 
    travelers, 
    start_date, 
    end_date, 
    children, 
    child_ages, 
    has_accessibility_needs,
    notes, 
    tags, 
    created_at, 
    user_id, 
    image_url, 
    image_photographer, 
    image_photographer_url,
    likes 
  } = itinerary;

  // Check if current user is the owner
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = user?.id === user_id;

  return (
    <>
      <ScrollToTop />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <Link href="/" className="transition-colors text-slate-600 hover:text-slate-900">
                  Home
                </Link>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              {isOwner && (
                <>
                  <BreadcrumbItem>
                    <Link href="/my-plans" className="transition-colors text-slate-600 hover:text-slate-900">
                      My Plans
                    </Link>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </>
              )}
              <BreadcrumbItem>
                <BreadcrumbPage>{ai_plan.city || destination}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Destination Image */}
        {image_url && (
          <div className="relative w-full h-48 md:h-64 rounded-lg overflow-hidden shadow-lg mb-6">
            <Image
              src={image_url}
              alt={`${ai_plan.city || destination} - Travel destination`}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
            />
            {/* Photo attribution overlay */}
            {image_photographer && image_photographer_url && (
              <div className="absolute bottom-0 right-0 bg-black/10 text-white text-xs px-2 py-1 m-2 rounded opacity-10">
                Photo by{' '}
                <a
                  href={image_photographer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-200"
                >
                  {image_photographer}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Header Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex-1">
              {ai_plan.city || destination}
            </h1>
            <div className="flex flex-wrap gap-2 shrink-0">
              <ItineraryLikeButton 
                itineraryId={id} 
                initialLikes={likes}
                destination={ai_plan.city || destination}
              />
              <ItineraryShareButton 
                itineraryId={id} 
                title={ai_plan.city || destination}
                description={`A ${days}-day travel itinerary for ${ai_plan.city || destination}`}
              />
              <DownloadPDFButton itinerary={itinerary} />
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-4">
            {/* Date range if available */}
            {start_date && end_date ? (
              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span>{new Date(start_date).toLocaleDateString('en-GB')} - {new Date(end_date).toLocaleDateString('en-GB')} ({days} {days === 1 ? 'day' : 'days'})</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span>{days} {days === 1 ? 'day' : 'days'}</span>
              </span>
            )}
            
            {/* Travelers */}
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span>
                {travelers} adult{travelers > 1 ? 's' : ''}
                {children && children > 0 ? (
                  <>, {children} {children === 1 ? 'child' : 'children'}
                  {child_ages && child_ages.length > 0 && ` (ages: ${child_ages.join(', ')})`}</>
                ) : null}
              </span>
            </span>
            
            {/* Accessibility */}
            {has_accessibility_needs && (
              <span className="flex items-center gap-2 text-blue-600 font-medium">
                <Accessibility className="w-5 h-5" />
                <span>Accessible</span>
              </span>
            )}
            
            {/* Created date */}
            <span className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              <span>Created {new Date(created_at).toLocaleDateString()}</span>
            </span>
          </div>

          {notes && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="flex items-center gap-2 text-sm font-medium text-blue-900 mb-1">
                <FileText className="w-4 h-4" /> Travel Notes:
              </p>
              <p className="text-blue-800">{notes}</p>
            </div>
          )}

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full border border-blue-200"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Booking Accommodation Card - Only show if dates are available */}
        {start_date && end_date && (
          <BookingAccommodationCard
            destination={ai_plan.city || destination}
            checkIn={new Date(start_date)}
            checkOut={new Date(end_date)}
            adults={travelers}
            childrenCount={children || 0}
            childAges={child_ages}
            className="mb-6"
          />
        )}

        {/* Quick Booking Button - Always visible */}
        {!start_date || !end_date ? (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Find Hotels in {ai_plan.city || destination}
            </h3>
            <a
              href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(ai_plan.city || destination)}&aid=2388329`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full group relative overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-6 py-3 transition-all duration-200 hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 text-white font-semibold"
            >
              <Hotel className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Search Hotels on Booking.com
              <ExternalLink className="w-4 h-4" />
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
            </a>
          </div>
        ) : null}

        {/* Interactive Map Section */}
        {isGoogleMapsEnabled() && (
          <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Map className="w-6 h-6 text-blue-600" />
                Map View
              </h2>
              <GoogleMapsButton
                places={ai_plan.days.flatMap(day => day.places)}
                destination={ai_plan.city || destination}
              />
            </div>
            <ItineraryMap
              days={ai_plan.days}
              city={ai_plan.city || destination}
              className="mb-4"
            />
            <p className="text-sm text-gray-600 mt-2">
              Click markers to see location names. Use the button above to open directions in Google Maps.
            </p>
          </div>
        )}

        {/* Itinerary Days */}
        <div className="space-y-6">
          {ai_plan.days.map((day, dayIndex) => (
            <div
              key={dayIndex}
              className="bg-white rounded-lg shadow-lg p-6 md:p-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b-4 border-blue-500 pb-3">
                {day.title}
              </h2>

              <div className="space-y-4">
                {day.places.map((place, placeIndex) => (
                  <div
                    key={placeIndex}
                    className="bg-gray-50 rounded-lg p-5 hover:bg-gray-100 transition-colors border-l-4 border-blue-500"
                  >
                    <div className="flex flex-col md:flex-row items-start gap-4">
                      {/* Time Badge */}
                      <div className="w-full md:w-auto flex-shrink-0">
                        <div className="bg-blue-600 text-white rounded-lg px-3 py-2 text-center md:min-w-[120px]">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div className="text-sm font-bold leading-tight whitespace-nowrap">
                            {place.time}
                          </div>
                        </div>
                      </div>
                      
                      {/* Place Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {placeIndex + 1}. {place.name}
                        </h3>
                        <p className="text-gray-700">{place.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <ItineraryActions
          itineraryId={id}
          destination={ai_plan.city || destination}
          isOwner={isOwner}
        />
      </main>
    </div>
    </>
  );
}

