# Icon Migration Plan: Emoji → Lucide Icons

## Emoji to Lucide Mapping

Based on https://lucide.dev/icons/, here's our replacement strategy:

| Emoji | Current Use | Lucide Icon | Notes |
|-------|-------------|-------------|-------|
| 📅 | Calendar/dates | `Calendar` | Main calendar icon |
| 📆 | Calendar/dates | `CalendarDays` | Alternative calendar |
| 👥 | Travelers/people | `Users` | Multiple users |
| ♿ | Accessibility | `Accessibility` | Accessibility features |
| 📋 | Clipboard/lists | `ClipboardList` | Lists and plans |
| 🔒 | Private/locked | `Lock` | Privacy indicator |
| 🌍 | Public/globe | `Globe` | Public visibility |
| ✅ | Completed/done | `CheckCircle2` | Success state |
| ↩️ | Return/undo | `RotateCcw` | Undo action |
| 📝 | Notes/edit | `FileText` | Text documents |
| 🏷️ | Tags | `Tag` | Labels and tags |
| 👍 | Like/thumbs up | `ThumbsUp` | Like button |
| 🔗 | Share/link | `Share2` | Share action |
| ❤️ | Favorite/heart | `Heart` | Bucket list |
| 🗑️ | Delete/trash | `Trash2` | Delete action |
| ✏️ | Edit | `Pencil` | Edit action |
| 👁️ | View | `Eye` | View action |
| ⏱️ | Time/duration | `Clock` | Time indicator |
| 🧭 | Navigation | `Compass` | Navigation/explore |
| 🛡️ | Admin/shield | `Shield` | Admin features |
| 🗺️ | Map | `Map` | Maps and locations |
| ⋮ | More options | `MoreVertical` | Dropdown menu |
| 🔐 | Secure/auth | `KeyRound` | Authentication |
| ✨ | Special/new | `Sparkles` | Highlights |
| ✈️ | Travel | `Plane` | Travel/flights |
| ← | Back arrow | `ArrowLeft` | Navigation |
| → | Forward arrow | `ArrowRight` | Navigation |

## Files to Update (Priority Order)

### High Priority (User-Facing Components)
1. ✅ `src/components/itinerary-card.tsx` - Gallery cards
2. ✅ `src/components/itinerary-like-button.tsx` - Action buttons
3. ✅ `src/app/itinerary/[id]/page.tsx` - Detail page
4. ✅ `src/components/nav-header.tsx` - Navigation
5. ✅ `src/app/page.tsx` - Homepage

### Medium Priority (Forms & Actions)
6. ✅ `src/components/itinerary-form-ai-enhanced.tsx`
7. ✅ `src/components/itinerary-form-smart.tsx`
8. ✅ `src/components/itinerary-form.tsx`
9. ✅ `src/components/itinerary-actions.tsx`
10. ✅ `src/components/itinerary-gallery.tsx`

### Lower Priority (Admin & Protected)
11. ✅ `src/app/(protected)/my-plans/page.tsx`
12. ✅ `src/app/(protected)/admin/itineraries/page.tsx`
13. ✅ `src/app/itinerary/[id]/edit/page.tsx`

### Low Priority (Test & Misc)
14. `src/components/masthead.tsx`
15. `src/app/form-comparison/page.tsx`
16. `src/app/test-pexels/page.tsx`
17. `src/app/admin/backfill-images/page.tsx`

## Implementation Strategy

### 1. Create Icon Wrapper (Optional)
For consistent sizing and styling:
```tsx
interface IconProps {
  className?: string;
  size?: number;
}
```

### 2. Replace Pattern
**Before:**
```tsx
<span className="text-xl">📅</span>
```

**After:**
```tsx
import { Calendar } from 'lucide-react';
<Calendar className="w-5 h-5" />
```

### 3. Size Guidelines
- Small icons (inline text): `w-4 h-4` (16px)
- Medium icons (buttons): `w-5 h-5` (20px)
- Large icons (headers): `w-6 h-6` (24px)
- Extra large: `w-8 h-8` (32px)

## Benefits

✅ **Consistency**: All icons follow same design language  
✅ **Scalability**: SVG icons scale perfectly at any size  
✅ **Customization**: Easy to change colors, stroke width, etc.  
✅ **Accessibility**: Proper SVG with aria labels  
✅ **Performance**: Tree-shakeable, only imports what's used  
✅ **Professional**: Modern, clean look  

## Color Theming

Lucide icons inherit text color by default:
```tsx
<Calendar className="w-5 h-5 text-blue-600" />
<Calendar className="w-5 h-5 text-gray-500" />
```

## Example Replacements

### Like Button
**Before:**
```tsx
<span className="text-base">👍</span>
```

**After:**
```tsx
import { ThumbsUp } from 'lucide-react';
<ThumbsUp className="w-5 h-5" />
```

### Calendar
**Before:**
```tsx
<span className="text-xl">📅</span>
```

**After:**
```tsx
import { Calendar } from 'lucide-react';
<Calendar className="w-5 h-5" />
```

### Users
**Before:**
```tsx
<span className="text-xl">👥</span>
```

**After:**
```tsx
import { Users } from 'lucide-react';
<Users className="w-5 h-5" />
```

