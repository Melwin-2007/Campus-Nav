import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORY_ICON_MAP,
  CATEGORY_SLUG_COLORS,
  getCategoryIconComponent,
  getFacilityIconComponent,
} from '../iconMapping';
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
} from 'lucide-react';

// Ground truth from backend/app/seed/campus_data.json
const SEEDED_CATEGORIES = [
  { id: 1, slug: 'academic-buildings', icon: 'GraduationCap', color: '#3B82F6' },
  { id: 2, slug: 'departments', icon: 'Building2', color: '#8B5CF6' },
  { id: 3, slug: 'laboratories', icon: 'FlaskConical', color: '#06B6D4' },
  { id: 4, slug: 'administration', icon: 'Landmark', color: '#64748B' },
  { id: 5, slug: 'libraries', icon: 'Library', color: '#10B981' },
  { id: 6, slug: 'food-and-cafeteria', icon: 'Utensils', color: '#F97316' },
  { id: 7, slug: 'sports', icon: 'Trophy', color: '#84CC16' },
  { id: 8, slug: 'medical', icon: 'HeartPulse', color: '#F43F5E' },
  { id: 9, slug: 'parking', icon: 'Car', color: '#2563EB' },
  { id: 10, slug: 'washrooms', icon: 'Bath', color: '#14B8A6' },
  { id: 11, slug: 'entrances-and-exits', icon: 'DoorOpen', color: '#F59E0B' },
  { id: 12, slug: 'other', icon: 'MoreHorizontal', color: '#A855F7' },
];

describe('iconMapping — Category and Facility Icon & Color Integrity', () => {
  it('should verify all 12 seeded categories have valid registered Lucide icons in CATEGORY_ICON_MAP', () => {
    for (const cat of SEEDED_CATEGORIES) {
      const iconComp = CATEGORY_ICON_MAP[cat.icon];
      assert.ok(iconComp, `Icon "${cat.icon}" for category "${cat.slug}" is missing from CATEGORY_ICON_MAP`);
      assert.strictEqual(typeof iconComp, 'object', `Icon component should be a valid React ForwardRef component`);
    }
  });

  it('should verify getCategoryIconComponent returns matching component for every seeded category', () => {
    for (const cat of SEEDED_CATEGORIES) {
      const iconComp = getCategoryIconComponent(cat.icon);
      assert.strictEqual(iconComp, CATEGORY_ICON_MAP[cat.icon]);
    }
  });

  it('should verify all 12 seeded categories have exact color hex codes in CATEGORY_SLUG_COLORS', () => {
    for (const cat of SEEDED_CATEGORIES) {
      const color = CATEGORY_SLUG_COLORS[cat.slug];
      assert.ok(color, `Color token for category "${cat.slug}" is missing from CATEGORY_SLUG_COLORS`);
      assert.strictEqual(
        color.toUpperCase(),
        cat.color.toUpperCase(),
        `Color mismatch for category "${cat.slug}": expected ${cat.color}, got ${color}`
      );
    }
  });

  it('should fallback to MapPin icon when an unmapped or invalid iconName is provided', () => {
    const fallback1 = getCategoryIconComponent('NonExistentIcon');
    assert.strictEqual(fallback1, MapPin);

    const fallback2 = getCategoryIconComponent('');
    assert.strictEqual(fallback2, MapPin);
  });

  describe('Facility icon mapping resolution', () => {
    const facilityCases: [string, any][] = [
      ['Wi-Fi', Wifi],
      ['High-speed Wi-Fi', Wifi],
      ['Internet Access', Wifi],
      ['Wheelchair Ramp', Accessibility],
      ['Wheelchair Access', Accessibility],
      ['Accessible Stalls', Accessibility], // "accessible" takes precedence over "stalls"
      ['Restroom', Bath],
      ['Washrooms', Bath],
      ['Toilet', Bath],
      ['Elevator', ArrowUpDown],
      ['Lift', ArrowUpDown],
      ['Air Conditioning', Wind],
      ['AC Labs', Wind],
      ['Doctor on Duty', HeartPulse],
      ['First Aid', HeartPulse],
      ['EV Charging', Zap],
      ['Parking', Car],
      ['Canteen', Utensils],
      ['Dining', Utensils],
      ['Coffee Kiosk', Coffee],
      ['Quiet Study', BookOpen],
      ['Digital Lab', CheckCircle2],
      ['ATM', CreditCard],
      ['Stationery Shop', Store],
      ['Parcel Locker', CheckCircle2],
    ];

    for (const [facility, expectedComponent] of facilityCases) {
      it(`should map facility "${facility}" to correct Lucide icon`, () => {
        const comp = getFacilityIconComponent(facility);
        assert.strictEqual(comp, expectedComponent);
      });
    }

    it('should map "Pharmacy" to HeartPulse without colliding with "ac"', () => {
      const comp = getFacilityIconComponent('Pharmacy');
      assert.strictEqual(comp, HeartPulse);
    });

    it('should map parking sub-bays ("Two-wheeler bays", "Car bays") to Car icon', () => {
      assert.strictEqual(getFacilityIconComponent('Two-wheeler bays'), Car);
      assert.strictEqual(getFacilityIconComponent('Car bays'), Car);
    });

    it('should map "Emergency Care" to HeartPulse medical icon without colliding with "car"', () => {
      assert.strictEqual(getFacilityIconComponent('Emergency Care'), HeartPulse);
    });

    it('should safely handle non-string or whitespace facility names', () => {
      assert.strictEqual(getFacilityIconComponent(null as any), CheckCircle2);
      assert.strictEqual(getFacilityIconComponent(undefined as any), CheckCircle2);
      assert.strictEqual(getFacilityIconComponent(123 as any), CheckCircle2);
      assert.strictEqual(getFacilityIconComponent('   '), CheckCircle2);
    });

    it('should fallback to CheckCircle2 for unknown facilities', () => {
      const comp = getFacilityIconComponent('Helipad');
      assert.strictEqual(comp, CheckCircle2);
    });
  });
});
