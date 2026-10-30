import { calculatePidOutput, integrateFlight } from './simulation';
import { drawGameScene, getPixelYPosition, type AirplaneRenderState, type PathPoint } from './rendering';
import { createGameControls, type GameMode } from './controls';

/* Physical size */
const PhysHeightMax = 1000; // Maximal physical height [m]
const GndHeight = 150; // Ground height [m]
const MaxTimeFrame = 60; // Number of seconds to future and past [s] / therefore twice this parameter in total

const uMax = 1; // Min/Max [m/s^2]

const Speedfactor = 5;

interface Airplane extends AirplaneRenderState {
    PhysHeight: number;
    PhysVvert: number;
    speed: number;
    imgWidth: number;
    imgHeight: number;
}

function requireElement<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Required element #${id} was not found`);
    }
    return element as T;
}

function requireCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('A 2D canvas context is not available');
    }
    return context;
}

let u = 0; // Initial input [m/s^2]
const controls = createGameControls();

const canvas = requireElement<HTMLCanvasElement>('GameArea');
const ctx = requireCanvasContext(canvas);

// Controller states
const CtrlErrorField = requireElement<HTMLDivElement>('ctrl_error');
const CtrlVelErrorField = requireElement<HTMLDivElement>('ctrl_vertical_speed_error');

let currentMode: GameMode = 'manual'; // Default mode

let DsrdPhysHeightSet = GndHeight;

let DsrdPhysHeight = DsrdPhysHeightSet;
let DsrdPhysHeight_Lval = DsrdPhysHeight;

let CtrlIntegral = 0;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let airplane: Airplane = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    PhysHeight: GndHeight,
    PhysVvert: 0,
    speed: 5,
    img: new Image(),
    imgWidth: 0,
    imgHeight: 0,
    scaledWidth: 100, // Desired width for image
    scaleHeight: 0, // height for image (will be calculated)
    path: []
};
airplane.img.src = new URL('../airplane.png', import.meta.url).href;

const refpath: { color: string; path: PathPoint[] } = {
    color: 'red',
    path: []
}

let CtrlStates = {
    PosError: NaN,
    VelError: NaN
}

let backgroundX = 0; // Movement of background

let lastFrameTime = performance.now();

controls.bind({
    onManualInputChange(value) {
        u = value * uMax;
    },
    onDesiredHeightChange(value) {
        DsrdPhysHeightSet = value;
    },
    onModeChange(mode) {
        currentMode = mode;
    },
    getDesiredHeight() {
        return DsrdPhysHeightSet;
    }
});

airplane.img.onload = () => {
    airplane.imgWidth = airplane.img.width;
    airplane.imgHeight = airplane.img.height;
    const aspectRatio = airplane.imgWidth / airplane.imgHeight;
    airplane.scaleHeight = airplane.scaledWidth / aspectRatio;
    u = controls.readManualInput() * uMax;
    DsrdPhysHeightSet = controls.readDesiredHeight(
        DsrdPhysHeightSet,
        GndHeight,
        PhysHeightMax
    );
    gameLoop();
};

window.addEventListener('resize', () => {
    canvas.width = window.innerHeight;
    canvas.height = window.innerHeight;
    let aspectRatio = airplane.imgWidth / airplane.imgHeight;
    airplane.scaleHeight = airplane.scaledWidth / aspectRatio;
});

/* Update all positions for next step */
function update(deltaTime: number) {
    backgroundX -= airplane.speed * (deltaTime * 1000);
    if (backgroundX <= -canvas.width) {
        backgroundX = 0;
    }
    // Update airplane path relativ to background movement
    if (airplane.path.length > 1) {
        for (let i = 0; i < airplane.path.length; i++) {
            airplane.path[i].time -= deltaTime;
        }
        if (airplane.path[0].time < -MaxTimeFrame) {
            airplane.path.shift();
        }
    }
    airplane.path.push({ time: 0, y: airplane.PhysHeight })

    // Update reference path relative to movement
    if (refpath.path.length > 1) {
        for (let i = 0; i < refpath.path.length; i++) {
            refpath.path[i].time -= deltaTime;
        }
        if (refpath.path[0].time < -MaxTimeFrame) {
            refpath.path.shift();
        }
    }
    // Add new value for reference path
    refpath.path.push({ time: MaxTimeFrame, y: DsrdPhysHeightSet });
}

/* Main loop for the game */
function gameLoop() {
    const now = performance.now();
    const deltaTime = (now - lastFrameTime) / 1000 * Speedfactor; // Convert to seconds
    lastFrameTime = now;

    let DsrdPhysVvert = (DsrdPhysHeight_Lval - DsrdPhysHeight) / deltaTime;
    DsrdPhysHeight_Lval = DsrdPhysHeight;

    const PhysHeightError = DsrdPhysHeight - airplane.PhysHeight;
    const PhysVvertError = DsrdPhysVvert - airplane.PhysVvert;

    CtrlStates.PosError = PhysHeightError;
    CtrlStates.VelError = PhysVvertError;

    if ('auto' == currentMode) {
        const uk = CalcCtrl(PhysHeightError, PhysVvertError, deltaTime);
        controls.setManualInput(uk);
        u = controls.readManualInput() * uMax;
    }
    const nextFlightState = integrateFlight(
        { height: airplane.PhysHeight, verticalSpeed: airplane.PhysVvert },
        u,
        deltaTime
    );
    airplane.PhysHeight = Math.max(Math.min(nextFlightState.height, PhysHeightMax - 100), GndHeight);
    airplane.PhysVvert = nextFlightState.verticalSpeed;

    airplane.y = getPixelYPosition(airplane.PhysHeight, PhysHeightMax, GndHeight, canvas.height, 0);

    drawGameScene(ctx, canvas, airplane, refpath.path, refpath.color, {
        maxTimeFrame: MaxTimeFrame,
        physicalHeightMax: PhysHeightMax,
        groundHeight: GndHeight
    });
    updateDesiredPos(refpath.path);
    update(deltaTime);
    updateCtrlStates();

    requestAnimationFrame(gameLoop);
}

function CalcCtrl(HeightError: number, VvertError: number, deltaTime: number) {
    const result = calculatePidOutput(
        HeightError,
        VvertError,
        deltaTime,
        controls.readPidGains(),
        CtrlIntegral
    );
    CtrlIntegral = result.integralError;
    return result.output;
}

function updateCtrlStates() {
    if (isNaN(CtrlStates.PosError)) {
        CtrlErrorField.innerText = '-';
    } else {
        CtrlErrorField.innerText = CtrlStates.PosError.toFixed(2) + ' m';
    }
    if (isNaN(CtrlStates.VelError)) {
        CtrlVelErrorField.innerText = '-';
    } else {
        CtrlVelErrorField.innerText = CtrlStates.VelError.toFixed(2) + ' m/s';
    }
}

function updateDesiredPos(_refpath: PathPoint[]) {
    let closestY = null;

    for (let i = 0; i < _refpath.length; i++) {
        if (_refpath[i].time < 0) {
            closestY = _refpath[i].y;
        }
    }

    if (closestY != null) {
        DsrdPhysHeight = closestY;
    }
}
