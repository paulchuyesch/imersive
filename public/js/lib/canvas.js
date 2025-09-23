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
    
    export async function drawQuadrant({ idx, ctx, participantId, safeArea }) {
        // =================================================================
        const borderWidth = 5 * devicePixelRatio; // Mantenemos tu grosor de borde
        // =================================================================
    
        if (participantId && typeof participantId !== 'string') {
            console.warn(`ID de participante inválido en el índice ${idx}:`, participantId);
            return null;
        }
    
        try {
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
            const finalBorderWidth = Math.round(borderWidth);
    
            // --- LÓGICA SIMPLIFICADA ---
            // Simplemente "borramos" el espacio para el video del gran marco que ya dibujamos.
            const videoX = finalX + finalBorderWidth;
            const videoY = finalY + finalBorderWidth;
            const videoW = finalW - (finalBorderWidth * 2);
            const videoH = finalH - (finalBorderWidth * 2);
            ctx.clearRect(videoX, videoY, videoW, videoH);
            
            const imageData = ctx.getImageData(finalX, finalY, finalW, finalH);
    
            return {
                participant: {
                    participantId,
                    x: `${Math.floor(videoX / devicePixelRatio)}px`,
                    y: `${Math.floor(videoY / devicePixelRatio)}px`,
                    width: videoW,
                    height: videoH,
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
    
    export async function draw({ ctx, participants, safeArea }) {
        const data = [];
        const borderColor = '#000000'; // El color del marco
    
        // --- NUEVA ESTRATEGIA: Dibuja un único marco negro sólido debajo de todo ---
        ctx.fillStyle = borderColor;
        ctx.fillRect(safeArea.x, safeArea.y, safeArea.width, safeArea.height);
    
        for (let idx = 0; idx < 25; idx++) {
            const participantId = participants[idx];
            const d = await drawQuadrant({ ctx, idx, participantId, safeArea });
            if (d) data.push(d);
        }
        return data;
    }