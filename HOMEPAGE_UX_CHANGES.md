# Homepage UX Updates

## Overview
- Hid the itinerary preview card until a user submits the form, keeping first-time visitors focused on inputting trip details.
- Added submission tracking and cancellation handling so the preview reappears only during generation or after results return.
- Repositioned the public gallery’s tag filter panel to sit directly beneath the “Explore Itineraries” header for better context.

## Interaction Flow
1. User completes the trip form and presses `Generate Itinerary`.
2. The app records the submission and reveals the preview area, showing either live generation status or the finished itinerary summary.
3. If the user cancels generation, the preview hides again until the next submission.

## Accessibility & Feedback
- Status chip now surfaces only when the preview is visible, preventing redundant messaging before submission.
- Loading card remains accessible with progress bar, step list, and cancel button once generation begins.
- Tag filtering options remain available, but their relocation clarifies that they refine the gallery beneath the heading.
