/* Physical size */
const PhysHeightMax = 1000; // Maximal physical height [m]
const GndHeight = 150; // Ground height [m]
const PhysWidth = 1000; // Maximal physical width [m]
const MaxTimeFrame = 60; // Number of seconds to future and past [s] / therefore twice this parameter in total

const uMax = 1; // Min/Max [m/s^2]

const Speedfactor = 5;

let u = 0; // Initial input [m/s^2]

let t = 0;

// Get the range input element by its ID
const rangeInput = document.getElementById('btn_manctrl');
const sliderValue = document.getElementById('sliderValue');
const manualControll = document.querySelector('.manual_controll');
// Buttons for switch manual - auto
const manualBtn = document.getElementById('manual_btn');
const autoBtn = document.getElementById('auto_btn');
// Reference Path
const SelSzenario = document.getElementById('scenarioSelect');
const InDsrdHeightField = document.getElementById('in_DesiredHeight');

const canvas = document.getElementById('GameArea');
const ctx = canvas.getContext('2d');

// Controller states
const CtrlErrorField = document.getElementById('ctrl_error');

let currentMode = 'manual'; // Default mode

let DsrdPhysHeightSet = GndHeight;

let DsrdPhysHeight = DsrdPhysHeightSet;
let DsrdPhysHeight_Lval = DsrdPhysHeight;

let CtrlIntegral = 0;

canvas.width = window.innerHeight;
canvas.height = window.innerHeight;

