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
} from 'lucide-react';

export default async function BucketListItineraryPage({
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
                <BreadcrumbItem>
                  <Link href="/bucket-list" className="transition-colors text-slate-600 hover:text-slate-900">
                    Bucket List
                  </Link>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
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

          {/* Header with Title and Actions */}
          <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  {ai_plan.city || destination}
                </h1>

                {/* Trip Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-3 text-gray-700">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <CalendarDays className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Duration</p>
                      <p className="font-semibold">{days} {days === 1 ? 'day' : 'days'}</p>
                    </div>
                  </div>

                  {start_date && end_date && (
                    <div className="flex items-center gap-3 text-gray-700">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Calendar className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Dates</p>
                        <p className="font-semibold">
                          {new Date(start_date).toLocaleDateString('en-GB')} - {new Date(end_date).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-gray-700">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Travelers</p>
                      <p className="font-semibold">
                        {travelers} adult{travelers > 1 ? 's' : ''}
                        {children && children > 0 && `, ${children} ${children === 1 ? 'child' : 'children'}`}
                      </p>
                    </div>
                  </div>

                  {has_accessibility_needs && (
                    <div className="flex items-center gap-3 text-gray-700">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Accessibility className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Accessibility</p>
                        <p className="font-semibold">Accessible routes included</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {tags && tags.length > 0 && (
                  <div className="flex items-start gap-2 mb-4">
                    <Tag className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-block bg-blue-50 text-blue-700 text-sm px-3 py-1 rounded-full border border-blue-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {notes && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <FileText className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-amber-900 mb-1">Notes</h3>
                        <p className="text-amber-800 text-sm whitespace-pre-wrap">{notes}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Creation Date */}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>Created on {new Date(created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 lg:min-w-[200px]">
                <ItineraryLikeButton
                  itineraryId={id}
                  initialLikes={likes || 0}
                  destination={ai_plan.city || destination}
                />
                <ItineraryShareButton
                  itineraryId={id}
                  title={ai_plan.city || destination}
                  days={days}
                  places={ai_plan.days.slice(0, 2).flatMap(day => day.places.slice(0, 2).map(place => place.name)).slice(0, 3)}
                />
                <DownloadPDFButton
                  itinerary={itinerary}
                  className="w-full"
                />
                {isOwner && (
                  <ItineraryActions
                    itineraryId={id}
                    destination={ai_plan.city || destination}
                    isOwner={isOwner}
                    isPrivate={itinerary.is_private}
                    status={itinerary.status}
                  />
                )}
              </div>
            </div>

            {/* Booking.com CTA */}
            {start_date && end_date && (
              <BookingAccommodationCard
                destination={ai_plan.city || destination}
                checkIn={new Date(start_date)}
                checkOut={new Date(end_date)}
                adults={travelers}
                childrenCount={children}
                childAges={child_ages}
              />
            )}
          </div>

          {/* Itinerary Days */}
          <div className="space-y-6">
            {ai_plan.days.map((day, dayIndex) => (
              <div key={dayIndex} className="bg-white rounded-lg shadow-lg p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white font-bold text-lg">
                    {dayIndex + 1}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Day {dayIndex + 1}
                  </h2>
                </div>

                <div className="space-y-4">
                  {day.places.map((place, placeIndex) => (
                    <div key={placeIndex} className="border-l-4 border-blue-400 pl-4 py-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {place.name}
                          </h3>
                          <p className="text-gray-700 mb-2">{place.desc}</p>
                          {place.time && (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Clock className="w-4 h-4" />
                              <span>{place.time}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Map Section */}
          {isGoogleMapsEnabled() && (
            <div className="mt-6 bg-white rounded-lg shadow-lg p-6 md:p-8">
              <div className="flex items-center gap-2 mb-4">
                <Map className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">
                  Interactive Map
                </h2>
              </div>
              <ItineraryMap
                days={ai_plan.days}
                city={ai_plan.city || destination}
              />
              <div className="mt-4">
                <GoogleMapsButton
                  places={ai_plan.days.flatMap(day => day.places)}
                  destination={ai_plan.city || destination}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Accommodation Search CTA */}
          <div className="mt-6 bg-white rounded-lg shadow-lg p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <Hotel className="w-8 h-8 text-gray-700" />
              <h2 className="text-2xl font-bold text-gray-900">
                Need accommodation?
              </h2>
            </div>
            <p className="mb-6 text-gray-600">
              Find the perfect place to stay for your {days}-day trip to {ai_plan.city || destination}
            </p>
            <BookingAccommodationCard
              destination={ai_plan.city || destination}
              checkIn={start_date ? new Date(start_date) : new Date()}
              checkOut={end_date ? new Date(end_date) : new Date()}
              adults={travelers}
              childrenCount={children}
              childAges={child_ages}
            />
          </div>

          {/* Back to Bucket List */}
          <div className="mt-8 text-center">
            <Link
              href="/bucket-list"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Bucket List
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}

