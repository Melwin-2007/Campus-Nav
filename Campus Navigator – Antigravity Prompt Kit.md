# Campus Navigator – Antigravity Prompt Kit

A copy-and-paste kit for building your whole Campus Navigator project with Antigravity, even if you don’t know any code. Every prompt is written so the AI agent does the technical work and *tells you in plain English* what it did and how to check it.

---

## 1. How to use this kit (read first)

**The golden rules for non-technical vibe coding**

1. **One prompt at a time.** Paste a prompt, let the agent finish, do the “How to check” step, and only then paste the next one. Don’t skip ahead.
2. **Always check in the browser.** After every step, open the app and click around. If something looks wrong, paste the *Fix-it prompts* from Section 5.
3. **Never type code yourself.** If you see an error, copy the full error text and paste it back to the agent using the “Error fix” prompt.
4. **Ask for plain English.** Every prompt already asks the agent to explain in simple words. If it doesn’t, say: “Explain that again like I’m not a programmer.”
5. **Save progress.** After each step works, tell the agent: “Commit all changes to git with a clear message.” This lets you go back if something breaks.
6. **The campus data must be REAL.** The AI can build the whole app, but it cannot know where your buildings are. Section 4 explains how to collect real coordinates. Until then the app uses clearly labelled *sample* data.

**Before you start (one-time setup)**

- Install Antigravity and sign in. Open an **empty folder** called `campus-navigation` as your workspace.
- Put your PRD file (the Campus Navigator document) inside that folder and name it `PRD.md`. The prompts refer to it.
- You do **not** need to install Python, Node, or PostgreSQL yourself. Prompt 0 tells the agent to check and guide you.
- Use the agent in a mode where it can run terminal commands and open the browser to test. If it asks permission to run a command, read it and approve (it is normally safe project setup).

> Note: Antigravity’s menus change over time. If a button name differs from what I describe, just paste the prompt into the agent chat; that works the same everywhere.

---

## 2. Prompt 0A – Permanent rules (paste first)

Paste this into Antigravity’s **Rules** area for the workspace (or, if you can’t find it, paste it as your very first chat message and tell the agent to save it as a file named `RULES.md` and follow it forever).

```
You are my senior full-stack engineer, designer and teacher. I am NOT technical, so follow these rules for the entire project:

1. Read PRD.md fully. It is the source of truth for features, database tables, API endpoints and folder structure. Follow the folder structure in section 12 of the PRD exactly.
2. Tech stack: React + Vite + Tailwind CSS + Leaflet + React Leaflet + Axios + html5-qrcode (frontend); Python + FastAPI + Pydantic + SQLAlchemy (backend); PostgreSQL + PostGIS (database); Dijkstra and A* (navigation).
3. After every task, give me a SHORT plain-English summary: what you built, what I should see in the browser, and exact steps to check it. No jargon. If you must use a technical word, explain it in one line.
4. Never use fake or random coordinates for the real campus. Use clearly labelled SAMPLE data until I give real data, and make the sample data easy to replace by editing campus_data files.
5. Never put passwords or secrets in code. Use .env files, create .env.example, and add .env to .gitignore.
6. Write clean, modular, commented code. Handle errors gracefully: every failure must show a friendly message to the user, never a blank screen or a raw error.
7. After finishing a task, actually RUN the app/tests and open the page in the browser to verify it works. Fix problems yourself before telling me it is done. Tell me honestly about anything that is not working.
8. Do not add features that are not in the PRD without asking me first.
9. UI quality is a top priority: follow the design system in DESIGN.md at all times. Nothing may look plain, cramped, unstyled or broken on mobile.
10. Keep a file named PROGRESS.md updated with what is done, what is pending and how to run the project.
11. Make small git commits after each working step.
12. If something in my request is unclear or risky, ask me ONE short question before proceeding.
```

---

## 3. Prompt 0B – The design system (this makes the UI look great)

