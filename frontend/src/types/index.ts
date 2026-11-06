/**
 * TypeScript Data Models & Contract Definitions for Campus Navigator.
 * Strictly aligned with FastAPI Pydantic v2 schemas in backend/app/schemas/
 */

// ============================================================================
// 1. Category Types
// ============================================================================

export interface CategoryBase {
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  is_active: boolean;
}

export interface CategoryCreate extends CategoryBase {}

export interface CategoryUpdate {
  name?: string;
  slug?: string;
  description?: string | null;
  icon?: string;
  color?: string;
  is_active?: boolean;
}

export interface Category extends CategoryBase {
  id: number;
  created_at: string;
  location_count: number;
}

// ============================================================================
// 2. Path Node & Edge Types
// ============================================================================

export type NodeType = 'entrance' | 'junction' | 'gate' | 'landmark';

export interface PathNodeBase {
  name: string | null;
  latitude: number;
  longitude: number;
  floor: number;
  node_type: NodeType | string;
  is_accessible: boolean;
  is_active: boolean;
}

export interface PathNodeCreate extends PathNodeBase {}

export interface PathNodeUpdate {
  name?: string | null;
  latitude?: number;
  longitude?: number;
  floor?: number;
  node_type?: string;
  is_accessible?: boolean;
  is_active?: boolean;
}

export interface PathNode extends PathNodeBase {
  id: number;
  created_at: string;
}

export type EdgeType = 'footpath' | 'ramp' | 'stairs' | 'corridor' | 'road_crossing';

export interface PathEdgeBase {
  from_node_id: number;
  to_node_id: number;
  distance: number;
  edge_type: EdgeType | string;
  is_accessible: boolean;
  is_bidirectional: boolean;
  is_active: boolean;
}

export interface PathEdgeCreate extends PathEdgeBase {}

export interface PathEdgeUpdate {
  from_node_id?: number;
  to_node_id?: number;
  distance?: number;
  edge_type?: string;
  is_accessible?: boolean;
  is_bidirectional?: boolean;
  is_active?: boolean;
}

export interface PathEdge extends PathEdgeBase {
  id: number;
  created_at: string;
}

// ============================================================================
// 3. Location POI Types
// ============================================================================

export interface LocationBase {
  category_id: number;
  name: string;
  description: string | null;
  department: string | null;
  latitude: number;
  longitude: number;
  entrance_node_id: number | null;
  opening_hours: string | null;
  facilities: string[];
  photo_url: string | null;
  is_active: boolean;
}

export interface LocationCreate extends LocationBase {}

export interface LocationUpdate {
  category_id?: number;
  name?: string;
  description?: string | null;
  department?: string | null;
  latitude?: number;
  longitude?: number;
  entrance_node_id?: number | null;
  opening_hours?: string | null;
  facilities?: string[];
  photo_url?: string | null;
  is_active?: boolean;
}

export interface Location extends LocationBase {
  id: number;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  entrance_node?: PathNode | null;
  qr_identifier?: string | null;
}

export interface LocationDetail extends Location {
  is_open?: boolean | null;
}

// ============================================================================
// 4. Routing Types
// ============================================================================

export type RoutingAlgorithm = 'astar' | 'dijkstra';

export interface RouteRequest {
  start_node_id?: number | null;
  destination_node_id?: number | null;
  start_lat?: number | null;
  start_lon?: number | null;
  dest_lat?: number | null;
  dest_lon?: number | null;
  destination_lat?: number | null;
  destination_lon?: number | null;
  start_coords?: [number, number] | null;
  destination_coords?: [number, number] | null;
  start_location_id?: number | null;
  destination_location_id?: number | null;
  accessible_only?: boolean;
  algorithm?: RoutingAlgorithm | string;
}

export type ManeuverAction =
  | 'depart'
  | 'straight'
  | 'slight_left'
  | 'slight_right'
  | 'turn_left'
  | 'turn_right'
  | 'sharp_left'
  | 'sharp_right'
  | 'u_turn'
  | 'arrive';

