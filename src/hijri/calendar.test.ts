import { describe, expect, it } from 'bun:test';

import { offsetOptions, toHijri } from './calendar';

const seventeenthOfSeptember = { year: 2026, month: 9, day: 17 };

describe('Hijri conversion', () => {
  it('converts a known civil date', () => {
    expect(toHijri(seventeenthOfSeptember)).toEqual({ year: 1448, month: 4, day: 6 });
  });

  it('moves the Hijri day with a positive offset', () => {
    expect(toHijri(seventeenthOfSeptember, 1).day).toBe(7);
    expect(toHijri(seventeenthOfSeptember, 2).day).toBe(8);
  });

  it('moves the Hijri day with a negative offset', () => {
    expect(toHijri(seventeenthOfSeptember, -1).day).toBe(5);
  });

  it('offers offsets from minus two to plus two', () => {
    expect(offsetOptions()).toEqual([-2, -1, 0, 1, 2]);
  });
});
