# Itinerary Form Updates

## Layout Refresh
- Reordered sections so the trip brief textarea appears first, followed by a streamlined “Trip essentials” card containing destination, trip length, and adult count on a single row.
- Exposed start and end date pickers inline beneath essentials, removing the previous accordion to reduce clicks.
- Consolidated optional inputs (children, accessibility toggle, AI model selector) inside a dedicated “Additional details” block.

## AI Provider Selection
- Updated the form to emphasize the `AI provider` dropdown, clarifying that travelers can pick their preferred model before generation.
- Ensured the select component lists provider label + description, maintaining consistent accessibility messaging and aligning with the latest OpenRouter model metadata.
- Propagated the selected model through form submission and preview handling so generation respects user choice end-to-end.

## Interaction & Validation
- Preset pills remain for trip length and adult count, preserving quick entry while aligning with the new row layout.
- Guard clauses ensure destination, days, and adults stay validated; preview and submission flows reflect the selected AI provider when creating itineraries.
