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

export async function drawQuadrant({ idx, ctx, participantId, screenName, safeArea }) {
    if (participantId && typeof participantId !== 'string') {
        console.warn(`ID de participante inválido en el índice ${idx}:`, participantId);
        return null;
    }

    try {
        const borderWidth = 5 * devicePixelRatio;
        const textHeight = (idx === 0) ? 35 : 25; // Espacio extra para el texto

        const canvasWidth = safeArea.width;
        const canvasHeight = safeArea.height;
        const slotWidth = canvasWidth / 7;
        const slotHeight = canvasHeight / 7;
        
        let x, y, w, h;

        if (idx === 0) {
            x = slotWidth; y = slotHeight;
            w = slotWidth * 5; h = slotHeight * 5;
        } else {
            const borderIndex = idx - 1;
            let row, col;
            if (borderIndex >= 0 && borderIndex <= 6) { row = 0; col = borderIndex; }
            else if (borderIndex >= 7 && borderIndex <= 11) { row = (borderIndex - 7) + 1; col = 6; }
            else if (borderIndex >= 12 && borderIndex <= 18) { row = 6; col = 6 - (borderIndex - 12); }
            else if (borderIndex >= 19 && borderIndex <= 23) { row = 6 - (borderIndex - 18); col = 0; }
            x = col * slotWidth; y = row * slotHeight;
            w = slotWidth; h = slotHeight;
        }
        
        const finalX = Math.round(x + safeArea.x);
        const finalY = Math.round(y + safeArea.y);
        const finalW = Math.round(w);
        const finalH = Math.round(h);

        // --- NUEVA LÓGICA CON CANVAS TEMPORAL ---
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = finalW;
        tempCanvas.height = finalH + textHeight; // Hacemos el canvas más alto para el texto
        const tempCtx = tempCanvas.getContext('2d');

        // 1. Dibujamos el borde negro en el canvas temporal
        tempCtx.fillStyle = '#000000';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // 2. Dibujamos el nombre en la parte inferior
        if (screenName) {
            tempCtx.fillStyle = '#FFFFFF';
            tempCtx.textAlign = 'center';
            tempCtx.textBaseline = 'middle';
            const fontSize = (idx === 0) ? 18 : 14;
            tempCtx.font = `bold ${fontSize}px Arial`;
            tempCtx.fillText(screenName, finalW / 2, finalH + (textHeight / 2));
        }

        // 3. "Perforamos" el área para el video
        const videoX_temp = borderWidth;
        const videoY_temp = borderWidth;
        const videoW_temp = finalW - (borderWidth * 2);
        const videoH_temp = finalH - (borderWidth * 2);
        tempCtx.clearRect(videoX_temp, videoY_temp, videoW_temp, videoH_temp);
        
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

        return {
            participant: {
                participantId,
                x: `${Math.floor(finalX / devicePixelRatio)}px`,
                y: `${Math.floor(finalY / devicePixelRatio)}px`,
                width: Math.round(videoW_temp),
                height: Math.round(videoH_temp),
                zIndex: idx,
                isOriginalAspectRatio: (idx !== 0),
                hasMask: false
            },
            img: {
                imageData,
                x: `${Math.floor(finalX / devicePixelRatio)}px`,
                y: `${Math.floor(finalY / devicePixelRatio)}px`,
                zIndex: idx + 1,
            },
        };
    } catch (error) {
        console.error(`Error dibujando el cuadrante ${idx}:`, error);
        return null;
    }
}

export async function draw({ ctx, participants, allParticipants, safeArea }) {
    const data = [];
    
    // El canvas principal ahora solo necesita ser limpiado, no pintado de negro.
    // La imagen de cada cuadrante ya incluye el borde negro.
    
    for (let idx = 0; idx < 25; idx++) {
        const participantId = participants[idx];
        const participantData = allParticipants.find(p => p.participantId === participantId);
        const screenName = participantData ? participantData.screenName : '';
        
        const d = await drawQuadrant({ ctx, idx, participantId, screenName, safeArea });
        if (d) data.push(d);
    }
    return data;
}