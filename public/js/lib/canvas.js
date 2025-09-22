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
 * Dibuja un único cuadro de participante.
 * @param {CanvasRenderingContext2D} ctx - contexto del canvas
 * @param {Number} idx - índice del participante (0-24).
 * @param {string} participantId - ID del participante
 * @param {object} safeArea - El área segura 16:9 para dibujar
 * @return {Promise<Object>} - datos para dibujar en Zoom
 */
export async function drawQuadrant({ idx, ctx, participantId, safeArea }) {
    const canvasWidth = safeArea.width;
    const canvasHeight = safeArea.height;
    
    const slotWidth = canvasWidth / 7;
    const slotHeight = canvasHeight / 7;
    
    let x, y, w, h;

    if (idx === 0) {
        // --- PARTICIPANTE 0: EL PRESENTADOR CENTRAL ---
        x = slotWidth;
        y = slotHeight;
        w = slotWidth * 5;
        h = slotHeight * 5;
    } else {
        // --- PARTICIPANTES 1-24: EL MARCO PERIMETRAL ---
        const borderIndex = idx - 1;
        let row, col;

        if (borderIndex >= 0 && borderIndex <= 6) { // Fila Superior
            row = 0;
            col = borderIndex;
        } else if (borderIndex >= 7 && borderIndex <= 11) { // Columna Derecha
            row = (borderIndex - 7) + 1;
            col = 6;
        } else if (borderIndex >= 12 && borderIndex <= 18) { // Fila Inferior
            row = 6;
            col = 6 - (borderIndex - 12);
        } else if (borderIndex >= 19 && borderIndex <= 23) { // Columna Izquierda
            row = 6 - (borderIndex - 18);
            col = 0;
        }
        
        x = col * slotWidth;
        y = row * slotHeight;
        w = slotWidth;
        h = slotHeight;
    }
    
    const finalX = x + safeArea.x;
    const finalY = y + safeArea.y;

    let videoW = w * 0.9;
    let videoH = h * 0.9; 
    
    if ((videoW / videoH) > (16/9)) {
        videoW = videoH * (16/9);
    } else {
        videoH = videoW * (9/16);
    }

    const xPad = (w - videoW) / 2;
    const yPad = (h - videoH) / 2;
    const videoX = finalX + xPad;
    const videoY = finalY + yPad;

    drawRect(ctx, finalX, finalY, w, h, ctx.fillStyle);
    
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#FFF';
    ctx.fillRect(videoX, videoY, videoW, videoH);
    ctx.restore();

    const imageData = ctx.getImageData(finalX, finalY, w, h);

    return {
        participant: {
            participantId: participantId,
            x: `${Math.floor(videoX / devicePixelRatio)}px`,
            y: `${Math.floor(videoY / devicePixelRatio)}px`,
            width: videoW,
            height: videoH,
            zIndex: idx,
            isOriginalAspectRatio: true,
            // ##### CAMBIO FINAL AQUÍ #####
            // Esta línea desactiva el recorte de fondo de Zoom.
            hasMask: false
            // ###########################
        },
        img: {
            imageData,
            x: `${Math.floor(finalX / devicePixelRatio)}px`,
            y: `${Math.floor(finalY / devicePixelRatio)}px`,
            zIndex: idx + 1,
        },
    };
}

/**
 * Dibuja todos los cuadrantes.
 * @param {CanvasRenderingContext2D} ctx - contexto del canvas
 * @param {Array.<String>} participants - IDs de los participantes
 * @param {object} safeArea - El área segura 16:9 para dibujar
 * @return {Promise<*[Object]>} - datos para dibujar en Zoom
 */
export async function draw({ ctx, participants, safeArea }) {
    const data = [];

    // Bucle para 25 participantes
    for (let idx = 0; idx < 25; idx++) {
        const participantId = participants[idx];
        
        const d = await drawQuadrant({
            ctx,
            idx,
            participantId,
            safeArea
        });
        if (d) data.push(d);
    }

    return data;
}