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

export interface PidOutputLimits {
    minimum: number;
    maximum: number;
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
    integralError: number,
    outputLimits: PidOutputLimits
): PidResult {
    const candidateIntegralError = integralError + heightError * deltaTime;
    const outputWithoutIntegral =
        heightError * gains.proportional
        + verticalSpeedError * gains.derivative;
    const candidateOutput = outputWithoutIntegral + candidateIntegralError * gains.integral;
    const integralContribution = (candidateIntegralError - integralError) * gains.integral;
    const pushesPastLimit =
        (candidateOutput > outputLimits.maximum && integralContribution > 0)
        || (candidateOutput < outputLimits.minimum && integralContribution < 0);
    const nextIntegralError = pushesPastLimit ? integralError : candidateIntegralError;
    const output = Math.max(
        outputLimits.minimum,
        Math.min(
            outputWithoutIntegral + nextIntegralError * gains.integral,
            outputLimits.maximum
        )
    );

    return { output, integralError: nextIntegralError };
}
