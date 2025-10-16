'use client';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export const ToastDemo = () => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-semibold mb-4 text-gray-900">
        🎨 Toast Notifications Demo
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Click the buttons below to see different toast notifications in action
      </p>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Button
          onClick={() => toast('Basic notification')}
          variant="outline"
          size="sm"
        >
          Default
        </Button>

        <Button
          onClick={() => toast.success('Success!', {
            description: 'Your action was completed'
          })}
          variant="outline"
          size="sm"
        >
          ✅ Success
        </Button>

        <Button
          onClick={() => toast.error('Error occurred', {
            description: 'Something went wrong'
          })}
          variant="outline"
          size="sm"
        >
          ❌ Error
        </Button>

        <Button
          onClick={() => toast.info('Information', {
            description: 'Here is some useful info'
          })}
          variant="outline"
          size="sm"
        >
          ℹ️ Info
        </Button>

        <Button
          onClick={() => toast.warning('Warning!', {
            description: 'Please be careful'
          })}
          variant="outline"
          size="sm"
        >
          ⚠️ Warning
        </Button>

        <Button
          onClick={() => {
            const id = toast.loading('Loading...');
            setTimeout(() => {
              toast.success('Done!', { id });
            }, 2000);
          }}
          variant="outline"
          size="sm"
        >
          ⏳ Loading
        </Button>

        <Button
          onClick={() => toast('With action button', {
            action: {
              label: 'Undo',
              onClick: () => toast.info('Undo clicked!')
            }
          })}
          variant="outline"
          size="sm"
        >
          🔘 Action
        </Button>

        <Button
          onClick={() => toast.promise(
            new Promise((resolve) => setTimeout(resolve, 2000)),
            {
              loading: 'Processing...',
              success: 'Completed!',
              error: 'Failed'
            }
          )}
          variant="outline"
          size="sm"
        >
          📦 Promise
        </Button>

        <Button
          onClick={() => toast('Long duration', {
            duration: 10000,
            description: 'This will stay for 10 seconds'
          })}
          variant="outline"
          size="sm"
        >
          ⏰ Duration
        </Button>
      </div>
    </div>
  );
};

