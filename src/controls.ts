import type { PidGains } from './simulation';

export type GameMode = 'manual' | 'auto';

export interface ControlCallbacks {
    onManualInputChange(value: number): void;
    onDesiredHeightChange(value: number): void;
    onModeChange(mode: GameMode): void;
    getDesiredHeight(): number;
}

export interface GameControls {
    bind(callbacks: ControlCallbacks): void;
    readManualInput(): number;
    readDesiredHeight(currentHeight: number, minHeight: number, maxHeight: number): number;
    readPidGains(): PidGains;
    setManualInput(value: number): void;
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

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(value, max));
}

function readGain(input: HTMLInputElement): number {
    const value = Number.parseFloat(input.value);
    return Number.isNaN(value) ? 0 : value;
}

export function normalizeDesiredHeight(
    value: string,
    currentHeight: number,
    minHeight: number,
    maxHeight: number
): number {
    const parsedValue = Number(value);
    if (value.trim() === '' || Number.isNaN(parsedValue)) {
        return currentHeight;
    }
    return clamp(parsedValue, minHeight, maxHeight);
}

export function createGameControls(): GameControls {
    const rangeInput = requireElement<HTMLInputElement>('btn_manctrl');
    const sliderValue = requireElement<HTMLSpanElement>('sliderValue');
    const manualControl = requireSelector<HTMLElement>('.manual_controll');
    const manualButton = requireElement<HTMLButtonElement>('manual_btn');
    const automaticButton = requireElement<HTMLButtonElement>('auto_btn');
    const desiredHeightInput = requireElement<HTMLInputElement>('in_DesiredHeight');
    const proportionalInput = requireElement<HTMLInputElement>('P_ctrl');
    const integralInput = requireElement<HTMLInputElement>('I_ctrl');
    const derivativeInput = requireElement<HTMLInputElement>('D_ctrl');

    let currentMode: GameMode = 'manual';
    let callbacks: ControlCallbacks | undefined;

    function getCallbacks(): ControlCallbacks {
        if (!callbacks) {
            throw new Error('Game controls must be bound before use');
        }
        return callbacks;
    }

    function setMode(mode: GameMode): void {
        currentMode = mode;
        manualButton.classList.toggle('active', mode === 'manual');
        automaticButton.classList.toggle('active', mode === 'auto');
        manualControl.classList.toggle('disabled', mode === 'auto');
        rangeInput.disabled = mode === 'auto';
        callbacks?.onModeChange(mode);
    }

    function readManualInput(): number {
        const value = Number(rangeInput.value);
        sliderValue.textContent = value.toFixed(2);
        const min = Number(rangeInput.min);
        const max = Number(rangeInput.max);
        const percent = (value - min) / (max - min);
        const paddingAdjustment = 20;
        sliderValue.style.bottom =
            `${percent * rangeInput.offsetHeight - sliderValue.offsetHeight / 2 + paddingAdjustment}px`;
        return value;
    }

    function readDesiredHeight(
        currentHeight: number,
        minHeight: number,
        maxHeight: number
    ): number {
        const height = normalizeDesiredHeight(
            desiredHeightInput.value,
            currentHeight,
            minHeight,
            maxHeight
        );
        desiredHeightInput.value = String(height);
        return height;
    }

    function changeManualInput(delta: number): void {
        const min = Number(rangeInput.min);
        const max = Number(rangeInput.max);
        const value = clamp(Number.parseFloat(rangeInput.value) + delta, min, max);
        rangeInput.value = value.toFixed(2);
    }

    return {
        bind(controlCallbacks) {
            callbacks = controlCallbacks;
            rangeInput.addEventListener('input', () => {
                getCallbacks().onManualInputChange(readManualInput());
            });
            desiredHeightInput.addEventListener('input', () => {
                const activeCallbacks = getCallbacks();
                activeCallbacks.onDesiredHeightChange(readDesiredHeight(
                    activeCallbacks.getDesiredHeight(),
                    Number(desiredHeightInput.min),
                    Number(desiredHeightInput.max)
                ));
            });
            document.addEventListener('keydown', (event) => {
                if (
                    currentMode !== 'manual'
                    || event.target instanceof HTMLElement
                    && event.target.matches('input, select, textarea, button, [contenteditable="true"]')
                ) {
                    return;
                }
                if (event.key === 'ArrowUp') {
                    changeManualInput(0.1);
                } else if (event.key === 'ArrowDown') {
                    changeManualInput(-0.1);
                } else {
                    return;
                }
                event.preventDefault();
                getCallbacks().onManualInputChange(readManualInput());
            });
            rangeInput.addEventListener('mouseup', () => rangeInput.blur());
            manualButton.addEventListener('click', () => setMode('manual'));
            automaticButton.addEventListener('click', () => setMode('auto'));
        },
        readManualInput,
        readDesiredHeight,
        readPidGains() {
            return {
                proportional: readGain(proportionalInput),
                integral: readGain(integralInput),
                derivative: readGain(derivativeInput)
            };
        },
        setManualInput(value) {
            rangeInput.value = clamp(
                value,
                Number(rangeInput.min),
                Number(rangeInput.max)
            ).toFixed(2);
        }
    };
}
