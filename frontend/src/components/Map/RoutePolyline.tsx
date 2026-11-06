import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Polyline, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '../../context/NavigationContext';
import { RouteResponse } from '../../types';
import { getManeuverConfig } from '../../utils/maneuverMapping';
import { haversineDistance } from '../../utils/geoUtils';

interface RoutePolylineProps {
  route: RouteResponse;
}

// Custom Leaflet DivIcon for start pin (Emerald with white casing)
const startPinIcon = L.divIcon({
  html: `
    <div style="
      background-color: #10B981;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid #FFFFFF;
      box-shadow: 0 3px 10px rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="background-color: #FFFFFF; width: 6px; height: 6px; border-radius: 50%;"></div>
    </div>
  `,
  className: 'route-start-pin-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Custom Leaflet DivIcon for destination flag pin (Crimson with flag SVG)
const destPinIcon = L.divIcon({
  html: `
    <div style="
      background-color: #EF4444;
      width: 28px;
      height: 28px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2.5px solid #FFFFFF;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
          <line x1="4" y1="22" x2="4" y2="15"></line>
        </svg>
      </div>
    </div>
  `,
  className: 'route-dest-pin-marker',
  iconSize: [28, 28],
  iconAnchor: [6, 26],
});

// Create active maneuver step icon
function createStepIcon(maneuver: string, stepNumber: number) {
  const config = getManeuverConfig(maneuver);
  return L.divIcon({
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          position: absolute;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background-color: rgba(20, 184, 166, 0.4);
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></span>
        <div style="
          position: relative;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background-color: #14B8A6;
          border: 2px solid #FFFFFF;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: bold;
        ">
          ${stepNumber}
        </div>
      </div>
    `,
    className: 'active-step-pin-marker',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

export const RoutePolyline: React.FC<RoutePolylineProps> = ({ route }) => {
  const { isDark } = useTheme();
  const { activeStepIndex } = useNavigation();
  const map = useMap();

  const coordinates = route.coordinates;
  const [animatedCoords, setAnimatedCoords] = useState<[number, number][]>(coordinates);
  const [isAnimationComplete, setIsAnimationComplete] = useState<boolean>(false);
  const animFrameRef = useRef<number | null>(null);

  // Progressive interpolation draw-in animation hook
  useEffect(() => {
    if (!coordinates || coordinates.length < 2) {
      setAnimatedCoords(coordinates || []);
      setIsAnimationComplete(true);
      return;
    }

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setAnimatedCoords(coordinates);
      setIsAnimationComplete(true);
      return;
    }

    // Compute segment distances & total distance
    const segmentDists: number[] = [];
    let totalDist = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
      const d = haversineDistance(
        coordinates[i][0],
        coordinates[i][1],
        coordinates[i + 1][0],
        coordinates[i + 1][1]
      );
      segmentDists.push(d);
      totalDist += d;
    }

    if (totalDist <= 0) {
      setAnimatedCoords(coordinates);
      setIsAnimationComplete(true);
      return;
    }

    const duration = 1000; // 1.0s
    let startTime: number | null = null;
    setIsAnimationComplete(false);

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1.0);

      // Ease-out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const targetDist = easedProgress * totalDist;

      // Slice completed segments and interpolate leading head
      let accumulated = 0;
      const currentCoords: [number, number][] = [coordinates[0]];

      for (let i = 0; i < segmentDists.length; i++) {
        const segDist = segmentDists[i];
        if (accumulated + segDist <= targetDist) {
          currentCoords.push(coordinates[i + 1]);
          accumulated += segDist;
        } else {
          // Fraction along current segment
          const segProgress = (targetDist - accumulated) / segDist;
          const lat = coordinates[i][0] + segProgress * (coordinates[i + 1][0] - coordinates[i][0]);
          const lon = coordinates[i][1] + segProgress * (coordinates[i + 1][1] - coordinates[i][1]);
          currentCoords.push([lat, lon]);
          break;
        }
      }

      setAnimatedCoords(currentCoords);

      if (progress < 1.0) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        setAnimatedCoords(coordinates);
        setIsAnimationComplete(true);
      }
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [coordinates]);

  // Directional fitBounds with asymmetric padding
  useEffect(() => {
    if (!coordinates || coordinates.length < 2) return;

    const bounds = L.latLngBounds(coordinates);
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      // Mobile: clear bottom sheet (~48vh) and top search bar (70px)
      map.fitBounds(bounds, {
        paddingTopLeft: [24, 70],
        paddingBottomRight: [24, Math.round(window.innerHeight * 0.48)],
        maxZoom: 18,
        animate: true,
        duration: 0.8,
      });
    } else {
      // Desktop: clear left panel (420px + margins = 450px)
      map.fitBounds(bounds, {
        paddingTopLeft: [450, 40],
        paddingBottomRight: [40, 40],
        maxZoom: 18,
        animate: true,
        duration: 0.8,
      });
    }
  }, [coordinates, map]);

  const activeStep =
    activeStepIndex !== null && route.steps && route.steps[activeStepIndex]
      ? route.steps[activeStepIndex]
      : null;

  return (
    <>
      {/* 1. Outer White Casing Outline */}
      <Polyline
        positions={animatedCoords}
        pathOptions={{
          color: isDark ? '#0F172A' : '#FFFFFF',
          weight: 10,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />

      {/* 2. Core Vibrant Teal Line */}
      <Polyline
        positions={animatedCoords}
        pathOptions={{
          color: '#14B8A6',
          weight: 6,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />

      {/* 3. Flowing Dash Overlay (activated when drawing finishes) */}
      {isAnimationComplete && (
        <Polyline
          positions={coordinates}
          pathOptions={{
            color: '#CCFBF1',
            weight: 3,
            opacity: 0.85,
            className: 'leaflet-route-flow',
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      )}

      {/* 4. Start Pin */}
      {coordinates.length > 0 && (
        <Marker position={coordinates[0]} icon={startPinIcon}>
          <Tooltip direction="top" offset={[0, -12]}>
            <span className="font-semibold text-xs text-emerald-700">Starting Point</span>
          </Tooltip>
        </Marker>
      )}

      {/* 5. Destination Flag Pin */}
      {coordinates.length > 1 && (
        <Marker position={coordinates[coordinates.length - 1]} icon={destPinIcon}>
          <Tooltip direction="top" offset={[0, -26]}>
            <span className="font-semibold text-xs text-rose-700">Destination</span>
          </Tooltip>
        </Marker>
      )}

      {/* 6. Active Step Maneuver Pin */}
      {activeStep && (
        <Marker
          position={[activeStep.lat, activeStep.lon]}
          icon={createStepIcon(activeStep.action || activeStep.maneuver, activeStep.step_number)}
          zIndexOffset={2000}
        >
          <Tooltip direction="top" offset={[0, -20]} permanent>
            <div className="text-xs font-semibold text-slate-800">
              {activeStep.instruction}
            </div>
          </Tooltip>
        </Marker>
      )}
    </>
  );
};

export default RoutePolyline;
