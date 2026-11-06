import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateOperatingHours } from '../hoursUtils';

function mockCurrentTime(hours: number, minutes: number): () => void {
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

describe('hoursUtils — evaluateOperatingHours Empirical Stress Tests', () => {
  describe('24/7 and Always Open inputs', () => {
    const twentyFourSevenCases = [
      '24/7',
      '24 hours',
      '24 Hours',
      'Open 24 hours',
      'open 24/7',
      'ALWAYS OPEN',
      'always open',
      'Open 24 Hours Daily',
    ];

    for (const input of twentyFourSevenCases) {
      it(`should identify "${input}" as Open 24/7 with emerald badge`, () => {
        const res = evaluateOperatingHours(input);
        assert.strictEqual(res.isOpen, true);
        assert.strictEqual(res.statusLabel, 'Open 24/7');
        assert.strictEqual(res.badgeVariant, 'emerald');
        assert.strictEqual(res.detailText, 'Open all day and night');
      });
    }
  });

  describe('Standard daytime operating hours ("08:00 - 18:00")', () => {
    const range = '08:00 - 18:00';

    it('should be Closed at 07:59 (1 minute before opening)', () => {
      const restore = mockCurrentTime(7, 59);
      try {
        const res = evaluateOperatingHours(range);
        assert.strictEqual(res.isOpen, false);
        assert.strictEqual(res.statusLabel, 'Closed');
        assert.strictEqual(res.badgeVariant, 'rose');
        assert.strictEqual(res.detailText, 'Opens at 08:00');
      } finally {
        restore();
      }
    });

    it('should be Open now at 08:00 (exact opening minute)', () => {
      const restore = mockCurrentTime(8, 0);
      try {
        const res = evaluateOperatingHours(range);
        assert.strictEqual(res.isOpen, true);
        assert.strictEqual(res.statusLabel, 'Open now');
        assert.strictEqual(res.badgeVariant, 'emerald');
        assert.strictEqual(res.detailText, 'Closes at 18:00');
      } finally {
        restore();
      }
    });

    it('should be Open now at 12:30 (mid-day)', () => {
      const restore = mockCurrentTime(12, 30);
      try {
        const res = evaluateOperatingHours(range);
        assert.strictEqual(res.isOpen, true);
        assert.strictEqual(res.statusLabel, 'Open now');
        assert.strictEqual(res.badgeVariant, 'emerald');
      } finally {
        restore();
      }
    });

    it('should be Open now at 18:00 (exact closing minute inclusive)', () => {
      const restore = mockCurrentTime(18, 0);
      try {
        const res = evaluateOperatingHours(range);
        assert.strictEqual(res.isOpen, true);
        assert.strictEqual(res.statusLabel, 'Open now');
        assert.strictEqual(res.badgeVariant, 'emerald');
      } finally {
        restore();
      }
    });

    it('should be Closed at 18:01 (1 minute after closing)', () => {
      const restore = mockCurrentTime(18, 1);
      try {
        const res = evaluateOperatingHours(range);
        assert.strictEqual(res.isOpen, false);
        assert.strictEqual(res.statusLabel, 'Closed');
        assert.strictEqual(res.badgeVariant, 'rose');
        assert.strictEqual(res.detailText, 'Opens at 08:00');
      } finally {
        restore();
      }
    });

    it('should correctly handle single-digit hour format ("9:00 - 17:00")', () => {
      const restore = mockCurrentTime(10, 0);
      try {
        const res = evaluateOperatingHours('9:00 - 17:00');
        assert.strictEqual(res.isOpen, true);
        assert.strictEqual(res.detailText, 'Closes at 17:00');
      } finally {
        restore();
      }
    });

    it('should handle ranges without spaces ("08:00-18:00")', () => {
      const restore = mockCurrentTime(10, 0);
      try {
        const res = evaluateOperatingHours('08:00-18:00');
        assert.strictEqual(res.isOpen, true);
        assert.strictEqual(res.detailText, 'Closes at 18:00');
      } finally {
        restore();
      }
    });
  });

  describe('Overnight operating hours ("20:00 - 04:00")', () => {
    const overnightRange = '20:00 - 04:00';

    it('should be Closed at 19:59 (1 minute before overnight opening)', () => {
      const restore = mockCurrentTime(19, 59);
      try {
        const res = evaluateOperatingHours(overnightRange);
        assert.strictEqual(res.isOpen, false);
        assert.strictEqual(res.statusLabel, 'Closed');
        assert.strictEqual(res.detailText, 'Opens at 20:00');
      } finally {
        restore();
      }
    });

    it('should be Open now at 20:00 (exact start minute)', () => {
      const restore = mockCurrentTime(20, 0);
      try {
        const res = evaluateOperatingHours(overnightRange);
        assert.strictEqual(res.isOpen, true);
        assert.strictEqual(res.statusLabel, 'Open now');
        assert.strictEqual(res.detailText, 'Closes at 04:00');
      } finally {
        restore();
      }
    });

    it('should be Open now at 23:59 (before midnight)', () => {
      const restore = mockCurrentTime(23, 59);
      try {
        const res = evaluateOperatingHours(overnightRange);
        assert.strictEqual(res.isOpen, true);
        assert.strictEqual(res.statusLabel, 'Open now');
      } finally {
        restore();
      }
    });

    it('should be Open now at 00:00 (midnight)', () => {
      const restore = mockCurrentTime(0, 0);
      try {
        const res = evaluateOperatingHours(overnightRange);
        assert.strictEqual(res.isOpen, true);
        assert.strictEqual(res.statusLabel, 'Open now');
      } finally {
        restore();
      }
    });

    it('should be Open now at 03:59 (1 minute before overnight closing)', () => {
      const restore = mockCurrentTime(3, 59);
      try {
        const res = evaluateOperatingHours(overnightRange);
        assert.strictEqual(res.isOpen, true);
        assert.strictEqual(res.statusLabel, 'Open now');
      } finally {
        restore();
      }
    });

    it('should be Open now at 04:00 (exact closing minute inclusive)', () => {
      const restore = mockCurrentTime(4, 0);
      try {
        const res = evaluateOperatingHours(overnightRange);
        assert.strictEqual(res.isOpen, true);
        assert.strictEqual(res.statusLabel, 'Open now');
      } finally {
        restore();
      }
    });

    it('should be Closed at 04:01 (1 minute after overnight closing)', () => {
      const restore = mockCurrentTime(4, 1);
      try {
        const res = evaluateOperatingHours(overnightRange);
        assert.strictEqual(res.isOpen, false);
        assert.strictEqual(res.statusLabel, 'Closed');
        assert.strictEqual(res.detailText, 'Opens at 20:00');
      } finally {
        restore();
      }
    });

    it('should be Closed at 12:00 noon for overnight schedule', () => {
      const restore = mockCurrentTime(12, 0);
      try {
        const res = evaluateOperatingHours(overnightRange);
        assert.strictEqual(res.isOpen, false);
        assert.strictEqual(res.statusLabel, 'Closed');
      } finally {
        restore();
      }
    });
  });

  describe('Appointment, Closed, and Custom Descriptions', () => {
    it('should handle "By appointment only" with amber badge', () => {
      const res = evaluateOperatingHours('By appointment only');
      assert.strictEqual(res.isOpen, false);
      assert.strictEqual(res.statusLabel, 'By Appointment');
      assert.strictEqual(res.badgeVariant, 'amber');
      assert.strictEqual(res.detailText, 'By appointment only');
    });

    it('should handle exact "Closed" with rose badge', () => {
      const res = evaluateOperatingHours('Closed');
      assert.strictEqual(res.isOpen, false);
      assert.strictEqual(res.statusLabel, 'Closed');
      assert.strictEqual(res.badgeVariant, 'rose');
      assert.strictEqual(res.detailText, 'Currently closed to public');
    });

    it('should handle lowercase "closed"', () => {
      const res = evaluateOperatingHours('closed');
      assert.strictEqual(res.isOpen, false);
      assert.strictEqual(res.statusLabel, 'Closed');
    });

    it('should handle uppercase "CLOSED"', () => {
      const res = evaluateOperatingHours('CLOSED');
      assert.strictEqual(res.isOpen, false);
      assert.strictEqual(res.statusLabel, 'Closed');
    });

    it('should fallback to "Hours vary" for non-exact closed phrases like "Closed on weekends"', () => {
      // Documenting specific behavior: raw === 'closed' is exact, so "Closed on weekends" routes to "Hours vary"
      const res = evaluateOperatingHours('Closed on weekends');
      assert.strictEqual(res.isOpen, null);
      assert.strictEqual(res.statusLabel, 'Hours vary');
      assert.strictEqual(res.badgeVariant, 'amber');
      assert.strictEqual(res.detailText, 'Closed on weekends');
    });
  });

  describe('Null, Empty, and Malformed / Dirty inputs', () => {
    it('should return "Hours not listed" for null', () => {
      const res = evaluateOperatingHours(null);
      assert.strictEqual(res.isOpen, null);
      assert.strictEqual(res.statusLabel, 'Hours not listed');
      assert.strictEqual(res.badgeVariant, 'slate');
    });

    it('should return "Hours not listed" for undefined', () => {
      const res = evaluateOperatingHours(undefined);
      assert.strictEqual(res.isOpen, null);
      assert.strictEqual(res.statusLabel, 'Hours not listed');
      assert.strictEqual(res.badgeVariant, 'slate');
    });

    it('should return "Hours not listed" for empty string ""', () => {
      const res = evaluateOperatingHours('');
      assert.strictEqual(res.isOpen, null);
      assert.strictEqual(res.statusLabel, 'Hours not listed');
      assert.strictEqual(res.badgeVariant, 'slate');
    });

    it('should return "Hours not listed" for whitespace string "   "', () => {
      const res = evaluateOperatingHours('   ');
      assert.strictEqual(res.isOpen, null);
      assert.strictEqual(res.statusLabel, 'Hours not listed');
      assert.strictEqual(res.badgeVariant, 'slate');
    });

    it('should safely return "Hours not listed" for non-string runtime inputs (numbers, objects, booleans)', () => {
      const numRes = evaluateOperatingHours(123 as any);
      assert.strictEqual(numRes.statusLabel, 'Hours not listed');
      assert.strictEqual(numRes.badgeVariant, 'slate');

      const objRes = evaluateOperatingHours({} as any);
      assert.strictEqual(objRes.statusLabel, 'Hours not listed');

      const boolRes = evaluateOperatingHours(true as any);
      assert.strictEqual(boolRes.statusLabel, 'Hours not listed');

      const arrRes = evaluateOperatingHours([] as any);
      assert.strictEqual(arrRes.statusLabel, 'Hours not listed');
    });

    it('should fallback to "Hours vary" for unparseable strings ("Not applicable")', () => {
      const res = evaluateOperatingHours('Not applicable');
      assert.strictEqual(res.isOpen, null);
      assert.strictEqual(res.statusLabel, 'Hours vary');
      assert.strictEqual(res.badgeVariant, 'amber');
      assert.strictEqual(res.detailText, 'Not applicable');
    });

    it('should fallback to "Hours vary" for "TBD"', () => {
      const res = evaluateOperatingHours('TBD');
      assert.strictEqual(res.isOpen, null);
      assert.strictEqual(res.statusLabel, 'Hours vary');
    });

    it('should fallback to "Hours vary" for 12hr format with AM/PM ("9:00 AM - 5:00 PM")', () => {
      const res = evaluateOperatingHours('9:00 AM - 5:00 PM');
      assert.strictEqual(res.isOpen, null);
      assert.strictEqual(res.statusLabel, 'Hours vary');
    });

    it('should fallback to "Hours vary" for multiple hyphens ("08:00 - 12:00 - 18:00")', () => {
      const res = evaluateOperatingHours('08:00 - 12:00 - 18:00');
      assert.strictEqual(res.isOpen, null);
      assert.strictEqual(res.statusLabel, 'Hours vary');
    });

    it('should fallback to "Hours vary" for incomplete range ("08:00 - ")', () => {
      const res = evaluateOperatingHours('08:00 - ');
      assert.strictEqual(res.isOpen, null);
      assert.strictEqual(res.statusLabel, 'Hours vary');
    });

    it('should fallback to "Hours vary" for typographic en-dash ("08:00 – 18:00")', () => {
      const res = evaluateOperatingHours('08:00 \u2013 18:00');
      assert.strictEqual(res.isOpen, null);
      assert.strictEqual(res.statusLabel, 'Hours vary');
    });

    it('should safely process extremely long strings (10,000 characters) without hanging', () => {
      const longInput = 'Open '.repeat(2000);
      const start = performance.now();
      const res = evaluateOperatingHours(longInput);
      const duration = performance.now() - start;
      assert.ok(duration < 50, `Expected <50ms, took ${duration}ms`);
      assert.strictEqual(res.statusLabel, 'Hours vary');
    });
  });
});
