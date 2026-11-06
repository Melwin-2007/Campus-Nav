import React from 'react';
import {
  Compass,
  ArrowUp,
  ArrowUpRight,
  CornerUpRight,
  ArrowDownRight,
  ArrowUpLeft,
  CornerUpLeft,
  ArrowDownLeft,
  RotateCcw,
  Flag,
  Navigation,
  LucideIcon,
} from 'lucide-react';
import { ManeuverAction } from '../types';

export interface ManeuverVisualConfig {
  action: string;
  label: string;
  icon: LucideIcon;
  colorHex: string;
  bgLightClass: string;
  bgDarkClass: string;
  textClass: string;
  borderClass: string;
  rotationDegrees: number;
}

export const MANEUVER_CONFIGS: Record<string, ManeuverVisualConfig> = {
  depart: {
    action: 'depart',
    label: 'Depart',
    icon: Compass,
    colorHex: '#10B981', // Emerald
    bgLightClass: 'bg-emerald-500/15',
    bgDarkClass: 'dark:bg-emerald-500/20',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    borderClass: 'border-emerald-500/30',
    rotationDegrees: 0,
  },
  head: {
    action: 'head',
    label: 'Head',
    icon: Navigation,
    colorHex: '#10B981',
    bgLightClass: 'bg-emerald-500/15',
    bgDarkClass: 'dark:bg-emerald-500/20',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    borderClass: 'border-emerald-500/30',
    rotationDegrees: 0,
  },
  straight: {
    action: 'straight',
    label: 'Continue Straight',
    icon: ArrowUp,
    colorHex: '#14B8A6', // Brand Teal
    bgLightClass: 'bg-teal-500/15',
    bgDarkClass: 'dark:bg-teal-500/20',
    textClass: 'text-teal-700 dark:text-teal-300',
    borderClass: 'border-teal-500/30',
    rotationDegrees: 0,
  },
  slight_right: {
    action: 'slight_right',
    label: 'Bear Slightly Right',
    icon: ArrowUpRight,
    colorHex: '#14B8A6',
    bgLightClass: 'bg-teal-500/15',
    bgDarkClass: 'dark:bg-teal-500/20',
    textClass: 'text-teal-700 dark:text-teal-300',
    borderClass: 'border-teal-500/30',
    rotationDegrees: 30,
  },
  turn_right: {
    action: 'turn_right',
    label: 'Turn Right',
    icon: CornerUpRight,
    colorHex: '#14B8A6',
    bgLightClass: 'bg-teal-500/15',
    bgDarkClass: 'dark:bg-teal-500/20',
    textClass: 'text-teal-700 dark:text-teal-300',
    borderClass: 'border-teal-500/30',
    rotationDegrees: 90,
  },
  right: {
    action: 'right',
    label: 'Turn Right',
    icon: CornerUpRight,
    colorHex: '#14B8A6',
    bgLightClass: 'bg-teal-500/15',
    bgDarkClass: 'dark:bg-teal-500/20',
    textClass: 'text-teal-700 dark:text-teal-300',
    borderClass: 'border-teal-500/30',
    rotationDegrees: 90,
  },
  sharp_right: {
    action: 'sharp_right',
    label: 'Sharp Right',
    icon: ArrowDownRight,
    colorHex: '#F59E0B', // Amber
    bgLightClass: 'bg-amber-500/15',
    bgDarkClass: 'dark:bg-amber-500/20',
    textClass: 'text-amber-700 dark:text-amber-300',
    borderClass: 'border-amber-500/30',
    rotationDegrees: 150,
  },
  slight_left: {
    action: 'slight_left',
    label: 'Bear Slightly Left',
    icon: ArrowUpLeft,
    colorHex: '#14B8A6',
    bgLightClass: 'bg-teal-500/15',
    bgDarkClass: 'dark:bg-teal-500/20',
    textClass: 'text-teal-700 dark:text-teal-300',
    borderClass: 'border-teal-500/30',
    rotationDegrees: -30,
  },
  turn_left: {
    action: 'turn_left',
    label: 'Turn Left',
    icon: CornerUpLeft,
    colorHex: '#14B8A6',
    bgLightClass: 'bg-teal-500/15',
    bgDarkClass: 'dark:bg-teal-500/20',
    textClass: 'text-teal-700 dark:text-teal-300',
    borderClass: 'border-teal-500/30',
    rotationDegrees: -90,
  },
  left: {
    action: 'left',
    label: 'Turn Left',
    icon: CornerUpLeft,
    colorHex: '#14B8A6',
    bgLightClass: 'bg-teal-500/15',
    bgDarkClass: 'dark:bg-teal-500/20',
    textClass: 'text-teal-700 dark:text-teal-300',
    borderClass: 'border-teal-500/30',
    rotationDegrees: -90,
  },
  sharp_left: {
    action: 'sharp_left',
    label: 'Sharp Left',
    icon: ArrowDownLeft,
    colorHex: '#F59E0B', // Amber
    bgLightClass: 'bg-amber-500/15',
    bgDarkClass: 'dark:bg-amber-500/20',
    textClass: 'text-amber-700 dark:text-amber-300',
    borderClass: 'border-amber-500/30',
    rotationDegrees: -150,
  },
  u_turn: {
    action: 'u_turn',
    label: 'Make a U-Turn',
    icon: RotateCcw,
    colorHex: '#F59E0B',
    bgLightClass: 'bg-amber-500/15',
    bgDarkClass: 'dark:bg-amber-500/20',
    textClass: 'text-amber-700 dark:text-amber-300',
    borderClass: 'border-amber-500/30',
    rotationDegrees: 180,
  },
  arrive: {
    action: 'arrive',
    label: 'Arrive at Destination',
    icon: Flag,
    colorHex: '#EF4444', // Crimson
    bgLightClass: 'bg-rose-500/15',
    bgDarkClass: 'dark:bg-rose-500/20',
    textClass: 'text-rose-700 dark:text-rose-300',
    borderClass: 'border-rose-500/30',
    rotationDegrees: 0,
  },
};

/**
 * Returns visual configuration for a given maneuver action token.
 * Defaults to 'straight' for unknown actions.
 */
export function getManeuverConfig(action?: ManeuverAction | string | null): ManeuverVisualConfig {
  if (!action) {
    return MANEUVER_CONFIGS.straight;
  }
  const normalized = action.toLowerCase().trim();
  return MANEUVER_CONFIGS[normalized] || MANEUVER_CONFIGS.straight;
}
