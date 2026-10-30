import { describe, expect, it } from 'vitest';
import { normalizeDesiredHeight } from './controls';

describe('normalizeDesiredHeight', () => {
    it('keeps the previous height when the input is empty or invalid', () => {
        expect(normalizeDesiredHeight('', 250, 150, 1000)).toBe(250);
        expect(normalizeDesiredHeight('not a number', 250, 150, 1000)).toBe(250);
    });

    it('clamps a valid height to the allowed range', () => {
        expect(normalizeDesiredHeight('120', 250, 150, 1000)).toBe(150);
        expect(normalizeDesiredHeight('1200', 250, 150, 1000)).toBe(1000);
    });
});
