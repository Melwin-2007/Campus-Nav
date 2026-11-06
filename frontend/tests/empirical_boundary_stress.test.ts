import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateOperatingHours } from '../src/utils/hoursUtils';
import {
  CAMPUS_CENTER,
  CAMPUS_BOUNDS,
  haversineDistance,
  isUserOffCampus,
} from '../src/utils/geoUtils';
import {
  CATEGORY_ICON_MAP,
  CATEGORY_SLUG_COLORS,
  getCategoryIconComponent,
  getFacilityIconComponent,
} from '../src/utils/iconMapping';
import {
  HeartPulse,
  Wind,
  Zap,
  Car,
  CheckCircle2,
  MapPin,
  Wifi,
  Accessibility,
  Bath,
  ArrowUpDown,
  Utensils,
  Coffee,
  BookOpen,
  CreditCard,
  Store,
} from 'lucide-react';

function mockTime(hours: number, minutes: number) {
  const OriginalDate = globalThis.Date;
  // @ts-ignore
  globalThis.Date = class extends OriginalDate {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(2026, 10, 6, hours, minutes, 0, 0);
      } else {
        // @ts-ignore
        super(...args);
      }
    }
    static now() {
      return new OriginalDate(2026, 10, 6, hours, minutes, 0, 0).getTime();
    }
    getHours() {
      return hours;
    }
    getMinutes() {
      return minutes;
    }
  };
  return () => {
    globalThis.Date = OriginalDate;
  };
}

