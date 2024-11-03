let Airplane = document.getElementById('airplane');
let GameArea = document.getElementById('GameArea');

let positionX = GameArea.clientWidth / 2 - Airplane.clientWidth / 2;
let positionY = GameArea.clientHeight / 2 - Airplane.clientHeight / 2;

/* Physical size */
const PhysHeight = 2000; // Maximal physical height [m]
const GndHeight = 100; // Ground height [m]
const PhysWidth = 1000; // Maximal physical width [m]

/* Default initial settings */
const stepSize = 0.02; // Stepsize 20ms
const Y0 = 0; // Initial Y Position
const V0 = 0; // Initial Velocity
const X0 = 50; // Initial X Position

let Y = Y0; // Horizontal position [m]
let V = V0; // Horizontal velocity [m/s]
let u = 0.1; // Initial input [m/s^2]

let X = X0;

let t = 0;

function updatePosition() {
    Airplane.style.left = `${positionX}px`;
    Airplane.style.top = `${positionY}px`;
}

updatePosition();

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

document.addEventListener('DOMContentLoaded', (event) => {
    // Get the range input element by its ID
    const rangeInput = document.getElementById('btn_manctrl');

    // Function to read the current value of the range input
    function readRangeValue() {
        // Get the current value
        const value = rangeInput.value;
        u = value;
    }

    function changeRangeValue(delta) {
        let newValue = parseFloat(rangeInput.value) + delta;
        // Ensure the new value is within the range limits
        newValue = Math.max(rangeInput.min, Math.min(newValue, rangeInput.max));
        rangeInput.value = newValue.toFixed(2);
    }

    // Add an event listener to detect changes on the range input
    rangeInput.addEventListener('input', readRangeValue);

    // Add event listener for keydown events
    document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowUp') {
            changeRangeValue(0.1); // Increase by 0.1
        } else if (event.key === 'ArrowDown') {
            changeRangeValue(-0.1); // Decrease by 0.1
        }
        readRangeValue();
    })

    rangeInput.addEventListener('mouseup', () => {
        rangeInput.blur();
    })

    // Optionally, read the initial value on page load
    readRangeValue();

    const canvas = document.getElementById('GameArea');
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerHeight;
    canvas.height = window.innerHeight;

    // Function to draw a straight line
    function drawLine() {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function drawSineWave() {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        for (let x = 0; x < canvas.width; x++) {
            const y = canvas.height / 2 + 50 * Math.sin((x / canvas.width) * 4 * Math.PI);
            ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Draw the desired trajectory (uncomment one of the following lines)
    //drawLine();
    drawSineWave();
})

function MainLoop() {
    let ret = updateModel(Y, V, u, stepSize);
    Y = Math.min(ret.y, PhysHeight);
    V = ret.v;

    X = CalcSmoothXpos(X, PhysWidth, t);

    positionX = getPixelXPosition(X, PhysWidth);
    positionY = getPixelYPosition(Y, PhysHeight, GndHeight);
    updatePosition();

    t += stepSize;
    t = Math.min(t, 100);
}

setInterval(MainLoop, stepSize);

function getPixelYPosition(physicalY, physHeight, gndHeight) {
    let gameAreaHeight = GameArea.clientHeight;
    let airplaneHeight = Airplane.clientHeight;
    // Calculate the pixels per meter scaling factor 
    const pixelsPerMeter = (gameAreaHeight - airplaneHeight) / physHeight;
    // Calculate the browser Y position in pixels 
    const browserY = (physicalY + gndHeight) * pixelsPerMeter;
    // Invert the Y position because browser coordinates are top-down 
    const invertedY = gameAreaHeight - browserY - airplaneHeight;
    return invertedY;
}

function getPixelXPosition(physicalX, physWidth) {
    let gameAreaWidth = GameArea.clientWidth;
    let airplaneWidth = Airplane.clientWidth;
    // Calculate the pixels per meter scaling factor 
    const pixelsPerMeter = (gameAreaWidth - airplaneWidth) / physWidth;
    // Calculate the browser X position in pixels 
    return physicalX * pixelsPerMeter;
}