```
Create a file named DESIGN.md in the project root that defines the visual design system for Campus Navigator, and follow it in all future UI work. Use exactly this direction:

STYLE: Modern, clean, friendly “map-first” app, similar in polish to Google Maps meets Airbnb. Lots of white space, soft rounded corners, subtle shadows, smooth animations. It must feel premium, not like a college assignment.

COLORS (define as Tailwind theme tokens, with light and dark mode):
- Primary: deep indigo #4F46E5 (hover #4338CA)
- Accent: teal #14B8A6 (used for routes, success, current location)
- Warm highlight: amber #F59E0B (selected location, warnings)
- Danger: #EF4444
- Light mode background #F8FAFC, cards #FFFFFF, text #0F172A, muted text #64748B, borders #E2E8F0
- Dark mode background #0B1120, cards #111827, text #F1F5F9, borders #1F2937
- Each of the 12 location categories gets its own distinct, color-blind-friendly color and a matching lucide-react icon (Academic Buildings, Departments, Laboratories, Administration, Libraries, Food and Cafeteria, Sports, Medical, Parking, Washrooms, Entrances and Exits, Other).

TYPOGRAPHY: Google Font “Plus Jakarta Sans” for headings and “Inter” for body text. Clear size scale, minimum 14px body text on mobile, strong heading weight.

LAYOUT:
- Desktop: full-screen map with a floating left side panel (about 400px wide) containing search, category chips, and details/navigation. Floating buttons on the right of the map (zoom, my location, layers, dark mode).
- Mobile: full-screen map with a floating search bar at the top, horizontally scrollable category chips under it, and a draggable BOTTOM SHEET (collapsed / half / full) for results, details and directions. Bottom tab bar: Map, Explore, Scan QR.
- Thumb-friendly tap targets (at least 44px).

COMPONENT STYLE: rounded-2xl cards, soft layered shadows, glass-style blurred floating panels over the map, pill-shaped category chips, custom circular map markers in category colors with white icons (not default blue pins), a pulsing teal dot for the user’s current location, a bold animated teal route line with a white outline, and distinct start (green) and destination (red flag) markers.

MOTION: use framer-motion for gentle transitions: panels slide in, bottom sheet springs, list items fade in, route line draws itself. Keep animations quick (150–300ms) and respect “reduced motion” settings.

STATES: Every screen must have a designed loading state (skeleton shimmer), empty state (friendly illustration-style icon plus message), and error state (clear message plus Retry button).

ACCESSIBILITY: WCAG AA contrast, visible keyboard focus rings, aria-labels on icon buttons, full keyboard operation.

After creating DESIGN.md, summarise it for me in 5 simple lines. Do not build any screens yet.
```

**How to check:** You should see a `DESIGN.md` file. Nothing visual yet.

---

## 4. Collecting your real campus data (do this in parallel – it is the most important non-coding job)

The app is only as good as this data. You need:

1. **Locations (20–40):** name, category, short description, opening hours, a photo, and the latitude and longitude of each building *entrance*.
2. **Path points (nodes):** gate, every junction/corner where paths meet, every building entrance.
3. **Connections (edges):** which path points are joined by a real walkable path, and whether it has stairs or a ramp.

**Easy way to get coordinates without technical skill:**

- Walk the campus with your phone. At each entrance or junction, open Google Maps, long-press your blue dot (or the spot on the map), and copy the numbers that appear (like 17.6599, 75.9064). Note them in a notebook or a spreadsheet.
- Or use the **admin dashboard** the agent will build (Prompt 11): it lets you click on the map to add points and draw connections, so you never have to type coordinates.
- Ask a friend to double-check every path is really walkable. Don’t assume two close buildings are connected.

When you have the data, paste it into a spreadsheet with columns *name, category, description, latitude, longitude* and give it to the agent with the **“Import my real data”** prompt in Section 5.

---

## 5. The build prompts (paste in order)

### Prompt 1 – Project setup

