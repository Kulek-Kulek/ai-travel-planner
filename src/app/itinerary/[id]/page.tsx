import { getItinerary } from '@/lib/actions/itinerary-actions';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ItineraryActions } from '@/components/itinerary-actions';
import { createClient } from '@/lib/supabase/server';

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
    image_photographer_url 
  } = itinerary;

  // Check if current user is the owner
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = user?.id === user_id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <div className="flex gap-4 mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            ← Back to Home
          </Link>
          {isOwner && (
            <Link
              href="/my-plans"
              className="inline-flex items-center text-blue-600 hover:text-blue-800"
            >
              📋 My Plans
            </Link>
          )}
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
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {ai_plan.city || destination}
          </h1>
          
          <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-4">
            {/* Date range if available */}
            {start_date && end_date ? (
              <span className="flex items-center gap-2">
                <span className="text-xl">📅</span>
                <span>{new Date(start_date).toLocaleDateString('en-GB')} - {new Date(end_date).toLocaleDateString('en-GB')} ({days} {days === 1 ? 'day' : 'days'})</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-xl">📅</span>
                <span>{days} {days === 1 ? 'day' : 'days'}</span>
              </span>
            )}
            
            {/* Travelers */}
            <span className="flex items-center gap-2">
              <span className="text-xl">👥</span>
              <span>
                {travelers} adult{travelers > 1 ? 's' : ''}
                {children && children > 0 && (
                  <>, {children} {children === 1 ? 'child' : 'children'}
                  {child_ages && child_ages.length > 0 && ` (ages: ${child_ages.join(', ')})`}</>
                )}
              </span>
            </span>
            
            {/* Accessibility */}
            {has_accessibility_needs && (
              <span className="flex items-center gap-2 text-blue-600 font-medium">
                <span className="text-xl">♿</span>
                <span>Accessible</span>
              </span>
            )}
            
            {/* Created date */}
            <span className="flex items-center gap-2">
              <span className="text-xl">📆</span>
              <span>Created {new Date(created_at).toLocaleDateString()}</span>
            </span>
          </div>

          {notes && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-blue-900 mb-1">
                📝 Travel Notes:
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
                  className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full border border-blue-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

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
                    className="bg-gray-50 rounded-lg p-5 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {placeIndex + 1}. {place.name}
                        </h3>
                        <p className="text-gray-700 mb-3">{place.desc}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="text-lg">⏱️</span>
                          <span className="font-medium">{place.time}</span>
                        </div>
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
  );
}

