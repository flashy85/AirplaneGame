let Airplane = document.getElementById('airplane');
let GameArea = document.getElementById('GameArea');
let positionY = GameArea.clientHeight / 2 - Airplane.clientHeight / 2;

const stepSize = 0.02; // Stepsize 20ms
const X0 = 0; // Initial x Position
const V0 = 0; // Initial Velocity
let u = 0; // Initial input

function updatePosition() {
    airplane.style.top = `${positionY}px`;
}

document.addEventListener('keydown', (event) => {
    if (event.key == 'ArrowUp') {
        positionY -= 10;
    } else if (event.key == 'ArrowDown') {
        positionY += 10;
    }
    updatePosition();
})

updatePosition();

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

function updateModel(x_k, v_k, u_k, stepsize) {
    x_k1 = x_k + v_k * stepsize;
    v_k1 = u_k;
    return { x: x_k1, v: v_k1 };
}