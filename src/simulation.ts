export interface FlightState {
    height: number;
    verticalSpeed: number;
}

export interface PidGains {
    proportional: number;
    integral: number;
    derivative: number;
}

export interface PidResult {
    output: number;
    integralError: number;
}

export function integrateFlight(
    state: FlightState,
    acceleration: number,
    deltaTime: number
): FlightState {
    return {
        height: state.height + state.verticalSpeed * deltaTime,
        verticalSpeed: state.verticalSpeed + acceleration * deltaTime
    };
}

export function calculatePidOutput(
    heightError: number,
    verticalSpeedError: number,
    deltaTime: number,
    gains: PidGains,
    integralError: number
): PidResult {
    const nextIntegralError = integralError + heightError * deltaTime;
    const output =
        heightError * gains.proportional
        + verticalSpeedError * gains.derivative
        + nextIntegralError * gains.integral;

    return { output, integralError: nextIntegralError };
}
