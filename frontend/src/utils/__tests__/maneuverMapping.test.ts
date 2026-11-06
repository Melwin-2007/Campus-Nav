import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getManeuverConfig } from '../maneuverMapping';

describe('maneuverMapping utility', () => {
  it('should return Emerald color config for depart and head', () => {
    const depart = getManeuverConfig('depart');
    assert.strictEqual(depart.colorHex, '#10B981');
    assert.strictEqual(depart.action, 'depart');

    const head = getManeuverConfig('head');
    assert.strictEqual(head.colorHex, '#10B981');
  });

  it('should return Teal color config for straight, slight turns, and right/left', () => {
    const straight = getManeuverConfig('straight');
    assert.strictEqual(straight.colorHex, '#14B8A6');
    assert.strictEqual(straight.rotationDegrees, 0);

    const slightRight = getManeuverConfig('slight_right');
    assert.strictEqual(slightRight.colorHex, '#14B8A6');
    assert.strictEqual(slightRight.rotationDegrees, 30);

    const right = getManeuverConfig('turn_right');
    assert.strictEqual(right.colorHex, '#14B8A6');
    assert.strictEqual(right.rotationDegrees, 90);

    const slightLeft = getManeuverConfig('slight_left');
    assert.strictEqual(slightLeft.colorHex, '#14B8A6');
    assert.strictEqual(slightLeft.rotationDegrees, -30);

    const left = getManeuverConfig('turn_left');
    assert.strictEqual(left.colorHex, '#14B8A6');
    assert.strictEqual(left.rotationDegrees, -90);
  });

  it('should return Amber color config for sharp turns and u-turns', () => {
    const sharpRight = getManeuverConfig('sharp_right');
    assert.strictEqual(sharpRight.colorHex, '#F59E0B');
    assert.strictEqual(sharpRight.rotationDegrees, 150);

    const sharpLeft = getManeuverConfig('sharp_left');
    assert.strictEqual(sharpLeft.colorHex, '#F59E0B');
    assert.strictEqual(sharpLeft.rotationDegrees, -150);

    const uTurn = getManeuverConfig('u_turn');
    assert.strictEqual(uTurn.colorHex, '#F59E0B');
    assert.strictEqual(uTurn.rotationDegrees, 180);
  });

  it('should return Crimson color config for arrive', () => {
    const arrive = getManeuverConfig('arrive');
    assert.strictEqual(arrive.colorHex, '#EF4444');
    assert.ok(arrive.label.includes('Arrive'));
  });

  it('should fall back gracefully to straight on null, undefined, or unrecognized tokens', () => {
    const fallbackNull = getManeuverConfig(null);
    assert.strictEqual(fallbackNull.action, 'straight');

    const fallbackUndefined = getManeuverConfig(undefined);
    assert.strictEqual(fallbackUndefined.action, 'straight');

    const fallbackUnknown = getManeuverConfig('unknown_token_xyz');
    assert.strictEqual(fallbackUnknown.action, 'straight');
  });
});
