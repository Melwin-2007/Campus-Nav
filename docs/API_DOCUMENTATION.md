# Campus Navigator — REST API Documentation

Base URL: `http://localhost:8000/api`  
Interactive OpenAPI / Swagger UI: `http://localhost:8000/docs`  
ReDoc: `http://localhost:8000/redoc`

---

## 1. Authentication & Security

Administrative endpoints require an RFC 6750 HTTP Authorization header containing a signed JSON Web Token (JWT):
```http
Authorization: Bearer <access_token>
```
Public endpoints require no authentication.

---

## 2. Public Endpoints

### 2.1 System Health
`GET /api/health`
- **Description**: Lightweight health and liveness probe for load balancers and frontends.
- **Response**: `200 OK`
```json
{
  "status": "ok"
}
```

### 2.2 Category Catalog
`GET /api/categories`
- **Description**: Returns all campus location categories with current location counts.
- **Response**: `200 OK`
```json
[
  {
    "id": 1,
    "name": "Academic Buildings",
    "slug": "academic",
    "description": "Lecture halls, classrooms, and academic centers",
    "icon": "GraduationCap",
    "color": "#3B82F6",
    "location_count": 4
  }
]
```

### 2.3 Location Catalog
`GET /api/locations`
- **Query Parameters**:
  - `category_id` (optional, integer): Filter locations by specific category ID.
  - `is_active` (optional, boolean, default `true`): Return only active POIs.
- **Response**: `200 OK`
```json
[
  {
    "id": 1,
    "name": "APJ Abdul Kalam Block",
    "short_name": "Kalam Block",
    "description": "Main engineering wing housing Computer Science and Electronics.",
    "category_id": 1,
    "latitude": 17.65992,
    "longitude": 75.90641,
    "entrance_node_id": 1,
    "operating_hours": "08:00 - 18:00",
    "facilities": ["Wi-Fi", "Elevator", "Restroom", "Wheelchair Ramp"],
    "photo_url": null,
    "category": {
      "id": 1,
      "name": "Academic Buildings",
      "slug": "academic",
      "icon": "GraduationCap",
      "color": "#3B82F6"
    }
  }
]
```

### 2.4 Location Detail
`GET /api/locations/{id}`
- **Parameters**: `id` (path, integer)
- **Response**: `200 OK` (Detailed Location object) or `404 Not Found`.

### 2.5 Location Search
`GET /api/locations/search?q={query}`
- **Query Parameters**: `q` (string, required): Partial query string (matches name, description, facilities, and category).
- **Response**: `200 OK` (Array of matched Location objects).

---

## 3. Navigation & Routing Engine

### 3.1 Calculate Route
`POST /api/routes`
- **Description**: Computes the shortest walking path using Dijkstra or A* algorithms with turn-by-turn maneuvers and optional wheelchair accessibility filtering.
- **Request Body**:
```json
{
  "start_node_id": 1,
  "destination_node_id": 5,
  "start_lat": null,
  "start_lon": null,
  "accessible_only": false,
  "algorithm": "dijkstra"
}
```
- **Response**: `200 OK`
```json
{
  "distance_meters": 156.8,
  "duration_minutes": 2,
  "duration_seconds": 121,
  "algorithm_used": "dijkstra",
  "accessible_only": false,
  "path_node_ids": [1, 2, 4, 5],
  "coordinates": [
    [17.65992, 75.90641],
    [17.65985, 75.90695],
    [17.65935, 75.90705],
    [17.65922, 75.90748]
  ],
  "steps": [
    {
      "instruction": "Depart APJ Abdul Kalam Block heading east toward Junction Alpha",
      "distance_meters": 57.5,
      "maneuver": "depart",
      "bearing": 97.4,
      "lat": 17.65992,
      "lon": 75.90641,
      "location_name": "APJ Abdul Kalam Block"
    },
    {
      "instruction": "Turn right onto Boulevard Walk",
      "distance_meters": 56.5,
      "maneuver": "turn_right",
      "bearing": 168.8,
      "lat": 17.65985,
      "lon": 75.90695,
      "location_name": null
    },
    {
      "instruction": "You have reached your destination: Central Library",
      "distance_meters": 42.8,
      "maneuver": "arrive",
      "bearing": 106.9,
      "lat": 17.65922,
      "lon": 75.90748,
      "location_name": "Central Library"
    }
  ]
}
```
- **Error Responses**:
  - `400 Bad Request`: GPS coordinates exceed the 300m campus proximity boundary.
  - `404 Not Found`: No connected route exists (or no step-free route exists under `accessible_only=true`).

---

## 4. QR Code Services

### 4.1 Lookup by Identifier
`GET /api/qr/{identifier}`
- **Description**: Resolves a printed QR code string (e.g., `LOC-001`) to its corresponding campus location.
- **Response**: `200 OK`

### 4.2 Stream QR Code Image
`GET /api/qr/{location_id}/image`
- **Description**: Streams a dynamically generated 512x512 PNG image of the location's QR code.
- **Headers**: `Content-Type: image/png`

### 4.3 Download Printable PDF Poster
`GET /api/qr/{location_id}/poster`
- **Description**: Generates an A4 university entrance poster PDF with institution branding, category colors, QR code, and scanning instructions.
- **Headers**: `Content-Type: application/pdf`

---

## 5. Administrative Endpoints (Protected by JWT)

### 5.1 Admin Login
`POST /api/admin/login`
- **Request Body**:
```json
{
  "username": "admin",
  "password": "your-admin-password"
}
```
- **Response**: `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

### 5.2 System Diagnostics & Graph Health
`GET /api/admin/stats`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK` (Node, edge, and location counts, plus diagnostic lists of isolated nodes or unlinked POIs).

### 5.3 Location Mutations
- `POST /api/admin/locations`: Create a new campus POI.
- `PUT /api/admin/locations/{id}`: Update location properties.
- `DELETE /api/admin/locations/{id}`: Soft or hard delete a location.
- `POST /api/admin/locations/{id}/photo`: Upload building photo (`multipart/form-data`, max 5 MB).

### 5.4 Graph Node & Edge Mutations
- `POST /api/admin/nodes`: Add a new graph node.
- `PUT /api/admin/nodes/{id}`: Update coordinates, floor, or accessibility.
- `DELETE /api/admin/nodes/{id}`: Delete a node (cascades to connected edges).
- `POST /api/admin/edges`: Create a walkable edge between two nodes.
- `DELETE /api/admin/edges/{id}`: Remove an edge.
*(Note: Any node or edge mutation automatically invalidates and refreshes the in-memory routing graph cache).*