export interface RouteStep {
  step_number: number;
  instruction: string;
  action: ManeuverAction | string;
  maneuver: ManeuverAction | string;
  distance_meters: number;
  duration_seconds: number;
  bearing: number;
  lat: number;
  lon: number;
  coordinates: [number, number];
  location_name: string | null;
}

export interface RouteResponse {
  distance_meters: number;
  total_distance_meters?: number;
  duration_minutes: number;
  duration_seconds: number;
  estimated_time_seconds?: number;
  algorithm_used: string;
  accessible_only: boolean;
  is_accessible?: boolean;
  start_node_id: number;
  destination_node_id: number;
  path_node_ids: number[];
  path_nodes?: number[];
  coordinates: [number, number][]; // [[lat, lon], ...]
  steps: RouteStep[];
  snapped_distance_meters?: number | null;
}

// ============================================================================
// 5. QR Code Types
// ============================================================================

export interface QRCode {
  id: number;
  location_id: number;
  identifier: string;
  code_url: string;
  created_at: string;
  location?: Location | null;
}

// ============================================================================
// 6. Admin & Health Types
// ============================================================================

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface HealthResponse {
  status: string;
}

export interface DeleteResponse {
  status: string;
  id: number;
  entity: string;
}

export interface PhotoUploadResponse {
  status: string;
  location_id: number;
  photo_url: string;
  filename: string;
  size_bytes: number;
}

export interface AdminStats {
  total_locations: number;
  total_categories: number;
  total_nodes: number;
  total_edges: number;
  total_qr_codes: number;
  total_issues: number;
  locations_count: number;
  categories_count: number;
  nodes_count: number;
  edges_count: number;
  qr_codes_count: number;
  issues_count: number;
  health_status: 'healthy' | 'warning' | 'critical' | string;
}

export interface TopologyIssue {
  severity: 'warning' | 'error';
  description: string;
  node_id?: number;
  edge_id?: number;
}

export interface DataHealthReport {
  status: 'healthy' | 'warning' | 'critical' | string;
  total_issues: number;
  isolated_nodes: Array<Record<string, unknown>>;
  locations_missing_entrance: Array<Record<string, unknown>>;
  suspect_edges: Array<Record<string, unknown>>;
  orphaned_qr_codes: Array<Record<string, unknown>>;
  summary: Record<string, number>;
}

// ============================================================================
// 7. UI State & Geolocation Types
// ============================================================================

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface OperatingStatus {
  isOpen: boolean | null;
  statusLabel: string;
  badgeVariant: 'emerald' | 'rose' | 'amber' | 'slate';
  detailText: string;
}

export type BottomSheetSnap = 'peek' | 'half' | 'full';

export interface RecentSearchItem {
  id: number;
  name: string;
  categoryName: string;
  categoryColor: string;
  latitude: number;
  longitude: number;
}

// ============================================================================
// 8. Milestone 5 Types: Directions, Graph Editor & Admin Studio
// ============================================================================

export interface EndpointSelection {
  type: 'location' | 'my_location' | 'coordinates';
  location?: Location;
  latitude?: number;
  longitude?: number;
  label: string;
}

export type EditorTool = 'navigate' | 'add_node' | 'link_nodes' | 'inspect';

export type AdminTab = 'overview' | 'locations' | 'graph' | 'tools';

export interface HealthHighlightTarget {
  type: 'node' | 'edge' | 'location';
  id: number;
  latitude: number;
  longitude: number;
  to_latitude?: number;
  to_longitude?: number;
  severity: 'warning' | 'error';
  title: string;
  description: string;
}

export interface ImportRowIssue {
  row_index: number;
  entity: string;
  identifier?: string;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ImportReportResponse {
  status: 'valid' | 'invalid' | 'success';
  dry_run: boolean;
  total_rows: number;
  valid_rows_count: number;
  error_count: number;
  warning_count: number;
  issues: ImportRowIssue[];
  preview: Array<Record<string, unknown>>;
  imported_counts?: Record<string, number>;
  message: string;
}

