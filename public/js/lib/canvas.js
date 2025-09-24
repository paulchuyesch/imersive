// public/js/lib/canvas.js (VERSIÓN CORREGIDA Y ALINEADA)

/**
 * Función auxiliar para cargar una imagen de forma asíncrona.
 */
async function loadImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => {
            console.error(`Error al cargar la imagen: ${src}`);
            resolve(null);
        };
        img.src = src;
    });
}

/**
 * Dibuja un cuadrante individual, ya sea para un participante o como un placeholder.
 */
export async function drawQuadrant({
    idx,
    safeArea,
    participantId,
    screenName,
    placeholderImage,
}) {
    try {
        const borderWidth = 5 * devicePixelRatio;
        const textHeight = 35; // Espacio reservado para el nombre

        // 1. Calcular dimensiones del slot
        const canvasWidth = safeArea.width;
        const canvasHeight = safeArea.height;
        const slotWidth = canvasWidth / 7;
        const slotHeight = canvasHeight / 7;

        let x, y, w, h;
        if (idx === 0) {
            x = slotWidth;
            y = slotHeight;
            w = slotWidth * 5;
            h = slotHeight * 5;
        } else {
            const borderIndex = idx - 1;
            let row, col;
            if (borderIndex >= 0 && borderIndex <= 6) {
                row = 0;
                col = borderIndex;
            } else if (borderIndex >= 7 && borderIndex <= 11) {
                row = borderIndex - 7 + 1;
                col = 6;
            } else if (borderIndex >= 12 && borderIndex <= 18) {
                row = 6;
                col = 6 - (borderIndex - 12);
            } else if (borderIndex >= 19 && borderIndex <= 23) {
                row = 6 - (borderIndex - 18);
                col = 0;
            }
            x = col * slotWidth;
            y = row * slotHeight;
            w = slotWidth;
            h = slotHeight;
        }

        const finalX = Math.round(x + safeArea.x);
        const finalY = Math.round(y + safeArea.y);
        const finalW = Math.round(w);
        const finalH = Math.round(h);

        // 2. Crear un canvas temporal para la imagen
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = finalW;
        tempCanvas.height = finalH + (screenName ? textHeight : 0); // Solo añade altura si hay nombre
        const tempCtx = tempCanvas.getContext('2d');

        // 3. Dibujar el fondo negro SÓLO para el área del marco, no para el texto
        tempCtx.fillStyle = '#000000';
        tempCtx.fillRect(0, 0, finalW, finalH); // Usamos finalH, no la altura total del canvas

        const innerX = borderWidth;
        const innerY = borderWidth;
        const innerW = finalW - borderWidth * 2;
        const innerH = finalH - borderWidth * 2;

        // 4. Dibujar contenido (placeholder o transparente)
        if (participantId) {
            tempCtx.clearRect(innerX, innerY, innerW, innerH);
        } else if (placeholderImage) {
            tempCtx.drawImage(placeholderImage, innerX, innerY, innerW, innerH);
        }

        // 5. Dibujar el nombre si existe
        if (screenName) {
            tempCtx.fillStyle = '#FFFFFF';
            tempCtx.textAlign = 'center';
            tempCtx.textBaseline = 'middle';
            const fontSize = idx === 0 ? 18 : 14;
            tempCtx.font = `bold ${fontSize}px Arial`;
            // Dibuja el nombre en el espacio extra debajo del marco
            tempCtx.fillText(screenName, finalW / 2, finalH + textHeight / 2);
        }

        const imageData = tempCtx.getImageData(
            0,
            0,
            tempCanvas.width,
            tempCanvas.height
        );

        const participant = participantId
            ? {
                  participantId,
                  x: `${Math.floor((finalX + innerX) / devicePixelRatio)}px`,
                  y: `${Math.floor((finalY + innerY) / devicePixelRatio)}px`,
                  width: Math.round(innerW),
                  height: Math.round(innerH),
                  zIndex: idx,
                  isOriginalAspectRatio: true,
              }
            : null;

        return {
            participant,
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

export async function draw({ participants, allParticipants, safeArea }) {
    const data = [];
    const placeholderImage = await loadImage('/img/usuario-zoom.png');

    for (let idx = 0; idx < 25; idx++) {
        const participantId = participants[idx];
        const participantData = allParticipants.find(
            (p) => p.participantId === participantId
        );
        const screenName = participantData ? participantData.screenName : '';

        const d = await drawQuadrant({
            idx,
            safeArea,
            participantId,
            screenName,
            placeholderImage,
        });
        if (d) data.push(d);
    }
    return data;
}

// Funciones originales que no se usan en esta lógica pero se mantienen por si acaso
export function drawRect(ctx, x, y, width, height, fill) {
    ctx.save();
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
}
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
export function clipRoundRect(ctx, x, y, width, height, radius) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#FFF';
    const region = getRoundRectPath(x, y, width, height, radius);
    ctx.fill(region);
    ctx.clip(region);
    ctx.restore();
}
