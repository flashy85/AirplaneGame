export interface PathPoint {
    time: number;
    y: number;
}

export interface AirplaneRenderState {
    x: number;
    y: number;
    img: HTMLImageElement;
    scaledWidth: number;
    scaleHeight: number;
    path: PathPoint[];
}

export interface RenderSettings {
    maxTimeFrame: number;
    physicalHeightMax: number;
    groundHeight: number;
}

export function getPixelYPosition(
    physicalY: number,
    physHeightMax: number,
    _groundHeight: number,
    gameAreaHeight: number,
    airplaneHeight: number
): number {
    const pixelsPerMeter = gameAreaHeight / physHeightMax;
    const browserY = physicalY * pixelsPerMeter - airplaneHeight / 2;
    return gameAreaHeight - browserY - airplaneHeight;
}

export function drawGameScene(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    airplane: AirplaneRenderState,
    referencePath: PathPoint[],
    referencePathColor: string,
    settings: RenderSettings
): void {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGround(ctx, canvas, airplane, settings);
    drawPath(ctx, canvas, referencePath, referencePathColor, settings);
    drawPath(ctx, canvas, airplane.path, 'blue', settings);
    drawAirplane(ctx, canvas, airplane, settings);
}

function drawPath(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    path: PathPoint[],
    color: string,
    settings: RenderSettings
): void {
    if (path.length <= 1) {
        return;
    }

    ctx.beginPath();
    path.forEach((point, index) => {
        const xPixel = getPixelXPosition(point.time, settings.maxTimeFrame, canvas.width);
        const yPixel = getPixelYPosition(
            point.y,
            settings.physicalHeightMax,
            settings.groundHeight,
            canvas.height,
            0
        );
        if (index === 0) {
            ctx.moveTo(xPixel, yPixel);
        } else {
            ctx.lineTo(xPixel, yPixel);
        }
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawAirplane(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    airplane: AirplaneRenderState,
    settings: RenderSettings
): void {
    ctx.save();
    ctx.translate(airplane.x, airplane.y);
    const angle = calculateRotationAngle(airplane.path, canvas.width, canvas.height, settings);
    ctx.rotate(angle * Math.PI / 180);
    ctx.scale(-1, 1);
    ctx.drawImage(
        airplane.img,
        -airplane.scaledWidth / 2,
        -airplane.scaleHeight / 2,
        airplane.scaledWidth,
        airplane.scaleHeight
    );
    ctx.restore();
}

export function calculateRotationAngle(
    path: PathPoint[],
    canvasWidth: number,
    canvasHeight: number,
    settings: RenderSettings
): number {
    if (path.length < 2) {
        return 0;
    }

    const previousPoint = path[path.length - 2];
    const currentPoint = path[path.length - 1];
    const deltaX =
        getPixelXPosition(currentPoint.time, settings.maxTimeFrame, canvasWidth)
        - getPixelXPosition(previousPoint.time, settings.maxTimeFrame, canvasWidth);
    const deltaY =
        getPixelYPosition(
            currentPoint.y,
            settings.physicalHeightMax,
            settings.groundHeight,
            canvasHeight,
            0
        )
        - getPixelYPosition(
            previousPoint.y,
            settings.physicalHeightMax,
            settings.groundHeight,
            canvasHeight,
            0
        );

    return Math.atan2(deltaY, deltaX) * 180 / Math.PI;
}

function getPixelXPosition(time: number, maxTimeFrame: number, canvasWidth: number): number {
    const pixelsPerSecond = canvasWidth / (2 * maxTimeFrame);
    return (time + maxTimeFrame) * pixelsPerSecond;
}

function drawGround(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    airplane: AirplaneRenderState,
    settings: RenderSettings
): void {
    const groundY = getPixelYPosition(
        settings.groundHeight - airplane.scaleHeight / 2,
        settings.physicalHeightMax,
        settings.groundHeight,
        canvas.height,
        0
    );
    ctx.fillStyle = '#654321';
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
}
