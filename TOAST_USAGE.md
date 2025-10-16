# 🔔 Toast Notifications Guide - shadcn/ui Sonner

## ✅ Installation Complete

shadcn/ui Sonner is installed and configured in your app!

## 📍 Where It's Set Up

**Layout** (`src/app/layout.tsx`)
```typescript
import { Toaster } from "@/components/ui/sonner";

<Toaster /> // Added to layout
```

**Components Using Toasts:**
- ✅ `src/app/page.tsx` - Main page with generation flow
- ✅ `src/components/itinerary-form.tsx` - Form validation feedback
- ✅ `src/components/toast-demo.tsx` - Demo of all variants

## 🎨 Basic Usage

### Import
```typescript
import { toast } from 'sonner';
```

### Simple Notifications

**Default:**
```typescript
toast('Hello world!');
```

**Success:**
```typescript
toast.success('Itinerary saved!');
```

**Error:**
```typescript
toast.error('Failed to generate');
```

**Info:**
```typescript
toast.info('Did you know?');
```

**Warning:**
```typescript
toast.warning('Be careful!');
```

**Loading:**
```typescript
const id = toast.loading('Processing...');
// Later dismiss it:
toast.dismiss(id);
```

## 🎯 Advanced Usage

### With Description
```typescript
toast.success('Itinerary generated!', {
  description: '5-day trip to Paris, France'
});
```

### With Action Button
```typescript
toast('Item deleted', {
  action: {
    label: 'Undo',
    onClick: () => console.log('Undo clicked')
  }
});
```

### Promise-Based
```typescript
toast.promise(
  fetchData(),
  {
    loading: 'Loading data...',
    success: 'Data loaded!',
    error: 'Failed to load'
  }
);
```

### Custom Duration
```typescript
toast('Message', {
  duration: 5000 // 5 seconds (default is 4000)
});
```

### With ID (for updating/dismissing)
```typescript
const id = toast.loading('Generating...', { id: 'generate' });

// Later, update the same toast
toast.success('Done!', { id: 'generate' });

// Or dismiss it
toast.dismiss('generate');
```

## 📱 Real-World Examples from Your App

### Form Validation Error
```typescript
// In itinerary-form.tsx
const handleFormError = () => {
  toast.error('Please fix the errors in the form', {
    description: 'Check the highlighted fields and try again',
  });
};
```

### AI Generation Flow
```typescript
// In page.tsx
// Start loading
toast.loading('AI is generating your itinerary...', {
  id: 'generating',
});

// On success
toast.dismiss('generating');
toast.success('Itinerary generated successfully!', {
  description: `${data.days}-day trip to ${data.destination}`,
});

// On error
toast.dismiss('generating');
toast.error('Failed to generate itinerary', {
  description: 'Please try again or contact support',
});
```

### Save Operation
```typescript
const handleSave = async () => {
  const promise = saveItinerary(data);
  
  toast.promise(promise, {
    loading: 'Saving itinerary...',
    success: 'Itinerary saved successfully!',
    error: 'Failed to save itinerary'
  });
};
```

## 🎛️ Configuration Options

### Position
By default, toasts appear at the bottom-right. To change:

```typescript
// In layout.tsx
<Toaster position="top-right" />
// Options: top-left, top-center, top-right, bottom-left, bottom-center, bottom-right
```

### Theme
```typescript
<Toaster theme="light" /> // or "dark" or "system"
```

### Rich Colors
```typescript
<Toaster richColors />
// Makes success green, error red, etc.
```

### Close Button
```typescript
<Toaster closeButton />
// Adds X button to all toasts
```

### Expand by Default
```typescript
<Toaster expand />
// Shows full toast by default
```

## 🎨 Custom Styling

Sonner automatically matches your Tailwind theme via shadcn/ui configuration.

To customize further, edit `src/components/ui/sonner.tsx`

## 🔔 Toast Variants Available

| Type | Icon | Color | Use Case |
|------|------|-------|----------|
| default | - | Gray | General notifications |
| success | ✅ | Green | Successful operations |
| error | ❌ | Red | Errors and failures |
| warning | ⚠️ | Yellow | Warnings and cautions |
| info | ℹ️ | Blue | Informational messages |
| loading | ⏳ | Gray | Ongoing operations |

## 🧪 Try the Demo

Visit your app at **http://localhost:3001** and scroll down to the "Toast Notifications Demo" section. Click each button to see the toasts in action!

## 📝 Best Practices

### ✅ Do's
- Use loading toasts for async operations
- Provide descriptive messages
- Use appropriate toast types (success/error/info)
- Dismiss loading toasts when complete
- Keep messages concise
- Use descriptions for additional context

### ❌ Don'ts
- Don't spam multiple toasts at once
- Don't use for critical errors (use modal instead)
- Don't make toasts too long (use description)
- Don't forget to dismiss loading toasts
- Don't use toasts for every single action

## 🎯 Common Patterns

### Form Submission
```typescript
const handleSubmit = async (data) => {
  const toastId = toast.loading('Submitting...');
  
  try {
    await submitForm(data);
    toast.success('Form submitted!', { id: toastId });
  } catch (error) {
    toast.error('Submission failed', { id: toastId });
  }
};
```

### Delete Confirmation
```typescript
toast('Item will be deleted', {
  action: {
    label: 'Undo',
    onClick: () => {
      cancelDelete();
      toast.success('Deletion cancelled');
    }
  }
});
```

### Multi-Step Process
```typescript
const id = 'process';

toast.loading('Step 1: Validating...', { id });
await step1();

toast.loading('Step 2: Processing...', { id });
await step2();

toast.success('Complete!', { id });
```

## 🔗 References

- [Sonner Documentation](https://sonner.emilkowalski.com/)
- [shadcn/ui Sonner](https://ui.shadcn.com/docs/components/sonner)

---

**Installed:** ${new Date().toISOString()}
**Status:** ✅ Ready to Use

