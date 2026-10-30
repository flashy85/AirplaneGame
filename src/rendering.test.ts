import { describe, expect, it } from 'vitest';
import { calculateRotationAngle, type RenderSettings } from './rendering';

const settings: RenderSettings = {
    maxTimeFrame: 60,
    physicalHeightMax: 1000,
    groundHeight: 150
};

describe('calculateRotationAngle', () => {
    it('tilts upward while the airplane gains altitude', () => {
        const angle = calculateRotationAngle(
            [{ time: -1, y: 150 }, { time: 0, y: 250 }],
            1200,
            600,
            settings
        );

        expect(angle).toBeLessThan(0);
    });

    it('tilts downward while the airplane loses altitude', () => {
        const angle = calculateRotationAngle(
            [{ time: -1, y: 250 }, { time: 0, y: 150 }],
            1200,
            600,
            settings
        );

        expect(angle).toBeGreaterThan(0);
    });
});
