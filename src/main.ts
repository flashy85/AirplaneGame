import { calculatePidOutput, integrateFlight } from './simulation';
import { drawGameScene, getPixelYPosition, type AirplaneRenderState, type PathPoint } from './rendering';

/* Physical size */
const PhysHeightMax = 1000; // Maximal physical height [m]
const GndHeight = 150; // Ground height [m]
const MaxTimeFrame = 60; // Number of seconds to future and past [s] / therefore twice this parameter in total

const uMax = 1; // Min/Max [m/s^2]

const Speedfactor = 5;

type GameMode = 'manual' | 'auto';

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

function requireSelector<T extends Element>(selector: string): T {
    const element = document.querySelector(selector);
    if (!element) {
        throw new Error(`Required element ${selector} was not found`);
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

// Get the range input element by its ID
const rangeInput = requireElement<HTMLInputElement>('btn_manctrl');
const sliderValue = requireElement<HTMLSpanElement>('sliderValue');
const manualControll = requireSelector<HTMLElement>('.manual_controll');
// Buttons for switch manual - auto
const manualBtn = requireElement<HTMLButtonElement>('manual_btn');
const autoBtn = requireElement<HTMLButtonElement>('auto_btn');
// Reference Path
const InDsrdHeightField = requireElement<HTMLInputElement>('in_DesiredHeight');

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

document.addEventListener('DOMContentLoaded', (event) => {
    // Add an event listener to detect changes on the range input
    rangeInput.addEventListener('input', readRangeValue);

    InDsrdHeightField.addEventListener('input', readDesiredHeight);

    // Add event listener for keydown events
    document.addEventListener('keydown', (event) => {
        if ('manual' == currentMode) {
            if (event.key === 'ArrowUp') {
                changeRangeValue(0.1); // Increase by 0.1
            } else if (event.key === 'ArrowDown') {
                changeRangeValue(-0.1); // Decrease by 0.1
            }
            readRangeValue();
        }
    })

    rangeInput.addEventListener('mouseup', () => {
        rangeInput.blur();
    })

    manualBtn.addEventListener('click', () => setMode('manual'));
    autoBtn.addEventListener('click', () => setMode('auto'));

    airplane.img.onload = () => {
        airplane.imgWidth = airplane.img.width;
        airplane.imgHeight = airplane.img.height;
        let aspectRatio = airplane.imgWidth / airplane.imgHeight;
        airplane.scaleHeight = airplane.scaledWidth / aspectRatio;
        readRangeValue(); // Optionally, read the initial value on page load
        readDesiredHeight();
        gameLoop();
    }
})

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
        let uk = CalcCtrl(PhysHeightError, PhysVvertError, deltaTime);
        // Ensure the new value is within the range limits
        uk = Math.max(Number(rangeInput.min), Math.min(uk, Number(rangeInput.max)));
        rangeInput.value = uk.toFixed(2);
        readRangeValue();
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

// Function to read the current value of the range input
function readRangeValue() {
    // Get the current value
    const value = rangeInput.value;
    u = Number(value) * uMax;

    sliderValue.textContent = u.toFixed(2);
    /* Position the window along the vertical axes of the slider */
    const min = Number(rangeInput.min);
    const max = Number(rangeInput.max);
    const percent = (Number(rangeInput.value) - min) / (max - min);
    const sliderHeight = rangeInput.offsetHeight;
    const valueHeight = sliderValue.offsetHeight;
    /* The padding of .manual_controll */
    const paddingAdjustment = 20;
    sliderValue.style.bottom = `${percent * sliderHeight - (valueHeight / 2) + paddingAdjustment}px`;
}

// Read desired height
function readDesiredHeight() {
    let value = InDsrdHeightField.value;
    if (value.trim() === "" || Number.isNaN(Number(value))) {
        value = String(DsrdPhysHeightSet);
        InDsrdHeightField.value = value;
    }
    const requestedHeight = Number(value);
    const desiredHeight = Math.max(GndHeight, Math.min(requestedHeight, PhysHeightMax));
    if (desiredHeight !== requestedHeight) {
        InDsrdHeightField.value = String(desiredHeight);
    }
    DsrdPhysHeightSet = desiredHeight;
}

function changeRangeValue(delta: number) {
    let newValue = parseFloat(rangeInput.value) + delta;
    // Ensure the new value is within the range limits
    newValue = Math.max(Number(rangeInput.min), Math.min(newValue, Number(rangeInput.max)));
    rangeInput.value = newValue.toFixed(2);
}

// Function to set the mode
function setMode(mode: GameMode) {
    currentMode = mode;
    if ('manual' == currentMode) {
        manualBtn.classList.add('active');
        autoBtn.classList.remove('active');
        manualControll.classList.remove('disabled');
        rangeInput.disabled = false;
    } else {
        manualBtn.classList.remove('active');
        autoBtn.classList.add('active');
        manualControll.classList.add('disabled');
        rangeInput.disabled = true;
    }
}

function CalcCtrl(HeightError: number, VvertError: number, deltaTime: number) {
    const inputField_Ctrl_P = requireElement<HTMLInputElement>('P_ctrl');
    const inputField_Ctrl_I = requireElement<HTMLInputElement>('I_ctrl');
    const inputField_Ctrl_D = requireElement<HTMLInputElement>('D_ctrl');
    let Ctrl_P = parseFloat(inputField_Ctrl_P.value);
    let Ctrl_I = parseFloat(inputField_Ctrl_I.value);
    let Ctrl_D = parseFloat(inputField_Ctrl_D.value);
    if (isNaN(Ctrl_P)) {
        Ctrl_P = 0;
    }
    if (isNaN(Ctrl_I)) {
        Ctrl_I = 0;
    }
    if (isNaN(Ctrl_D)) {
        Ctrl_D = 0;
    }
    const result = calculatePidOutput(
        HeightError,
        VvertError,
        deltaTime,
        { proportional: Ctrl_P, integral: Ctrl_I, derivative: Ctrl_D },
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
