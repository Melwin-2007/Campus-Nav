# Campus Navigator — Administrator Guide

This guide explains how to manage campus locations, edit the path network using the Visual Map Graph Editor, upload building photos, print official QR code posters, and inspect the health of campus data.

---

## 1. Accessing the Admin Area

1. Open the application in your browser.
2. Tap the **Layers / Shield** icon in the top-right toolbar.
3. In the login modal, enter the administrator credentials:
   - **Default Username**: `admin`
   - **Default Password**: `admin123` (or the password configured in your `.env` file)
4. Tap **Sign In**.
5. Once authenticated, a golden toolbar appears indicating that **Admin Mode** is active.

---

## 2. Using the Visual Map Graph Editor

The Visual Map Graph Editor allows non-technical administrators to map out walking paths and junctions directly on the campus map without typing any GPS coordinates.

### The 4 Editor Modes (Top Toolbar)

| Mode | Shortcut | What It Does |
|---|---|---|
| **Pan (Navigate)** | `V` | Normal map exploration mode. Drag to pan and scroll to zoom. |
| **Add Node** | `N` | Click anywhere on the map canvas to drop a new path point (entrance, junction, or gate). A dialog opens to enter the node name, type, and floor level. |
| **Link Nodes** | `L` | Connects two path nodes with a walkable path. **Step 1**: Click the starting node. **Step 2**: Click the target node. The edge is drawn automatically, and its length in meters is calculated instantly. |
| **Move / Inspect** | `E` | Click any node to view or update its details. **Drag any node marker** across the map to reposition it in real-time; connected edges update smoothly. |

### Edge Types and Accessibility
When creating or editing a connection (edge) between two nodes, you can set its pathway attributes:
- **Footpath**: Standard paved campus walkway (walkable by all).
- **Ramp**: Gentle incline or designated wheelchair ramp (marked in green, wheelchair-accessible).
- **Stairs**: Steps or outdoor staircases (marked with red dashed line; automatically excluded when users choose Accessible Route).
- **Corridor / Indoor**: Covered hallway or building passage.

---

## 3. Managing Campus Locations (POIs)

### Adding a New Building or Facility
1. In the Admin Panel, select **Locations**.
2. Tap **Add Location**.
3. Fill in the building details:
   - **Name**: e.g., *Biotechnology Annex*
   - **Category**: Select from the 12 categories (Academic, Library, Food, etc.).
   - **Entrance Node**: Select the path node where visitors should arrive.
   - **Operating Hours**: e.g., `08:30 - 17:30` or `24/7`. The system automatically evaluates real-time open/closed badges.
   - **Facilities**: Tag available features such as *Wi-Fi, Elevator, Wheelchair Access, Restrooms, Cafeteria*.
4. Tap **Save Location**.

### Uploading Building Photos
- In the location edit view, select **Upload Photo**.
- Choose a `.jpg`, `.png`, or `.webp` image (maximum file size: 5 MB).
- The image will be previewed immediately and served to visitors in the details panel.

---

## 4. Generating & Printing QR Code Posters

Campus Navigator generates official university signage posters formatted for printing and mounting at building entrances.

1. Navigate to the **QR Codes** section in the Admin Studio (or visit `http://localhost:8000/api/qr/{location_id}/poster`).
2. Select any campus building or click **Generate All Posters**.
3. Download the printable high-resolution **PDF Poster**.
4. Each poster features:
   - Official University header and building name.
   - Distinctive category color banner.
   - High-contrast QR code pointing to `https://<your-domain>/q/{code}`.
   - Clear instructional copy: *"Scan this QR code with your phone camera to view building details and get walking directions."*

---

## 5. Running the Data Health Audit

The built-in **Data Health Audit** ensures that visitors never experience a broken route:
1. Open the **Health / Diagnostics** tab in the Admin Studio (or call `GET /api/admin/stats`).
2. The auditor inspects the entire graph topology and reports:
   - **Unlinked Locations**: Buildings without an assigned entrance node.
   - **Isolated Nodes**: Path nodes with 0 connected edges.
   - **Zero-Length or Suspicious Edges**: Connections with faulty coordinates.
3. If an issue is flagged, clicking the warning zooms directly to the problematic node so you can draw a connecting path.

---

## 6. Importing & Exporting Data

You can prepare or backup your campus data using standard CSV or JSON files:
- **Export**: Tap **Export Campus Data** to download `locations.csv`, `nodes.json`, and `edges.json`.
- **Import**: Upload an updated CSV or JSON dataset to refresh the database. The system validates coordinate formats and prevents orphaned records.
