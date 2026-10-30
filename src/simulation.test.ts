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
                1,
                { minimum: -10, maximum: 10 }
            )
        ).toEqual({ output: 8, integralError: 3 });
    });

    it('prevents integral windup at the output limit', () => {
        expect(
            calculatePidOutput(
                2,
                0,
                1,
                { proportional: 0, integral: 1, derivative: 0 },
                0,
                { minimum: -1, maximum: 1 }
            )
        ).toEqual({ output: 0, integralError: 0 });
    });

    it('allows the integral to unwind when error opposes saturation', () => {
        expect(
            calculatePidOutput(
                -0.5,
                0,
                1,
                { proportional: 0, integral: 1, derivative: 0 },
                2,
                { minimum: -1, maximum: 1 }
            )
        ).toEqual({ output: 1, integralError: 1.5 });
    });
});
