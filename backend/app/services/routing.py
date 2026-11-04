"""Campus Navigator Core Pathfinding and Routing Engine.

Provides dual graph routing implementations:
- Hand-crafted Dijkstra (heapq min-priority queue)
- Hand-crafted A* with great-circle Haversine distance heuristic
Guarantees distance parity across all connected graph topologies.
"""

from __future__ import annotations

import heapq
import math
from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Set, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.location import Location
from app.models.path_edge import PathEdge
from app.models.path_node import PathNode
from app.schemas.routing import RouteRequest, RouteResponse, RouteStep

EARTH_RADIUS_METERS = 6371000.0
NOMINAL_WALKING_SPEED_MPS = 1.3
ACCESSIBLE_WALKING_SPEED_MPS = 1.0
MAX_SNAP_DISTANCE_METERS = 300.0


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance in meters between two geodetic coordinates."""
    if math.isclose(lat1, lat2, abs_tol=1e-9) and math.isclose(lon1, lon2, abs_tol=1e-9):
        return 0.0

    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    a_clamped = max(0.0, min(1.0, a))
    c = 2.0 * math.atan2(math.sqrt(a_clamped), math.sqrt(1.0 - a_clamped))
    return EARTH_RADIUS_METERS * c


def calculate_initial_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates forward initial bearing in degrees [0, 360) from point 1 to point 2."""
    if math.isclose(lat1, lat2, abs_tol=1e-7) and math.isclose(lon1, lon2, abs_tol=1e-7):
        return 0.0

    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)

    y = math.sin(delta_lambda) * math.cos(phi2)
    x = (
        math.cos(phi1) * math.sin(phi2)
        - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)
    )
    theta = math.atan2(y, x)
    return (math.degrees(theta) + 360.0) % 360.0


def calculate_angular_divergence(bearing_in: float, bearing_out: float) -> float:
    """Calculates relative turn angle in (-180, +180] from incoming to outgoing bearing."""
    diff = (bearing_out - bearing_in + 180.0) % 360.0 - 180.0
    if diff <= -180.0:
        diff += 360.0
    return diff


def categorize_turn(turn_angle: float) -> str:
    """Categorizes turn angle in (-180, +180] into 8 navigation maneuver classes."""
    if -20.0 <= turn_angle <= 20.0:
        return "straight"
    elif 20.0 < turn_angle <= 45.0:
        return "slight_right"
    elif 45.0 < turn_angle <= 135.0:
        return "right"
    elif 135.0 < turn_angle <= 170.0:
        return "sharp_right"
    elif -45.0 <= turn_angle < -20.0:
        return "slight_left"
    elif -135.0 <= turn_angle < -45.0:
        return "left"
    elif -170.0 <= turn_angle < -135.0:
        return "sharp_left"
    elif turn_angle > 170.0 or turn_angle < -170.0:
        return "u_turn"
    return "straight"


