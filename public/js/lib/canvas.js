/**
 * Draw a rectangle on a given HTMLCanvas context
 * @param {CanvasRenderingContext2D} ctx - canvas 2d context
 * @param {Number} x - x coordinate
 * @param {Number} y - y coordinate
 * @param {Number} width - width of the rectangle
 * @param {Number} height - height of the rectangle
 * @param {string | CanvasGradient | CanvasPattern} fill - fillStyle for the rectangle
 */
export function drawRect(ctx, x, y, width, height, fill) {
    ctx.save();
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
}

/**
 * Get the path for a rounded rectangle
 * @param {Number} x - x coordinate
 * @param {Number} y - y coordinate
 * @param {Number} width - width of the rounded rectangle
 * @param {Number} height - height of the rounded rectangle
 * @param {Number} radius - radius of the rounded corners
 * @return {Path2D}
 */
export function getRoundRectPath(x, y, width, height, radius) {
    const region = new Path2D();
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;
    region.moveTo(x + radius, y);
    region.arcTo(x + width, y, x + width, y + height, radius);
    region.arcTo(x + width, y + height, x, y + height, radius);
    region.arcTo(x, y + height, x, y, radius);
    region.arcTo(x, y, x + width, y, radius);
    region.closePath();
    return region;
}

/**
 * Clip a transparent rounded rectangle from a context
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x - x coordinate
 * @param {Number} y - y coordinate
 * @param {Number} width - width of the rounded rectangle
 * @param {Number} height - height of the rounded rectangle
 * @param {Number} radius - radius of the rounded corners
 */
export function clipRoundRect(ctx, x, y, width, height, radius) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#FFF';
    const region = getRoundRectPath(x, y, width, height, radius);
    ctx.fill(region);
    ctx.clip(region);
    ctx.restore();
}

/**
 * Dibuja un único cuadro de participante según el diseño perimetral.
 * @param {CanvasRenderingContext2D} ctx - contexto del canvas
 * @param {Number} idx - índice del participante (0-23), que corresponde a los números de la imagen.
 * @param {string} participantId - ID del participante
 * @return {Promise<Object>} - datos para dibujar en Zoom
 */
export async function drawQuadrant({ idx, ctx, participantId }) {
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;
    const fill = ctx.fillStyle;

    // --- Lógica del Diseño Perimetral (Grid de 7x7) ---
    const slotWidth = canvasWidth / 7;
    const slotHeight = canvasHeight / 7;
    
    let row, col;

    // Asignar fila y columna según el índice del participante (idx 0 es la posición 1)
    if (idx >= 0 && idx <= 6) { 
        // Fila Superior (posiciones 1-7)
        row = 0;
        col = idx;
    } else if (idx >= 7 && idx <= 11) { 
        // Columna Derecha (posiciones 8-12)
        row = (idx - 7) + 1;
        col = 6;
    } else if (idx >= 12 && idx <= 18) { 
        // Fila Inferior (posiciones 13-19)
        row = 6;
        col = 6 - (idx - 12);
    } else if (idx >= 19 && idx <= 23) { 
        // Columna Izquierda (posiciones 20-24)
        row = 6 - (idx - 18);
        col = 0;
    }

    const x = col * slotWidth;
    const y = row * slotHeight;
    const w = slotWidth;
    const h = slotHeight;

    // --- Cálculos para el tamaño del video (manteniendo proporción y márgenes) ---
    let videoW = w * 0.9;
    let videoH = (videoW * 9) / 16;
    if (videoH > h * 0.9) {
        videoH = h * 0.9;
        videoW = (videoH * 16) / 9;
    }

    const radius = Math.min(videoW, videoH) * 0.2;
    const xPad = (w - videoW) / 2;
    const yPad = (h - videoH) / 2;
    const videoX = x + xPad;
    const videoY = y + yPad;

    // Dibuja el fondo y recorta el espacio para el video
    drawRect(ctx, x, y, w, h, fill);
    clipRoundRect(ctx, videoX, videoY, videoW, videoH, radius);

    const imageData = ctx.getImageData(x, y, w, h);

    return {
        participant: {
            participantId: participantId,
            x: `${Math.floor(videoX / devicePixelRatio)}px`,
            y: `${Math.floor(videoY / devicePixelRatio)}px`,
            width: videoW,
            height: videoH,
            zIndex: idx,
        },
        img: {
            imageData,
            x: `${Math.floor(x / devicePixelRatio)}px`,
            y: `${Math.floor(y / devicePixelRatio)}px`,
            zIndex: idx + 1,
        },
    };
}

/**
 * Dibuja todos los cuadrantes.
 * @param {CanvasRenderingContext2D} ctx - contexto del canvas
 * @param {Array.<String>} participants - IDs de los participantes
 * @return {Promise<*[Object]>} - datos para dibujar en Zoom
 */
export async function draw({ ctx, participants }) {
    const data = [];

    // Bucle para 24 participantes
    for (let idx = 0; idx < 24; idx++) {
        const participantId = participants[idx];
        
        if (participantId) {
            const d = await drawQuadrant({
                ctx,
                idx,
                participantId,
            });
            if (d) data.push(d);
        }
    }

    return data;
}