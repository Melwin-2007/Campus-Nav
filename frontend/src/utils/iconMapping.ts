import React from 'react';
import {
  GraduationCap,
  Building2,
  FlaskConical,
  Landmark,
  Library,
  Utensils,
  Trophy,
  HeartPulse,
  Car,
  Bath,
  DoorOpen,
  MoreHorizontal,
  MapPin,
  Wifi,
  Accessibility,
  ArrowUpDown,
  Wind,
  Zap,
  Coffee,
  BookOpen,
  CreditCard,
  Store,
  CheckCircle2,
  LucideIcon,
} from 'lucide-react';

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  GraduationCap,
  Building2,
  FlaskConical,
  Landmark,
  Library,
  Utensils,
  Trophy,
  HeartPulse,
  Car,
  Bath,
  DoorOpen,
  MoreHorizontal,
  MapPin,
};

export const CATEGORY_SLUG_COLORS: Record<string, string> = {
  'academic-buildings': '#3B82F6',
  departments: '#8B5CF6',
  laboratories: '#06B6D4',
  administration: '#64748B',
  libraries: '#10B981',
  'food-and-cafeteria': '#F97316',
  sports: '#84CC16',
  medical: '#F43F5E',
  parking: '#2563EB',
  washrooms: '#14B8A6',
  'entrances-and-exits': '#F59E0B',
  other: '#A855F7',
};

export function getCategoryIconComponent(iconName: string): LucideIcon {
  return CATEGORY_ICON_MAP[iconName] || MapPin;
}

export function getFacilityIconComponent(facilityName: string): LucideIcon {
  const lower = facilityName.toLowerCase();
  if (lower.includes('wifi') || lower.includes('wi-fi') || lower.includes('internet')) {
    return Wifi;
  }
  if (lower.includes('wheelchair') || lower.includes('ramp') || lower.includes('accessible')) {
    return Accessibility;
  }
  if (lower.includes('restroom') || lower.includes('washroom') || lower.includes('bath') || lower.includes('toilet')) {
    return Bath;
  }
  if (lower.includes('elevator') || lower.includes('lift')) {
    return ArrowUpDown;
  }
  if (lower.includes('ac') || lower.includes('air condition') || lower.includes('cooling')) {
    return Wind;
  }
  if (lower.includes('medical') || lower.includes('doctor') || lower.includes('first aid') || lower.includes('pharmacy')) {
    return HeartPulse;
  }
  if (lower.includes('ev') || lower.includes('charging') || lower.includes('electric')) {
    return Zap;
  }
  if (lower.includes('parking') || lower.includes('vehicle')) {
    return Car;
  }
  if (lower.includes('canteen') || lower.includes('food') || lower.includes('dining')) {
    return Utensils;
  }
  if (lower.includes('coffee') || lower.includes('cafe')) {
    return Coffee;
  }
  if (lower.includes('study') || lower.includes('book') || lower.includes('library')) {
    return BookOpen;
  }
  if (lower.includes('atm') || lower.includes('cash')) {
    return CreditCard;
  }
  if (lower.includes('store') || lower.includes('shop') || lower.includes('stationery')) {
    return Store;
  }
  return CheckCircle2;
}