```
Read PRD.md, RULES.md and DESIGN.md. Then:
1. Check what is installed on my computer (Node.js, Python 3.11+, PostgreSQL with PostGIS, git). For anything missing, give me simple step-by-step install instructions for my operating system, or install it for you if you can. Wait for my confirmation before continuing if I must install something.
2. Create the exact folder structure from section 12 of the PRD.
3. Create the frontend with Vite + React, and set up Tailwind CSS, React Router, Axios, Leaflet, React Leaflet, framer-motion, lucide-react and html5-qrcode. Apply the colors, fonts and dark-mode tokens from DESIGN.md.
4. Create the FastAPI backend with a virtual environment, requirements.txt, a /api/health endpoint, CORS configured for the frontend, and .env / .env.example files.
5. Create README.md, PROGRESS.md and .gitignore. Initialise git and commit.
6. Run both servers and open the frontend. Show me a simple, beautiful placeholder home page that proves the frontend can talk to the backend (display “Backend connected ✓”).
Finally give me the exact two commands I will use each day to start the project.
```

**How to check:** A good-looking page opens in the browser and says “Backend connected ✓”.

### Prompt 2 – Database

```
Build the database layer exactly as in section 8 of the PRD (tables: locations, categories, path_nodes, path_edges, qr_codes, administrators).
- Use PostgreSQL with PostGIS where useful for spatial data, SQLAlchemy models, and migrations (Alembic).
- Add proper constraints: foreign keys, unique identifiers, no duplicate QR identifiers, valid latitude/longitude ranges, non-negative edge distances.
- Write database/schema.sql too.
- Create the 12 categories from the PRD with names, descriptions and icon names matching DESIGN.md.
- Create a seed script that loads data from campus_data/locations.csv, nodes.json and edges.json. For now create clearly labelled SAMPLE data of about 12 locations, 25 path nodes and connected edges around a made-up small campus at one consistent area, with at least one ramp-only route and one stairs-only shortcut, and one deliberately disconnected location for testing. Put a comment at the top of every sample file saying “SAMPLE DATA – replace with real campus data”.
- Create a default admin user from values in .env (never hardcoded), with a hashed password.
If PostgreSQL/PostGIS setup is a problem on my computer, tell me and offer the simplest working alternative for local testing (such as SQLite) while keeping the code ready to switch to PostgreSQL.
Run the migrations and seed, then prove it worked by showing me the counts of rows in each table in plain English.
```

**How to check:** The agent reports e.g. “12 locations, 12 categories, 25 nodes”.

### Prompt 3 – Public APIs

```
Build the public backend APIs from section 9 of the PRD:
- GET /api/locations (active only, with optional category filter)
- GET /api/locations/{id}
- GET /api/locations/search?q= (partial, case-insensitive match on name, description, department and category name, ranked sensibly)
- GET /api/categories (with count of locations per category)
- GET /api/qr/{identifier}
Use Pydantic schemas for validation, clear error messages (404 for unknown IDs, 422 for bad input), and automatic API docs at /docs. Add tests for each endpoint. Run the tests and show me the results in plain English. Open /docs in the browser and confirm it lists everything.
```

**How to check:** Visit `http://localhost:8000/docs` – you see a tidy list of endpoints and can click “Try it out”.

### Prompt 4 – Beautiful map home screen

```
Build the Home page following DESIGN.md exactly.
- Full-screen Leaflet map with OpenStreetMap tiles (with a light and a dark map style that follows the app theme) centred on the campus, with correct attribution.
- Load locations from the backend and show custom circular category-colored markers with lucide icons. Use marker clustering only if there are many overlapping markers.
- Clicking a marker highlights it (amber glow, slight scale-up), flies the map smoothly to it, and opens the details panel.
- Desktop: floating left panel. Mobile: draggable bottom sheet and bottom tab bar (Map, Explore, Scan QR).
- Floating map buttons: zoom, my location (not wired yet), dark-mode toggle.
- Header with logo, campus name (read from a config file so I can change it) and search bar.
- Skeleton loading state, friendly error state with Retry if the backend is unreachable.
Test it at phone width (390px), tablet (768px) and desktop (1440px) and fix anything that looks cramped or overflows. Show me screenshots if you can.
```

