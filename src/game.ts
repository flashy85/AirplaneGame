import { calculatePidOutput, integrateFlight, type PidGains } from './simulation';
import { drawGameScene, getPixelYPosition, type AirplaneRenderState, type PathPoint } from './rendering';
import type { GameMode } from './controls';

const PHYSICAL_HEIGHT_MAX = 1000;
const GROUND_HEIGHT = 150;
const MAX_TIME_FRAME = 60;
const INPUT_MAX = 1;
const SPEED_FACTOR = 5;

interface Airplane extends AirplaneRenderState {
    physicalHeight: number;
    verticalSpeed: number;
    speed: number;
    imgWidth: number;
    imgHeight: number;
}

interface GameControls {
    readManualInput(): number;
    readDesiredHeight(currentHeight: number, minHeight: number, maxHeight: number): number;
    readPidGains(): PidGains;
    setManualInput(value: number): void;
}

interface ControllerState {
    positionError: number;
    verticalSpeedError: number;
}

export interface GameController {
    start(): void;
    setManualInput(value: number): void;
    setDesiredHeight(value: number): void;
    setMode(mode: GameMode): void;
    getDesiredHeight(): number;
}

export function createGameController(
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    controls: GameControls,
    updateControllerStatus: (positionError: number, verticalSpeedError: number) => void
): GameController {
    let input = 0;
    let currentMode: GameMode = 'manual';
    let desiredHeightSet = GROUND_HEIGHT;
    let desiredHeight = desiredHeightSet;
    let previousDesiredHeight = desiredHeight;
    let controllerIntegral = 0;
    let backgroundX = 0;
    let lastFrameTime = performance.now();

    const airplane: Airplane = {
        x: 0,
        y: 0,
        physicalHeight: GROUND_HEIGHT,
        verticalSpeed: 0,
        speed: 5,
        img: new Image(),
        imgWidth: 0,
        imgHeight: 0,
        scaledWidth: 100,
        scaleHeight: 0,
        path: []
    };

    const referencePath: { color: string; path: PathPoint[] } = {
        color: 'red',
        path: []
    };

    const controllerState: ControllerState = {
        positionError: Number.NaN,
        verticalSpeedError: Number.NaN
    };

    function resizeCanvas(): void {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        airplane.x = canvas.width / 2;
        if (airplane.imgWidth > 0 && airplane.imgHeight > 0) {
            const aspectRatio = airplane.imgWidth / airplane.imgHeight;
            airplane.scaleHeight = airplane.scaledWidth / aspectRatio;
        }
    }

    function update(deltaTime: number): void {
        backgroundX -= airplane.speed * deltaTime * 1000;
        if (backgroundX <= -canvas.width) {
            backgroundX = 0;
        }

        if (airplane.path.length > 1) {
            for (const point of airplane.path) {
                point.time -= deltaTime;
            }
            if (airplane.path[0].time < -MAX_TIME_FRAME) {
                airplane.path.shift();
            }
        }
        airplane.path.push({ time: 0, y: airplane.physicalHeight });

        if (referencePath.path.length > 1) {
            for (const point of referencePath.path) {
                point.time -= deltaTime;
            }
            if (referencePath.path[0].time < -MAX_TIME_FRAME) {
                referencePath.path.shift();
            }
        }
        referencePath.path.push({ time: MAX_TIME_FRAME, y: desiredHeightSet });
    }

    function updateDesiredPosition(): void {
        let closestHeight: number | null = null;
        for (const point of referencePath.path) {
            if (point.time < 0) {
                closestHeight = point.y;
            }
        }
        if (closestHeight !== null) {
            desiredHeight = closestHeight;
        }
    }

    function calculateControllerOutput(
        heightError: number,
        verticalSpeedError: number,
        deltaTime: number
    ): number {
        const result = calculatePidOutput(
            heightError,
            verticalSpeedError,
            deltaTime,
            controls.readPidGains(),
            controllerIntegral,
            { minimum: -INPUT_MAX, maximum: INPUT_MAX }
        );
        controllerIntegral = result.integralError;
        return result.output;
    }

    function gameLoop(): void {
        const now = performance.now();
        const deltaTime = (now - lastFrameTime) / 1000 * SPEED_FACTOR;
        lastFrameTime = now;

        const desiredVerticalSpeed = (previousDesiredHeight - desiredHeight) / deltaTime;
        previousDesiredHeight = desiredHeight;

        const heightError = desiredHeight - airplane.physicalHeight;
        const verticalSpeedError = desiredVerticalSpeed - airplane.verticalSpeed;
        controllerState.positionError = heightError;
        controllerState.verticalSpeedError = verticalSpeedError;

        if (currentMode === 'auto') {
            const output = calculateControllerOutput(heightError, verticalSpeedError, deltaTime);
            controls.setManualInput(output);
            input = controls.readManualInput() * INPUT_MAX;
        }

        const nextFlightState = integrateFlight(
            { height: airplane.physicalHeight, verticalSpeed: airplane.verticalSpeed },
            input,
            deltaTime
        );
        airplane.physicalHeight = Math.max(
            Math.min(nextFlightState.height, PHYSICAL_HEIGHT_MAX - 100),
            GROUND_HEIGHT
        );
        airplane.verticalSpeed = nextFlightState.verticalSpeed;
        airplane.y = getPixelYPosition(
            airplane.physicalHeight,
            PHYSICAL_HEIGHT_MAX,
            GROUND_HEIGHT,
            canvas.height,
            0
        );

        drawGameScene(context, canvas, airplane, referencePath.path, referencePath.color, {
            maxTimeFrame: MAX_TIME_FRAME,
            physicalHeightMax: PHYSICAL_HEIGHT_MAX,
            groundHeight: GROUND_HEIGHT
        });
        updateDesiredPosition();
        update(deltaTime);
        updateControllerStatus(controllerState.positionError, controllerState.verticalSpeedError);

        requestAnimationFrame(gameLoop);
    }

    return {
        start() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            airplane.x = canvas.width / 2;
            airplane.y = canvas.height / 2;
            window.addEventListener('resize', resizeCanvas);
            airplane.img.onload = () => {
                airplane.imgWidth = airplane.img.width;
                airplane.imgHeight = airplane.img.height;
                airplane.scaleHeight = airplane.scaledWidth / (airplane.imgWidth / airplane.imgHeight);
                input = controls.readManualInput() * INPUT_MAX;
                desiredHeightSet = controls.readDesiredHeight(
                    desiredHeightSet,
                    GROUND_HEIGHT,
                    PHYSICAL_HEIGHT_MAX
                );
                gameLoop();
            };
            airplane.img.src = new URL('../airplane.png', import.meta.url).href;
        },
        setManualInput(value) {
            input = value * INPUT_MAX;
        },
        setDesiredHeight(value) {
            desiredHeightSet = value;
        },
        setMode(mode) {
            currentMode = mode;
        },
        getDesiredHeight() {
            return desiredHeightSet;
        }
    };
}