let airplane = {
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
airplane.img.src = 'airplane.png';

let refpath = {
    color: 'red',
    path: []
}

let CtrlStates = {
    PosError: NaN,
    VelError: NaN
}

let backgroundX = 0; // Movement of background

let lastFrameTime = performance.now();

function updateModel(y_k, v_k, u_k, stepsize) {
    let y_k1 = y_k + v_k * stepsize;
    let v_k1 = v_k + u_k * stepsize;
    return { y: y_k1, v: v_k1 };
}

function toggleButtons() {
    var startButton = document.getElementById('btn_start');
    var stopButton = document.getElementById('btn_stop');
    if (startButton.style.display === 'none') {
        startButton.style.display = 'inline-block';
        stopButton.style.display = 'none';
    } else {
        startButton.style.display = 'none';
        stopButton.style.display = 'inline-block';
    }
}

function getPhysicalYPosition(browserY, physHeight, gndHeight) {
    // Berechne die Pixel-zu-Meter-Skalierung 
    const pixelsPerMeter = (gameAreaHeight - airplaneHeight) / (physHeight + gndHeight);
    // Berechne die physikalische Höhe in Metern 
    const physicalY = (browserY / pixelsPerMeter) - gndHeight;
    return physicalY;
}

/*
function CalcSmoothXpos(Xk, PhysWidth, t) {
    const tMax = 10; // Seconds
    const Xend = GameArea.clientWidth / 2 - Airplane.clientWidth / 2;
    const L = Xend - X0; // maximum growth (final position)
    const k = 5; // Growth rate
    const xMid = tMax / 2;

    // Logistic function formula
    const x = X0 + L / (1 + Math.exp(-k * (t - xMid) / tMax));
    return x;
}
*/

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

/*    
    function drawSineWave() {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        for (let x = 0; x < canvas.width; x++) {
            const y = canvas.height / 2 + 50 * Math.sin((x / canvas.width) * 4 * Math.PI);
            ctx.lineTo(x, y);
            }
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.stroke();
            }
            */
// Draw the desired trajectory (uncomment one of the following lines)
//drawSineWave();

function drawPath(path, color) {
    if (path.length > 1) {
        ctx.beginPath();
        for (let i = 0; i < path.length; i++) {
            let point = path[i];
            let xPixel = getPixelXPosition(point.time, MaxTimeFrame, canvas.width);
            let yPixel = getPixelYPosition(point.y, PhysHeightMax, GndHeight, canvas.height, 0);
            if (0 == i) {
                ctx.moveTo(xPixel, yPixel);
            } else {
                ctx.lineTo(xPixel, yPixel);
            }
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function drawAirplane() {
    ctx.save();
    ctx.translate(airplane.x, airplane.y);
    ctx.scale(-1, 1); // mirror image
    ctx.drawImage(airplane.img, -airplane.scaledWidth / 2, -airplane.scaleHeight / 2, airplane.scaledWidth, airplane.scaleHeight);
    ctx.restore();

}

/* Update all positions for next step */
function update(deltaTime) {
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

function drawBackground() {
    //ctx.drawImage(bg, backgroundX, 0, canvas.width, canvas.height);
    //ctx.drawImage(bg, backgroundX + canvas.width, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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

    if ('auto' == currentMode) {
        let uk = CalcCtrl(PhysHeightError, PhysVvertError, deltaTime);
        // Ensure the new value is within the range limits
        uk = Math.max(rangeInput.min, Math.min(uk, rangeInput.max));
        rangeInput.value = uk.toFixed(2);
        readRangeValue();
    }
    let ret = updateModel(airplane.PhysHeight, airplane.PhysVvert, u, deltaTime);
    airplane.PhysHeight = Math.max(Math.min(ret.y, PhysHeightMax - 100), GndHeight);
    airplane.PhysVvert = ret.v;

    airplane.y = getPixelYPosition(airplane.PhysHeight, PhysHeightMax, GndHeight, canvas.height, 0);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawPath(refpath.path, refpath.color);
    drawPath(airplane.path, 'blue');
    drawAirplane();
    updateDesiredPos(refpath.path);
    update(deltaTime);
    updateCtrlStates();

    requestAnimationFrame(gameLoop);
}

// Function to read the current value of the range input
function readRangeValue() {
    // Get the current value
    const value = rangeInput.value;
    u = value * uMax;

    sliderValue.textContent = parseFloat(u).toFixed(2);
    /* Position the window along the vertical axes of the slider */
    const percent = (rangeInput.value - rangeInput.min) / (rangeInput.max - rangeInput.min);
    const sliderHeight = rangeInput.offsetHeight;
    const valueHeight = sliderValue.offsetHeight;
    /* The padding of .manual_controll */
    const paddingAdjustment = 20;
    sliderValue.style.bottom = `${percent * sliderHeight - (valueHeight / 2) + paddingAdjustment}px`;
}

// Read desired height
function readDesiredHeight() {
    let value = InDsrdHeightField.value;
    if (isNaN(value) || value.trim() === "") {
        value = DsrdPhysHeightSet;
        InDsrdHeightField.value = DsrdPhysHeightSet;
    }
    let _DsrdPhysHeightSet = Math.max(GndHeight, Math.min(parseFloat(value), PhysHeightMax));
    if (_DsrdPhysHeightSet != value) {
        InDsrdHeightField.value = DsrdPhysHeightSet;
    }
    DsrdPhysHeightSet = _DsrdPhysHeightSet;
}

function changeRangeValue(delta) {
    let newValue = parseFloat(rangeInput.value) + delta;
    // Ensure the new value is within the range limits
    newValue = Math.max(rangeInput.min, Math.min(newValue, rangeInput.max));
    rangeInput.value = newValue.toFixed(2);
}

// Function to set the mode
function setMode(mode) {
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

function getPixelXPosition(_Time, _MaxTimeFrame, _CanvasWidth) {
    const pixelsPerSecond = _CanvasWidth / (2 * _MaxTimeFrame);
    const xPos = (_Time + _MaxTimeFrame) * pixelsPerSecond;
    return xPos;
}

function getPixelYPosition(physicalY, physHeightMax, gndHeight, gameAreaHeight, airplaneHeight) {
    // Calculate the pixels per meter scaling factor 
    /*const pixelsPerMeter = (gameAreaHeight - airplaneHeight) / physHeight;*/
    const pixelsPerMeter = (gameAreaHeight) / physHeightMax;
    // Calculate the browser Y position in pixels 
    const browserY = (physicalY) * pixelsPerMeter - airplaneHeight / 2;
    // Invert the Y position because browser coordinates are top-down 
    const invertedY = gameAreaHeight - browserY - airplaneHeight;
    return invertedY;
}

function calculateRotationAngle(path) {
    if (path.length < 2) return 0; // Not enough points to calculate angle

    let point1 = path[path.length - 2];
    let point2 = path[path.length - 1];

    let deltaX = getPixelXPosition(point2.time, MaxTimeFrame, canvas.width) - getPixelXPosition(point1.time, MaxTimeFrame, canvas.width);
    let deltaY = getPixelYPosition(point2.y, PhysHeightMax, GndHeight, canvas.height, 0) - getPixelYPosition(point1.y, PhysHeightMax, GndHeight, canvas.height, 0);

    let angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI; // Convert radians to degrees

    return angle;
}

function drawAirplane() {
    ctx.save();
    ctx.translate(airplane.x, airplane.y);
    let angle = calculateRotationAngle(airplane.path);
    ctx.rotate(angle * Math.PI / 180); // Convert degrees to radians
    ctx.scale(-1, 1); // mirror image
    ctx.drawImage(airplane.img, -airplane.scaledWidth / 2, -airplane.scaleHeight / 2, airplane.scaledWidth, airplane.scaleHeight);
    ctx.restore();
}
function CalcCtrl(HeightError, VvertError, deltaTime) {
    const inputField_Ctrl_P = document.getElementById('P_ctrl');
    const inputField_Ctrl_I = document.getElementById('I_ctrl');
    const inputField_Ctrl_D = document.getElementById('D_ctrl');
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
    CtrlIntegral += HeightError * deltaTime;
    uk = HeightError * Ctrl_P + VvertError * Ctrl_D + CtrlIntegral * Ctrl_I;
    return uk;
}

function updateCtrlStates() {
    if (isNaN(CtrlStates.PosError)) {
        CtrlErrorField.innerText = '-';
    } else {
        CtrlErrorField.innerText = CtrlStates.PosError.toFixed(2) + ' m';
    }
}

function updateDesiredPos(_refpath) {
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