**How to check:** Looks like a modern maps app. Resize your browser narrow – the layout switches to the phone version.

### Prompt 5 – Search, filters and location details

```
Implement FR-02, FR-03 and FR-04:
- Search bar with live suggestions (debounced), highlighted matching text, keyboard arrows + Enter, recent searches, and a “No results” empty state with suggestions. Selecting a result flies the map to it and opens its details.
- Category chips (horizontally scrollable on mobile) with icons and colors. Selecting a chip shows only that category on the map and list; allow multiple selection and a “Clear” option. Show counts.
- Location details panel: large photo (with graceful placeholder if missing), name, category badge, description, coordinates (copy button), opening hours with an “Open now / Closed” badge computed from the hours, facilities list, a prominent “Directions” button and a “Share” button.
Everything must be smooth, accessible and look polished. Test searching “lib”, “lab”, “canteen” and a nonsense word, and tell me the results.
```

### Prompt 6 – Navigation engine (backend)

```
Build the navigation engine from FR-05, FR-06, FR-10 and section 10 of the PRD, inside backend/app/algorithms:
1. Build a graph from path_nodes and path_edges (respect is_active; treat edges as bidirectional unless a path is marked one-way).
2. Implement Dijkstra’s algorithm by hand (using a priority queue) as the primary algorithm, and A* with a straight-line (haversine) heuristic as the second. Both must return identical distances on the same graph.
3. accessible_only option: skip non-accessible nodes and edges; if no accessible route exists, say so clearly.
4. POST /api/routes with the request/response format in the PRD. Return distance in metres, estimated minutes (walking speed 1.3 m/s, configurable), ordered path coordinates and friendly turn-by-turn instructions (calculate left/right/straight from the bearing change at each junction, merge consecutive straight segments, mention location names where nodes are entrances, end with “You have reached your destination”).
5. Resolve a location to its nearest entrance node. Also support starting from raw GPS coordinates by snapping to the nearest node, and refuse if the user is farther than a configurable distance (default 300 m) from any path.
6. Handle: same start and destination, unknown IDs, disconnected locations (clear 404-style message, no route returned), inactive paths.
7. Write thorough automated tests: direct route, multi-junction route, two alternative routes (shortest must win), disconnected destination, blocked edge, accessible route versus normal route, and Dijkstra equals A*.
Run the tests and report each result in plain English, including how many milliseconds a route takes.
```

**How to check:** The agent shows all tests passing. In `/docs`, try POST /api/routes with start 1 and destination 5.

### Prompt 7 – Navigation screen (frontend)

```
Build the navigation experience (FR-05, section 11.3):
- “Directions” panel with start and destination fields (searchable dropdowns with the same polished style), a swap button, “Use my location” option, an “Accessible route” toggle and a “Get route” button.
- On success: draw the route on the map as a thick teal line with white outline that animates drawing from start to end, green start marker, red destination flag, and automatically zoom the map to fit the whole route.
- Show a summary card: total distance, walking time, and algorithm used in small text. Below it show a clean step-by-step list with direction icons (turn left/right/straight/arrive). Clicking a step zooms to that point.
- Buttons: Clear route, Recalculate, Share route link (the URL should reproduce the same route).
- Friendly messages for: no route found, accessible route unavailable, same place chosen, server error.
- Fully responsive: on mobile the directions live in the bottom sheet.
Test several routes with the sample data and describe what you see.
```

### Prompt 8 – GPS current location

```
Implement FR-07 using the browser Geolocation API:
- “My location” button asks for permission with a friendly explanation first.
- Show the user as a pulsing teal dot with an accuracy circle. Update live while the app is open (watchPosition) and let the user pause tracking.
- Handle all cases with clear messages: permission denied, location unavailable, timeout, location outside the campus area (“You seem to be away from campus – choose a starting point manually”), and low accuracy (show a note that GPS can be inaccurate, especially indoors).
- “Start from my location” in Directions must snap to the nearest path node via the backend.
- Always offer manual start selection as the alternative.
Explain to me how I can test GPS on my laptop (browser dev-tools location simulation) and on my phone.
```

