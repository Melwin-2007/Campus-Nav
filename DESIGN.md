# Visual Design System — Campus Navigator

## 1. Style Metaphor
Modern, clean, friendly “map-first” application, matching the polish of **Google Maps meets Airbnb**. Characterized by generous whitespace, soft rounded corners (`rounded-2xl`), subtle multi-tier shadows, blurred floating glass panels, and smooth 150–300ms motion transitions.

---

## 2. Color System Tokens (Tailwind CSS Theme)

### Core Brand & Semantic Colors
- **Primary:** Deep Indigo `#4F46E5` (Hover: `#4338CA`)
- **Accent:** Vibrant Teal `#14B8A6` (Used for active routes, live GPS dot, positive success)
- **Warm Highlight:** Amber `#F59E0B` (Selected location halo, warnings, entrance pins)
- **Danger:** Crimson `#EF4444` (Destination red flag, destructive actions, error badges)
- **Success:** Emerald `#10B981` (Start location pin, verified badges)

### Surface & Canvas Palettes
| Token | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| Background Canvas | `#F8FAFC` (Slate-50) | `#0B1120` (Midnight) | Map background & app canvas |
| Surface Cards | `#FFFFFF` (White) | `#111827` (Slate-900) | Cards, bottom sheets, panels |
| Primary Text | `#0F172A` (Slate-900) | `#F1F5F9` (Slate-100) | High-contrast headings and body |
| Muted Text | `#64748B` (Slate-500) | `#94A3B8` (Slate-400) | Subtitles, distances, hours |
| Borders & Dividers | `#E2E8F0` (Slate-200) | `#1F2937` (Slate-800) | Card outlines and separators |

### 12 Category Tokens (Color-Blind Friendly & Lucide Icons)
| # | Category Name | Hex Code | Tailwind Equivalent | Lucide Icon |
|---|---|---|---|---|
| 1 | Academic Buildings | `#3B82F6` | `blue-500` | `GraduationCap` |
| 2 | Departments | `#8B5CF6` | `violet-500` | `Building2` |
| 3 | Laboratories | `#06B6D4` | `cyan-500` | `FlaskConical` |
| 4 | Administration | `#64748B` | `slate-500` | `Landmark` |
| 5 | Libraries | `#10B981` | `emerald-500` | `Library` |
| 6 | Food and Cafeteria | `#F97316` | `orange-500` | `Utensils` |
| 7 | Sports | `#84CC16` | `lime-500` | `Trophy` |
| 8 | Medical | `#F43F5E` | `rose-500` | `HeartPulse` |
| 9 | Parking | `#2563EB` | `blue-600` | `Car` |
| 10 | Washrooms | `#14B8A6` | `teal-500` | `Bath` |
| 11 | Entrances and Exits | `#F59E0B` | `amber-500` | `DoorOpen` |
| 12 | Other | `#A855F7` | `purple-500` | `MoreHorizontal` |

---

## 3. Typography Hierarchy
- **Headings Font:** `Plus Jakarta Sans`, sans-serif (700 bold, 600 semibold)
- **Body & Controls Font:** `Inter`, sans-serif (400 regular, 500 medium)
- **Minimum Mobile Body Text:** 14px (`text-sm`) to guarantee readability without pinching.

---

## 4. Responsive Viewports & Layouts

### Desktop Layout ($\ge 1024\text{px}$)
- Full-screen interactive Leaflet map canvas.
- Floating Left Panel: 400px wide, 16px inset margin, glassmorphism `backdrop-blur-md bg-white/90 dark:bg-slate-900/90 shadow-xl border border-slate-200/60 dark:border-slate-800/60 rounded-2xl`.
- Floating controls on right: Zoom (`+`/`-`), My Location, Layers, Dark Mode Toggle.

### Mobile Layout ($< 768\text{px}$)
- Full-screen interactive map with top floating search bar.
- Horizontally scrollable pill category chips below search bar.
- Draggable Bottom Sheet with 3 Framer Motion snap points:
  1. **Peek (Collapsed, ~72px):** Drag handle and quick summary card.
  2. **Half Sheet (~50% height):** Location details overview or directions origin/destination picker.
  3. **Full Sheet (~90% height):** Complete turn-by-turn navigation list or detailed facilities view.
- Fixed Bottom Tab Navigation (56px): `Map` (MapPin), `Explore` (Compass), `Scan QR` (QrCode).
- Touch Targets: Minimum $44\times 44\text{px}$ for all buttons.

---

## 5. Map Elements & Component Styling
- **Custom Markers:** Circular SVG pin badges colored by category with white Lucide SVG icons.
- **Selection State:** Amber glowing aura (`ring-4 ring-amber-400/50`) and smooth scale-up (`scale-110`).
- **User Location:** Pulsing teal dot (`#14B8A6`) with dynamic semi-transparent accuracy radius circle.
- **Route Line:** Animated thick teal polyline (`#14B8A6`, weight 6) bordered with a solid white outline (weight 8) for contrast.
- **Route Termini:** Green circle marker for Start (`#10B981`); Red checkered flag for Destination (`#EF4444`).

---

## 6. Motion & Accessibility
- **Framer Motion:** Quick 150–300ms transitions (`stiffness: 300, damping: 30`).
- **Reduced Motion:** Respects `prefers-reduced-motion: reduce` by replacing animated transforms with instant crossfades.
- **States:** Skeleton shimmer for loading, friendly custom SVG illustrations for empty states, clear error banners with a "Retry" button.
- **Accessibility:** WCAG AA contrast ratio ($\ge 4.5:1$), distinct keyboard `:focus-visible` rings, explicit `aria-label` tags on all icon-only buttons.

---

## 7. 5-Line Executive Summary (Prompt 0B Requirement)
1. Modern map-first UI combining Google Maps wayfinding polish with Airbnb aesthetic warmth.
2. Deep Indigo primary, Vibrant Teal accents for paths/GPS, and 12 distinct color-blind friendly category tokens.
3. Responsive desktop floating 400px sidebar and mobile 3-tier draggable bottom sheet with 44px tap targets.
4. Custom Lucide category map markers, pulsing teal live location dot, and animated teal route line.
5. Strict WCAG AA compliance, dark mode support, and resilient loading/empty/error states.
