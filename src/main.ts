import { createGameController } from './game';
import { createGameControls } from './controls';

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

const canvas = requireElement<HTMLCanvasElement>('GameArea');
const context = requireCanvasContext(canvas);
const positionErrorField = requireElement<HTMLDivElement>('ctrl_error');
const verticalSpeedErrorField = requireElement<HTMLDivElement>('ctrl_vertical_speed_error');
const controls = createGameControls();
const game = createGameController(canvas, context, controls, (positionError, verticalSpeedError) => {
    positionErrorField.innerText = `${positionError.toFixed(2)} m`;
    verticalSpeedErrorField.innerText = `${verticalSpeedError.toFixed(2)} m/s`;
});

controls.bind({
    onManualInputChange: game.setManualInput,
    onDesiredHeightChange: game.setDesiredHeight,
    onModeChange: game.setMode,
    getDesiredHeight: game.getDesiredHeight
});

game.start();
