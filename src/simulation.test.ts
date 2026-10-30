import { describe, expect, it } from 'vitest';
import { calculatePidOutput, integrateFlight } from './simulation';

describe('integrateFlight', () => {
    it('advances height and vertical speed using the current state', () => {
        expect(
            integrateFlight({ height: 10, verticalSpeed: 3 }, -4, 2)
        ).toEqual({ height: 16, verticalSpeed: -5 });
    });
});

describe('calculatePidOutput', () => {
    it('updates the integral error and combines all three gain terms', () => {
        expect(
            calculatePidOutput(
                4,
                -2,
                0.5,
                { proportional: 3, integral: 2, derivative: 5 },
                1
            )
        ).toEqual({ output: 8, integralError: 3 });
    });
});