def get_cardinal_direction(bearing: float) -> str:
    """Converts bearing [0, 360) into 8-point compass cardinal heading."""
    cardinals = ["North", "Northeast", "East", "Southeast", "South", "Southwest", "West", "Northwest"]
    index = int(((bearing + 22.5) % 360.0) // 45.0)
    return cardinals[index]


@dataclass(slots=True, frozen=True)
class GraphNode:
    id: int
    latitude: float
    longitude: float
    floor: int = 0
    node_type: str = "junction"
    is_accessible: bool = True
    is_active: bool = True
    name: Optional[str] = None


@dataclass(slots=True, frozen=True)
class GraphEdge:
    id: int
    from_node_id: int
    to_node_id: int
    distance: float
    edge_type: str = "footpath"
    is_accessible: bool = True
    is_bidirectional: bool = True
    is_active: bool = True


class CampusGraph:
    """In-memory spatial graph representation supporting Dijkstra and A* pathfinding."""

    def __init__(
        self,
        nodes: Sequence[GraphNode],
        edges: Sequence[GraphEdge],
        locations: Optional[Sequence[Location]] = None,
    ):
        self.nodes: Dict[int, GraphNode] = {n.id: n for n in nodes if n.is_active}
        self.adjacency: Dict[int, List[GraphEdge]] = {nid: [] for nid in self.nodes}

        for edge in edges:
            if not edge.is_active:
                continue
            if edge.from_node_id in self.nodes and edge.to_node_id in self.nodes:
                self.adjacency[edge.from_node_id].append(edge)
                if edge.is_bidirectional:
                    rev_edge = GraphEdge(
                        id=edge.id,
                        from_node_id=edge.to_node_id,
                        to_node_id=edge.from_node_id,
                        distance=edge.distance,
                        edge_type=edge.edge_type,
                        is_accessible=edge.is_accessible,
                        is_bidirectional=True,
                        is_active=True,
                    )
                    self.adjacency[edge.to_node_id].append(rev_edge)

        self.node_to_location: Dict[int, str] = {}
        if locations:
            for loc in locations:
                if loc.is_active and loc.entrance_node_id and loc.entrance_node_id in self.nodes:
                    self.node_to_location[loc.entrance_node_id] = loc.name

    def snap_coordinate(
        self,
        lat: float,
        lon: float,
        accessible_only: bool = False,
        max_snap_meters: float = MAX_SNAP_DISTANCE_METERS,
        is_destination: bool = False,
    ) -> Tuple[int, float]:
        """Snaps coordinate to nearest active node within max_snap_meters."""
        candidates = [
            n for n in self.nodes.values()
            if not accessible_only or n.is_accessible
        ]

        if not candidates:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active accessible graph nodes available on campus.",
            )

        best_id: Optional[int] = None
        best_dist = float("inf")

        for node in candidates:
            dist = haversine_distance(lat, lon, node.latitude, node.longitude)
            if dist < best_dist:
                best_dist = dist
                best_id = node.id

        if best_id is None or best_dist > max_snap_meters:
            if is_destination:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Destination coordinates are outside the campus boundary (>{max_snap_meters}m distance). Please choose a campus location.",
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"You seem to be away from campus – choose a starting point manually. Coordinates are outside the campus boundary (>{max_snap_meters}m distance).",
                )

        return best_id, best_dist

    def find_shortest_path_dijkstra(
        self, start_id: int, target_id: int, accessible_only: bool = False
    ) -> Tuple[List[int], float]:
        """Computes shortest path using hand-crafted Dijkstra min-heap."""
        if start_id not in self.nodes or target_id not in self.nodes:
            return [], float("inf")
        if start_id == target_id:
            return [start_id], 0.0

        if accessible_only:
            if not self.nodes[start_id].is_accessible or not self.nodes[target_id].is_accessible:
                return [], float("inf")

        distances: Dict[int, float] = {start_id: 0.0}
        predecessors: Dict[int, int] = {}
        visited: Set[int] = set()
        queue: List[Tuple[float, int]] = [(0.0, start_id)]

        while queue:
            cost, u = heapq.heappop(queue)
            if u in visited:
                continue
            visited.add(u)
            if u == target_id:
                break

            for edge in self.adjacency.get(u, []):
                v = edge.to_node_id
                if v not in self.nodes or not self.nodes[v].is_active:
                    continue
                if accessible_only:
                    if (
                        not edge.is_accessible
                        or edge.edge_type.lower() == "stairs"
                        or not self.nodes[v].is_accessible
                    ):
                        continue

                tentative_dist = cost + edge.distance
                if tentative_dist < distances.get(v, float("inf")):
                    distances[v] = tentative_dist
                    predecessors[v] = u
                    heapq.heappush(queue, (tentative_dist, v))

        if target_id not in distances or math.isinf(distances[target_id]):
            return [], float("inf")

        path = []
        curr: Optional[int] = target_id
        while curr is not None:
            path.append(curr)
            curr = predecessors.get(curr)
        path.reverse()
        return path, distances[target_id]

    def find_shortest_path_astar(
        self, start_id: int, target_id: int, accessible_only: bool = False
    ) -> Tuple[List[int], float]:
        """Computes shortest path using hand-crafted A* with Haversine heuristic."""
        if start_id not in self.nodes or target_id not in self.nodes:
            return [], float("inf")
        if start_id == target_id:
            return [start_id], 0.0

        if accessible_only:
            if not self.nodes[start_id].is_accessible or not self.nodes[target_id].is_accessible:
                return [], float("inf")

        target_node = self.nodes[target_id]

        def heuristic(uid: int) -> float:
            unode = self.nodes[uid]
            return haversine_distance(
                unode.latitude, unode.longitude, target_node.latitude, target_node.longitude
            )

        g_scores: Dict[int, float] = {start_id: 0.0}
        predecessors: Dict[int, int] = {}
        visited: Set[int] = set()
        h0 = heuristic(start_id)
        queue: List[Tuple[float, float, int]] = [(h0, h0, start_id)]

        while queue:
            f_val, h_val, u = heapq.heappop(queue)
            if u in visited:
                continue
            visited.add(u)
            if u == target_id:
                break

            g_u = g_scores[u]
            for edge in self.adjacency.get(u, []):
                v = edge.to_node_id
                if v not in self.nodes or not self.nodes[v].is_active:
                    continue
                if accessible_only:
                    if (
                        not edge.is_accessible
                        or edge.edge_type.lower() == "stairs"
                        or not self.nodes[v].is_accessible
                    ):
                        continue

                tentative_g = g_u + edge.distance
                if tentative_g < g_scores.get(v, float("inf")):
                    g_scores[v] = tentative_g
                    h_v = heuristic(v)
                    f_v = tentative_g + h_v
                    predecessors[v] = u
                    heapq.heappush(queue, (f_v, h_v, v))

        if target_id not in g_scores or math.isinf(g_scores[target_id]):
            return [], float("inf")

        path = []
        curr: Optional[int] = target_id
        while curr is not None:
            path.append(curr)
            curr = predecessors.get(curr)
        path.reverse()
        return path, g_scores[target_id]

    def _generate_steps(self, path: List[int], speed: float) -> List[RouteStep]:
        """Generates turn-by-turn navigation steps with collinear straight-segment merging."""
        if not path:
            return []

        if len(path) == 1:
            node = self.nodes[path[0]]
            loc_label = self.node_to_location.get(node.id) or node.name or "Destination"
            return [
                RouteStep(
                    step_number=1,
                    instruction=f"You are already at your destination: {loc_label}",
                    action="arrive",
                    maneuver="arrive",
                    distance_meters=0.0,
                    duration_seconds=0,
                    bearing=0.0,
                    lat=node.latitude,
                    lon=node.longitude,
                    coordinates=[node.latitude, node.longitude],
                    location_name=loc_label,
                )
            ]

        # Calculate segments between consecutive nodes
        raw_segments = []
        for i in range(len(path) - 1):
            u_node = self.nodes[path[i]]
            v_node = self.nodes[path[i + 1]]
            d = haversine_distance(u_node.latitude, u_node.longitude, v_node.latitude, v_node.longitude)
            b = calculate_initial_bearing(u_node.latitude, u_node.longitude, v_node.latitude, v_node.longitude)
            raw_segments.append({"u": u_node, "v": v_node, "dist": d, "bearing": b})

        # Categorize maneuvers at junctions
        for i in range(len(raw_segments)):
            if i == 0:
                raw_segments[0]["maneuver"] = "straight"
                raw_segments[0]["turn_angle"] = 0.0
            else:
                prev_b = raw_segments[i - 1]["bearing"]
                curr_b = raw_segments[i]["bearing"]
                angle = calculate_angular_divergence(prev_b, curr_b)
                raw_segments[i]["turn_angle"] = angle
                raw_segments[i]["maneuver"] = categorize_turn(angle)

        # Collinear straight-segment merging
        merged_runs = []
        curr_run = []
        for seg in raw_segments:
            if not curr_run:
                curr_run.append(seg)
            else:
                if seg["maneuver"] == "straight":
                    curr_run.append(seg)
                else:
                    merged_runs.append(curr_run)
                    curr_run = [seg]
        if curr_run:
            merged_runs.append(curr_run)

        # Step cards construction
        steps: List[RouteStep] = []
        step_num = 1

        for idx, run in enumerate(merged_runs):
            first_seg = run[0]
            last_seg = run[-1]
            total_dist = sum(s["dist"] for s in run)
            duration_sec = round(total_dist / speed) if speed > 0 else 0
            bearing = round(first_seg["bearing"], 1)
            start_node = first_seg["u"]
            target_node = last_seg["v"]
            target_name = (
                self.node_to_location.get(target_node.id)
                or target_node.name
                or f"Node {target_node.id}"
            )
            start_name = self.node_to_location.get(start_node.id) or start_node.name

            if idx == 0:
                cardinal = get_cardinal_direction(first_seg["bearing"])
                if start_name:
                    instruction = f"Head {cardinal} from {start_name} towards {target_name}"
                else:
                    instruction = f"Head {cardinal} towards {target_name}"
                maneuver = "straight"
            else:
                maneuver = first_seg["maneuver"]
                templates = {
                    "straight": f"Continue straight towards {target_name}",
                    "slight_right": f"Slight right towards {target_name}",
                    "right": f"Turn right towards {target_name}",
                    "sharp_right": f"Sharp right towards {target_name}",
                    "slight_left": f"Slight left towards {target_name}",
                    "left": f"Turn left towards {target_name}",
                    "sharp_left": f"Sharp left towards {target_name}",
                    "u_turn": f"Make a U-turn towards {target_name}",
                }
                base_text = templates.get(maneuver, f"Continue towards {target_name}")
                if start_name:
                    turn_word = maneuver.replace("_", " ")
                    instruction = f"At {start_name}, {turn_word} towards {target_name}"
                else:
                    instruction = base_text

            steps.append(
                RouteStep(
                    step_number=step_num,
                    instruction=instruction,
                    action=maneuver,
                    maneuver=maneuver,
                    distance_meters=round(total_dist, 1),
                    duration_seconds=duration_sec,
                    bearing=bearing,
                    lat=start_node.latitude,
                    lon=start_node.longitude,
                    coordinates=[start_node.latitude, start_node.longitude],
                    location_name=start_name,
                )
            )
            step_num += 1

        # Final terminal arrival step
        dest_node = self.nodes[path[-1]]
        dest_name = (
            self.node_to_location.get(dest_node.id)
            or dest_node.name
            or "Destination"
        )
        steps.append(
            RouteStep(
                step_number=step_num,
                instruction=f"You have reached your destination: {dest_name}",
                action="arrive",
                maneuver="arrive",
                distance_meters=0.0,
                duration_seconds=0,
                bearing=steps[-1].bearing if steps else 0.0,
                lat=dest_node.latitude,
                lon=dest_node.longitude,
                coordinates=[dest_node.latitude, dest_node.longitude],
                location_name=dest_name,
            )
        )

        return steps