### Prompt 9 – QR codes

```
Implement FR-08:
- Backend: generate a unique, non-guessable identifier per location (no personal data), and an endpoint that returns a downloadable QR image (PNG) and a printable PDF “poster” per building with the building name, QR code and the text “Scan to see this building and get directions”.
- Frontend: a QR Scanner page using html5-qrcode with a designed camera view (scan frame overlay), camera-permission explanation, error state if camera is denied, and a fallback to type the code manually.
- After a scan: show the building’s details and a “Directions from here” button that sets this building as the start.
- The QR should encode a link such as https://<site>/q/<identifier> so that scanning with a normal phone camera also opens the app. Make the base URL configurable in .env.
- Invalid or unknown QR codes show a friendly error.
Tell me how to print and test a QR code.
```

### Prompt 10 – Admin login and dashboard

```
Build the secure admin area (FR-09, NFR-03, section 14), designed to the same high visual standard as the public app:
- Secure login page (JWT tokens, hashed passwords, login rate limiting, logout, session expiry). Routes under /api/admin require authorization.
- Dashboard with a clean sidebar and summary cards (number of locations, categories, path nodes, connections, and any problems).
- Locations: searchable table; add / edit / deactivate / delete forms with validation; photo upload restricted by size (max 5 MB) and file type (JPG/PNG/WebP), with image preview; opening hours editor; facilities list; category picker.
- Categories management.
- MAP EDITOR (very important because I am not technical): a visual page where I can click on the map to place a location or path node, drag to adjust, click two nodes to create a connection (distance calculated automatically in metres), mark each connection as stairs / ramp / accessible / restricted, and delete nodes or connections.
- Data health checker: lists locations with no entrance node, nodes not connected to the graph, and edges with zero or suspicious length.
- QR page: generate/download QR codes for any location or all locations.
- Import and export locations/nodes/edges as CSV/JSON.
Confirm that public visitors cannot reach any admin function. Test it and explain the result.
```

### Prompt 11 – Explore page, polish and responsive perfection

```
Build the Explore page (section 11.2): category tiles with icons, a searchable grid of beautiful location cards (photo, name, category badge, short description, “Directions” button) with skeleton loading and fade-in animations.
Then do a full visual polish pass over the entire app:
- Check every page at 360px, 390px, 768px, 1024px and 1440px widths, in light and dark mode, and fix any overflow, overlap, tiny text, low contrast or awkward spacing.
- Make sure the bottom sheet never hides important map controls and that the keyboard on mobile does not break layouts.
- Add a nice app icon, favicon, page titles, a welcoming first-time hint (“Search a place or tap a pin”), and a small About/Help sheet.
- Ensure all icon-only buttons have labels and everything works with the keyboard.
Take screenshots at each size and list what you improved.
```

### Prompt 12 – Import my real data

```
I now have real campus data. I will give you a spreadsheet/CSV. Please:
1. Validate every row (missing names, invalid or duplicate coordinates, coordinates far away from the rest of the campus) and list problems in plain English before importing anything.
2. Replace the SAMPLE data in campus_data/ and re-seed the database. Remove the SAMPLE comments only for the real files.
3. Center the map on the real campus and set sensible zoom limits (a maximum bounds box around campus).
4. Run the data health checker and show me any buildings that cannot be reached, so I can fix them.
[PASTE YOUR DATA HERE OR ATTACH THE FILE]
```

### Prompt 13 – Full quality audit (the “check everything properly” prompt)