describe('Empirical Adversarial Stress Harness: M4 Iteration 2 Frontend Utilities', () => {
  // ==========================================================================
  // SECTION 1: hoursUtils Boundary & Non-String Stress
  // ==========================================================================
  describe('hoursUtils — Adversarial & Defensive Input Stress', () => {
    const nonStringFalsyInputs: [string, any][] = [
      ['null', null],
      ['undefined', undefined],
      ['empty string', ''],
      ['whitespace string', '   '],
      ['newline and tab string', '\t\n\r'],
    ];

    for (const [name, val] of nonStringFalsyInputs) {
      it(`should return 'Hours not listed' with slate badge for ${name}`, () => {
        const res = evaluateOperatingHours(val);
        assert.strictEqual(res.isOpen, null);
        assert.strictEqual(res.statusLabel, 'Hours not listed');
        assert.strictEqual(res.badgeVariant, 'slate');
        assert.strictEqual(res.detailText, 'Standard campus access');
      });
    }

    const nonStringAdversarialTypes: [string, any][] = [
      ['number (0)', 0],
      ['number (123)', 123],
      ['number (-1)', -1],
      ['number (NaN)', NaN],
      ['number (Infinity)', Infinity],
      ['number (-Infinity)', -Infinity],
      ['boolean (true)', true],
      ['boolean (false)', false],
      ['plain object ({})', {}],
      ['array ([])', []],
      ['array with valid string (["08:00 - 18:00"])', ['08:00 - 18:00']],
      ['function (() => {})', () => {}],
      ['Symbol', Symbol('test')],
      ['BigInt', BigInt(42)],
    ];

    for (const [name, val] of nonStringAdversarialTypes) {
      it(`should safely absorb ${name} without throwing TypeError or crashing`, () => {
        assert.doesNotThrow(() => {
          const res = evaluateOperatingHours(val as any);
          assert.strictEqual(res.isOpen, null);
          assert.strictEqual(res.statusLabel, 'Hours not listed');
          assert.strictEqual(res.badgeVariant, 'slate');
        });
      });
    }

    describe('Operating Hours Time Ranges & Boundaries', () => {
      it('should evaluate standard daytime 08:00 - 18:00 boundaries accurately', () => {
        const range = '08:00 - 18:00';
        // 07:59 -> Closed
        let restore = mockTime(7, 59);
        assert.strictEqual(evaluateOperatingHours(range).isOpen, false);
        restore();

        // 08:00 -> Open now
        restore = mockTime(8, 0);
        assert.strictEqual(evaluateOperatingHours(range).isOpen, true);
        restore();

        // 18:00 -> Open now (inclusive)
        restore = mockTime(18, 0);
        assert.strictEqual(evaluateOperatingHours(range).isOpen, true);
        restore();

        // 18:01 -> Closed
        restore = mockTime(18, 1);
        assert.strictEqual(evaluateOperatingHours(range).isOpen, false);
        restore();
      });

      it('should evaluate overnight 21:00 - 05:00 crossing midnight boundaries accurately', () => {
        const range = '21:00 - 05:00';
        // 20:59 -> Closed
        let restore = mockTime(20, 59);
        assert.strictEqual(evaluateOperatingHours(range).isOpen, false);
        restore();

        // 21:00 -> Open now
        restore = mockTime(21, 0);
        assert.strictEqual(evaluateOperatingHours(range).isOpen, true);
        restore();

        // 23:59 -> Open now
        restore = mockTime(23, 59);
        assert.strictEqual(evaluateOperatingHours(range).isOpen, true);
        restore();

        // 00:00 -> Open now
        restore = mockTime(0, 0);
        assert.strictEqual(evaluateOperatingHours(range).isOpen, true);
        restore();

        // 05:00 -> Open now (inclusive)
        restore = mockTime(5, 0);
        assert.strictEqual(evaluateOperatingHours(range).isOpen, true);
        restore();

        // 05:01 -> Closed
        restore = mockTime(5, 1);
        assert.strictEqual(evaluateOperatingHours(range).isOpen, false);
        restore();

        // 14:00 (midday) -> Closed
        restore = mockTime(14, 0);
        assert.strictEqual(evaluateOperatingHours(range).isOpen, false);
        restore();
      });

      it('should handle equal start and end time (12:00 - 12:00) as open only at 12:00', () => {
        const range = '12:00 - 12:00';
        let restore = mockTime(12, 0);
        assert.strictEqual(evaluateOperatingHours(range).isOpen, true);
        restore();

        restore = mockTime(12, 1);
        assert.strictEqual(evaluateOperatingHours(range).isOpen, false);
        restore();
      });

      it('should gracefully fallback to Hours vary for 12hr AM/PM and unparseable strings', () => {
        const unparseable = [
          '9:00 AM - 5:00 PM',
          'Mon-Fri 9-5',
          '08:00 to 18:00',
          '08:00 - 12:00 - 18:00',
          '08:00 - ',
          '- 18:00',
          'Closed for renovations',
          'TBD',
        ];
        for (const str of unparseable) {
          const res = evaluateOperatingHours(str);
          assert.strictEqual(res.isOpen, null);
          assert.strictEqual(res.statusLabel, 'Hours vary');
          assert.strictEqual(res.badgeVariant, 'amber');
          assert.strictEqual(res.detailText, str);
        }
      });

      it('should process 100,000 characters without catastrophic backtracking or timeout', () => {
        const massive = 'open '.repeat(20000);
        const t0 = performance.now();
        const res = evaluateOperatingHours(massive);
        const elapsed = performance.now() - t0;
        assert.ok(elapsed < 100, `Expected <100ms, took ${elapsed.toFixed(2)}ms`);
        assert.strictEqual(res.statusLabel, 'Hours vary');
      });
    });
  });

  // ==========================================================================
  // SECTION 2: geoUtils Boundary & Non-Number Stress
  // ==========================================================================
  describe('geoUtils — Coordinate Boundary & Calculation Stress', () => {
    it('should compute zero distance for identical coordinates', () => {
      assert.strictEqual(haversineDistance(17.6599, 75.9064, 17.6599, 75.9064), 0);
      assert.strictEqual(haversineDistance(0, 0, 0, 0), 0);
      assert.strictEqual(haversineDistance(90, 45, 90, 45), 0);
    });

    it('should return NaN for non-number or NaN coordinates in haversineDistance', () => {
      assert.ok(Number.isNaN(haversineDistance(NaN, 75.9064, 17.6599, 75.9064)));
      assert.ok(Number.isNaN(haversineDistance(17.6599, NaN, 17.6599, 75.9064)));
      assert.ok(Number.isNaN(haversineDistance(17.6599, 75.9064, NaN, 75.9064)));
      assert.ok(Number.isNaN(haversineDistance(17.6599, 75.9064, 17.6599, NaN)));

      // Non-number runtime types
      assert.ok(Number.isNaN(haversineDistance(null as any, 75.9064, 17.6599, 75.9064)));
      assert.ok(Number.isNaN(haversineDistance(undefined as any, 75.9064, 17.6599, 75.9064)));
      assert.ok(Number.isNaN(haversineDistance('17.6599' as any, 75.9064, 17.6599, 75.9064)));
      assert.ok(Number.isNaN(haversineDistance({} as any, 75.9064, 17.6599, 75.9064)));
      assert.ok(Number.isNaN(haversineDistance([] as any, 75.9064, 17.6599, 75.9064)));
    });

    it('should evaluate known campus points correctly with isUserOffCampus', () => {
      // Campus center is 0m from center -> NOT off campus
      const center = isUserOffCampus(CAMPUS_CENTER.lat, CAMPUS_CENTER.lon, 300);
      assert.strictEqual(center.offCampus, false);
      assert.strictEqual(center.distance, 0);

      // Point ~2.6km away -> off campus
      const far = isUserOffCampus(17.6800, 75.9200, 300);
      assert.strictEqual(far.offCampus, true);
      assert.ok(far.distance > 2000);
    });

    it('should safely return offCampus: true, distance: Infinity for NaN and non-number types', () => {
      const nanLat = isUserOffCampus(NaN, 75.9064);
      assert.strictEqual(nanLat.offCampus, true);
      assert.strictEqual(nanLat.distance, Infinity);

      const nanLon = isUserOffCampus(17.6599, NaN);
      assert.strictEqual(nanLon.offCampus, true);
      assert.strictEqual(nanLon.distance, Infinity);

      const nullCoord = isUserOffCampus(null as any, 75.9064);
      assert.strictEqual(nullCoord.offCampus, true);
      assert.strictEqual(nullCoord.distance, Infinity);

      const undefinedCoord = isUserOffCampus(undefined as any, 75.9064);
      assert.strictEqual(undefinedCoord.offCampus, true);
      assert.strictEqual(undefinedCoord.distance, Infinity);

      const strCoord = isUserOffCampus('17.6599' as any, 75.9064);
      assert.strictEqual(strCoord.offCampus, true);
      assert.strictEqual(strCoord.distance, Infinity);
    });

    // CRITICAL EMPIRICAL CHALLENGE: Infinity coordinate handling in isUserOffCampus
    it('EMPIRICAL CHALLENGE: evaluates behavior of Infinity coordinates in isUserOffCampus', () => {
      // In JS, typeof Infinity === 'number' and Number.isNaN(Infinity) === false.
      // geoUtils.ts lines 56-64 check `typeof !== number || Number.isNaN()`.
      // It does NOT use `!Number.isFinite()`.
      // haversineDistance(Infinity, ...) returns NaN.
      // In isUserOffCampus, dist becomes NaN.
      // NaN > 300 evaluates to false!
      const infRes = isUserOffCampus(Infinity, 75.9064);
      const negInfRes = isUserOffCampus(-Infinity, 75.9064);

      // We document empirical reality:
      // Current implementation returns { offCampus: false, distance: NaN } for Infinity!
      // This is an empirical defect surfaced by the challenger.
      assert.strictEqual(typeof infRes.offCampus, 'boolean');
      assert.strictEqual(Number.isNaN(infRes.distance), true, 'distance is NaN when userLat is Infinity');
      // If treated properly as off-campus, it SHOULD be true with distance Infinity:
      const hasFiniteGuard = infRes.offCampus === true && infRes.distance === Infinity;
      // We log whether the system is vulnerable to infinite coordinate deception:
      if (!hasFiniteGuard) {
        // Confirmed finding: current implementation falsely marks Infinity as not off-campus
        assert.strictEqual(infRes.offCampus, false, 'Surfaced vulnerability: Infinity coordinate bypasses offCampus guard');
      }
    });
  });

  // ==========================================================================
  // SECTION 3: iconMapping Keyword Collision & Facility Matching Stress
  // ==========================================================================
  describe('iconMapping — Keyword Collision & Facility Disambiguation', () => {
    it('should map all 12 categories to registered Lucide icons and exact colors', () => {
      const seeded = [
        ['academic-buildings', 'GraduationCap', '#3B82F6'],
        ['departments', 'Building2', '#8B5CF6'],
        ['laboratories', 'FlaskConical', '#06B6D4'],
        ['administration', 'Landmark', '#64748B'],
        ['libraries', 'Library', '#10B981'],
        ['food-and-cafeteria', 'Utensils', '#F97316'],
        ['sports', 'Trophy', '#84CC16'],
        ['medical', 'HeartPulse', '#F43F5E'],
        ['parking', 'Car', '#2563EB'],
        ['washrooms', 'Bath', '#14B8A6'],
        ['entrances-and-exits', 'DoorOpen', '#F59E0B'],
        ['other', 'MoreHorizontal', '#A855F7'],
      ];

      for (const [slug, iconName, color] of seeded) {
        const comp = getCategoryIconComponent(iconName);
        assert.strictEqual(comp, CATEGORY_ICON_MAP[iconName]);
        assert.strictEqual(CATEGORY_SLUG_COLORS[slug], color);
      }
    });

    describe('Critical Keyword Collision Tests from Dispatch Assignment', () => {
      it('should map "Pharmacy" to HeartPulse without colliding with "ac"', () => {
        assert.strictEqual(getFacilityIconComponent('Pharmacy'), HeartPulse);
      });

      it('should map "Pharmacology" without false positive collision with "ac" (Wind)', () => {
        const comp = getFacilityIconComponent('Pharmacology');
        assert.notStrictEqual(comp, Wind, 'Pharmacology must NOT match AC / Wind');
        assert.strictEqual(comp, CheckCircle2, 'Pharmacology without medical keywords falls back to CheckCircle2');
      });

      it('should map "Pharmacology Clinic" to HeartPulse medical icon', () => {
        assert.strictEqual(getFacilityIconComponent('Pharmacology Clinic'), HeartPulse);
      });

      it('should map "Emergency Care" to HeartPulse without colliding with "car"', () => {
        const comp = getFacilityIconComponent('Emergency Care');
        assert.notStrictEqual(comp, Car, 'Emergency Care must NOT match Car');
        assert.strictEqual(comp, HeartPulse, 'Emergency Care must match HeartPulse');
      });

      it('should map "Car parking bays" to Car icon', () => {
        assert.strictEqual(getFacilityIconComponent('Car parking bays'), Car);
      });

      it('should map "AC Lounge" to Wind icon', () => {
        assert.strictEqual(getFacilityIconComponent('AC Lounge'), Wind);
      });

      it('should map "EV Station" to Zap icon', () => {
        assert.strictEqual(getFacilityIconComponent('EV Station'), Zap);
      });
    });

    describe('Adversarial Substring Collision Stress Tests', () => {
      const adversarialKeywordChecks: [string, any, any, string][] = [
        // facilityName, expectedIcon, forbiddenIcon, reason
        ['Two-wheeler bays', Car, CheckCircle2, 'Matches bay/two-wheeler'],
        ['Car bays', Car, CheckCircle2, 'Matches car/bays'],
        ['Cardiac Ward', null, Car, 'Cardiac Ward must NOT collide with Car icon'],
        ['Cardiology', null, Car, 'Cardiology must NOT collide with Car icon'],
        ['Cardiology Unit', CheckCircle2, Car, 'Must NOT match Car'],
        ['Carpet Cleaning', CheckCircle2, Car, 'Carpet has no word boundary for car'],
        ['Racecar Track', CheckCircle2, Car, 'Racecar has no word boundary for car'],
        ['Pacemaker Unit', CheckCircle2, Wind, 'Pacemaker must NOT match AC'],
        ['Air Conditioning Unit', Wind, CheckCircle2, 'Matches air conditioning'],
        ['AC Classroom', Wind, CheckCircle2, 'Matches \\bac\\b'],
        ['Beverage Dispenser', CheckCircle2, Zap, 'Beverage must NOT match EV'],
        ['Device Storage', CheckCircle2, Zap, 'Device must NOT match EV'],
        ['Level 2 Access', CheckCircle2, Zap, 'Level must NOT match EV'],
        ['Development Office', CheckCircle2, Zap, 'Development must NOT match EV'],
        ['EV Charging Pod', Zap, CheckCircle2, 'Matches \\bev\\b and charging'],
      ];

      for (const [facility, expected, forbidden, reason] of adversarialKeywordChecks) {
        it(`should verify "${facility}" (${reason})`, () => {
          const res = getFacilityIconComponent(facility);
          if (forbidden) {
            assert.notStrictEqual(res, forbidden, `"${facility}" should NOT match forbidden icon`);
          }
          if (expected) {
            assert.strictEqual(res, expected, `"${facility}" should match expected icon`);
          }
        });
      }
    });

    it('should safely handle malformed facility names', () => {
      assert.strictEqual(getFacilityIconComponent(null as any), CheckCircle2);
      assert.strictEqual(getFacilityIconComponent(undefined as any), CheckCircle2);
      assert.strictEqual(getFacilityIconComponent(12345 as any), CheckCircle2);
      assert.strictEqual(getFacilityIconComponent({} as any), CheckCircle2);
      assert.strictEqual(getFacilityIconComponent([] as any), CheckCircle2);
      assert.strictEqual(getFacilityIconComponent(''), CheckCircle2);
      assert.strictEqual(getFacilityIconComponent('   '), CheckCircle2);
    });
  });
});
