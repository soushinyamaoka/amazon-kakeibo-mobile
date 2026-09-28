import { formatLocalDate } from '../src/utils/date';

describe('formatLocalDate', () => {
  test.each([0, 3, 9])('uses local date in the early morning (%s:00)', (hour) => {
    expect(formatLocalDate(new Date(2026, 0, 1, hour, 0))).toBe('2026-01-01');
  });

  it('zero-pads month and day', () => {
    expect(formatLocalDate(new Date(2026, 0, 5, 12, 0))).toBe('2026-01-05');
  });

  it('returns today when no date is supplied', () => {
    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(formatLocalDate()).toBe(expected);
  });
});