```
Act as a strict QA tester and security reviewer for the whole project. Go through section 15 (Testing), section 17 (Acceptance Criteria) and section 14 (Security) of PRD.md and test EVERYTHING for real: run the backend and frontend, use the browser, and click through every feature.
Produce a file TEST_REPORT.md with a table: each acceptance criterion, PASS or FAIL, evidence, and what you fixed. Specifically verify:
- Search, filters, markers, details, directions, route accuracy (compare route distance with the sum of edge lengths), disconnected and invalid inputs, accessibility routing, GPS error handling, QR success and failure, admin login, admin-only protection, file upload limits.
- Browser console shows no errors, no failed network requests, no broken images.
- Mobile layout at 360px and 390px, tablet, desktop.
- Security: no secrets in code, .env ignored by git, passwords hashed, CORS limited, admin endpoints rejected without a token, inputs validated, SQL injection and oversized upload attempts rejected.
- Performance: measure search time, route time and initial load, and report them honestly as measured results.
Fix every FAIL you can, re-test, and give me an honest summary of anything still unresolved, written for a non-technical person.
```

### Prompt 14 – Documentation and deployment

```
1. Write final docs in /docs: a plain-English User Guide, an Admin Guide (how to add a building and path with the map editor), API documentation, a system architecture diagram (Mermaid), a database diagram, and a short project report outline suitable for a college submission.
2. Prepare deployment: frontend on Vercel, backend on Render (or the best current alternative), managed PostgreSQL with PostGIS support. First check the CURRENT free-tier limits and PostGIS support of each provider and tell me honestly if something won’t work, with the best alternative.
3. Create a step-by-step deployment checklist I can follow without technical knowledge, including which environment variables to set where, and how to change the admin password.
4. Also give me a simple “local demonstration” guide in case I present from my laptop.
5. Make sure the production build works, then update README.md and PROGRESS.md.
```

---

## 6. Fix-it prompts (keep these handy)

**Error fix**

```
I got this error. Find the cause, fix it, re-run to verify, and explain in simple words what was wrong:
[PASTE THE FULL ERROR HERE]
```

**Looks ugly or broken**

```
This screen looks [cramped / plain / broken / too small on my phone / text is hard to read]. Compare it with DESIGN.md, redesign it to match the premium look, test it at 390px and 1440px in light and dark mode, and show me before and after.
```

**Something doesn’t work**

```
When I do [WHAT YOU DID], I expected [WHAT SHOULD HAPPEN] but [WHAT ACTUALLY HAPPENED]. Reproduce it yourself, fix the cause, add a test so it never returns, and confirm.
```

**The route looks wrong**

```
The route from [A] to [B] goes through a path that doesn’t exist or is not the shortest. Show me the nodes and connections used, check the data for missing or wrong connections, and tell me exactly which data I should correct.
```

**Everything stopped working**

```
The project no longer starts. Check the git history, find the last working version, determine what broke it, and fix it. Explain the cause simply.
```

**Explain it to me**

```
Explain what you just built in simple words, as if to a non-programmer, and tell me what each major folder does.
```

---

## 7. Final self-check list (for you, no technical skill needed)

- The map opens quickly, looks beautiful, and works in dark mode.
- Pins use colored icons by category, not plain default pins.
- Searching “lib” suggests the library, and tapping it zooms there.
- Choosing two buildings draws a teal line that follows real paths, not a straight line through buildings.
- Walk one route in real life and compare it with the app’s distance and time.
- Disconnected or impossible destinations show a polite message.
- Phone view feels natural with one thumb.
- Admin can’t be opened without login; changing a location in admin appears on the public map.
- QR code printed and scanned with a real phone opens the right building.
- GPS works outside on campus, and shows a helpful message when denied.

## 8. Honest notes

- AI-built projects can have hidden bugs. Prompt 13 is there to catch them, but always test with real people on real phones before presenting.
- The 14–16 day estimate in your PRD assumes the campus data is ready. Data collection is usually what takes longest.
- Deployment free tiers and PostGIS support change often; Prompt 14 makes the agent check them rather than assume.
- Agentic tools sometimes drift. If the agent starts changing things you didn’t ask for, say: “Stop. Follow RULES.md and PRD.md. Revert unrelated changes.”