# Module-level graph cache
_graph_cache: Optional[CampusGraph] = None


def invalidate_graph_cache() -> None:
    """Invalidates cached campus graph singleton."""
    global _graph_cache
    _graph_cache = None


def get_campus_graph(db: Session, required_node_ids: Optional[Set[int]] = None) -> CampusGraph:
    """Retrieves or builds cached in-memory graph representation."""
    global _graph_cache
    if _graph_cache is not None:
        if required_node_ids:
            if required_node_ids.issubset(_graph_cache.nodes.keys()):
                return _graph_cache
        else:
            return _graph_cache

    nodes = db.scalars(select(PathNode).where(PathNode.is_active == True)).all()
    edges = db.scalars(select(PathEdge).where(PathEdge.is_active == True)).all()
    locations = db.scalars(select(Location).where(Location.is_active == True)).all()

    graph_nodes = [
        GraphNode(
            id=n.id,
            latitude=n.latitude,
            longitude=n.longitude,
            floor=n.floor,
            node_type=n.node_type,
            is_accessible=n.is_accessible,
            is_active=n.is_active,
            name=n.name,
        )
        for n in nodes
    ]

    graph_edges = [
        GraphEdge(
            id=e.id,
            from_node_id=e.from_node_id,
            to_node_id=e.to_node_id,
            distance=e.distance,
            edge_type=e.edge_type,
            is_accessible=e.is_accessible,
            is_bidirectional=e.is_bidirectional,
            is_active=e.is_active,
        )
        for e in edges
    ]

    _graph_cache = CampusGraph(graph_nodes, graph_edges, locations)
    return _graph_cache


