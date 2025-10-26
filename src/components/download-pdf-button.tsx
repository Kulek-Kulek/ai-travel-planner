'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { generateAndDownloadPDF, getItineraryPDFFilename } from '@/lib/utils/generate-pdf';
import type { Itinerary } from '@/lib/actions/itinerary-actions';

interface DownloadPDFButtonProps {
  itinerary: Itinerary;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function DownloadPDFButton({ 
  itinerary, 
  variant = 'outline',
  size = 'lg',
  className 
}: DownloadPDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    
    // Show generating toast
    const toastId = toast.loading('Generating your PDF...', {
      description: 'This may take a few seconds',
    });

    try {
      const filename = getItineraryPDFFilename(itinerary);
      const success = await generateAndDownloadPDF(itinerary, filename);

      if (success) {
        toast.success('PDF downloaded successfully! 📄', {
          id: toastId,
          description: 'Check your downloads folder',
        });
      } else {
        toast.error('Failed to generate PDF', {
          id: toastId,
          description: 'Please try again',
        });
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Something went wrong', {
        id: toastId,
        description: 'Please try again later',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={isGenerating}
      variant={variant}
      size={size}
      className={className}
    >
      {isGenerating ? (
        <>
          <Download className="w-5 h-5 opacity-50" />
          <span className="ml-2">Generating...</span>
        </>
      ) : (
        <>
          <Download className="w-5 h-5" />
          <span className="ml-2">Download PDF</span>
        </>
      )}
    </Button>
  );
}