class RoutingService:
    """Service orchestrating coordinate snapping, pathfinding, and step synthesis."""

    def __init__(self, db: Session):
        self.db = db

    def calculate_route(self, request: RouteRequest) -> RouteResponse:
        """Calculates optimal path and builds full turn-by-turn route response."""
        # 1. Resolve start and destination locations if location IDs supplied
        if request.start_node_id is None and request.start_location_id is not None:
            loc = self.db.get(Location, request.start_location_id)
            if not loc or not loc.is_active:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Starting location {request.start_location_id} not found or inactive.",
                )
            if loc.entrance_node_id:
                request.start_node_id = loc.entrance_node_id
            else:
                request.start_lat = loc.latitude
                request.start_lon = loc.longitude

        if request.destination_node_id is None and request.destination_location_id is not None:
            loc = self.db.get(Location, request.destination_location_id)
            if not loc or not loc.is_active:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Destination location {request.destination_location_id} not found or inactive.",
                )
            if loc.entrance_node_id:
                request.destination_node_id = loc.entrance_node_id
            else:
                request.dest_lat = loc.latitude
                request.dest_lon = loc.longitude

        # 2. Collect known IDs for cache pre-validation
        known_ids: Set[int] = set()
        if request.start_node_id is not None:
            known_ids.add(request.start_node_id)
        if request.destination_node_id is not None:
            known_ids.add(request.destination_node_id)

        graph = get_campus_graph(self.db, required_node_ids=known_ids)

        snapped_distance_meters: Optional[float] = None

        # 3. Coordinate snapping for origin
        if request.start_node_id is None:
            if request.start_lat is not None and request.start_lon is not None:
                node_id, snap_d = graph.snap_coordinate(
                    request.start_lat,
                    request.start_lon,
                    accessible_only=request.accessible_only,
                    is_destination=False,
                )
                request.start_node_id = node_id
                snapped_distance_meters = round(snap_d, 2)
            else:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Starting point must be specified via start_node_id, start_coords, or start_lat/start_lon.",
                )

        # 4. Coordinate snapping for destination
        if request.destination_node_id is None:
            dest_lat = request.dest_lat if request.dest_lat is not None else request.destination_lat
            dest_lon = request.dest_lon if request.dest_lon is not None else request.destination_lon
            if dest_lat is not None and dest_lon is not None:
                node_id, snap_d = graph.snap_coordinate(
                    dest_lat,
                    dest_lon,
                    accessible_only=request.accessible_only,
                    is_destination=True,
                )
                request.destination_node_id = node_id
            else:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Destination must be specified via destination_node_id, destination_coords, or dest_lat/dest_lon.",
                )

        # 5. Validate resolved nodes exist in graph
        if request.start_node_id not in graph.nodes:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Starting node {request.start_node_id} not found or inactive.",
            )
        if request.destination_node_id not in graph.nodes:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Destination node {request.destination_node_id} not found or inactive.",
            )

        start_id = request.start_node_id
        dest_id = request.destination_node_id

        # 6. Same origin and destination boundary handling
        if start_id == dest_id:
            node = graph.nodes[start_id]
            dest_name = graph.node_to_location.get(node.id) or node.name or "Destination"
            step = RouteStep(
                step_number=1,
                instruction=f"You are already at your destination: {dest_name}",
                action="arrive",
                maneuver="arrive",
                distance_meters=0.0,
                duration_seconds=0,
                bearing=0.0,
                lat=node.latitude,
                lon=node.longitude,
                coordinates=[node.latitude, node.longitude],
                location_name=dest_name,
            )
            return RouteResponse(
                distance_meters=0.0,
                total_distance_meters=0.0,
                duration_minutes=0,
                duration_seconds=0,
                estimated_time_seconds=0,
                algorithm_used=request.algorithm.lower(),
                accessible_only=request.accessible_only,
                is_accessible=request.accessible_only,
                start_node_id=start_id,
                destination_node_id=dest_id,
                path_node_ids=[start_id],
                path_nodes=[start_id],
                coordinates=[[node.latitude, node.longitude]],
                steps=[step],
                snapped_distance_meters=snapped_distance_meters,
            )

        # 7. Execute pathfinding algorithm
        algo = request.algorithm.lower()
        if algo == "dijkstra":
            path, dist = graph.find_shortest_path_dijkstra(
                start_id, dest_id, accessible_only=request.accessible_only
            )
        else:
            path, dist = graph.find_shortest_path_astar(
                start_id, dest_id, accessible_only=request.accessible_only
            )

        # 8. Unreachable path and two-tier accessibility failure handling
        if not path or math.isinf(dist):
            if request.accessible_only:
                # Check if reachable without accessibility filter
                unfiltered_path, _ = graph.find_shortest_path_dijkstra(
                    start_id, dest_id, accessible_only=False
                )
                if unfiltered_path:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="No wheelchair-accessible route found between these locations. The route contains stairs or inaccessible pathways.",
                    )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="No route found between selected points. The destination may be unreachable.",
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No route found between selected points. The destination may be unreachable.",
                )

        # 9. Velocity and duration estimation
        speed = ACCESSIBLE_WALKING_SPEED_MPS if request.accessible_only else NOMINAL_WALKING_SPEED_MPS
        dur_secs = round(dist / speed)
        dur_mins = max(1, math.ceil(dur_secs / 60))

        # 10. Polyline coordinates and turn-by-turn steps
        coords = [[graph.nodes[nid].latitude, graph.nodes[nid].longitude] for nid in path]
        steps = graph._generate_steps(path, speed)

        return RouteResponse(
            distance_meters=round(dist, 2),
            total_distance_meters=round(dist, 2),
            duration_minutes=dur_mins,
            duration_seconds=dur_secs,
            estimated_time_seconds=dur_secs,
            algorithm_used=algo,
            accessible_only=request.accessible_only,
            is_accessible=request.accessible_only,
            start_node_id=start_id,
            destination_node_id=dest_id,
            path_node_ids=path,
            path_nodes=path,
            coordinates=coords,
            steps=steps,
            snapped_distance_meters=snapped_distance_meters,
        )
