import app from './lib/immersive-app.js';
import socket from './lib/socket.js';
import { draw, drawQuadrant } from './lib/canvas.js';

const colors = {
    black: '#131619',
    blue: '#0e72ed',
    green: '#4b9d64',
    red: '#e8173d',
    yellow: '#ffbf39',
};

const settings = {
    cast: [],
    color: colors.blue,
    uuid: '',
};

const classes = {
    bold: 'has-text-weight-bold',
    hidden: 'is-hidden',
    panel: 'panel-block',
};

/* Page Elements */
const canvas = document.getElementById('uiCanvas');
const ctx = canvas.getContext('2d');

// Content and Form Elements
const content = document.getElementById('main');
const controls = document.getElementById('controls');
const hostControls = document.getElementById('hostControls');

// Color Selection
const colorSel = document.getElementById('colorSel');
const custColorInp = document.getElementById('custColorInp');

// Cast selection
const castSel = document.getElementById('castSel');
const setCastBtn = document.getElementById('setCastBtn');

const helpMsg = document.getElementById('helpMsg');

/**
 * Remove the hidden class from an element
 * @param {Element} el - element to hide
 */
function showEl(el) {
    el.classList.remove(classes.hidden);
}

/**
 * Add the hidden class to an element
 * @param {Element} el - element to show
 */
function hideEl(el) {
    el.classList.add(classes.hidden);
}

/**
 * Clear the in-page canvas for re-drawing
 */
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * Delay draw calls to prevent rendering too often
 * @param {Function} fn - function to debounce
 * @param {Number} ms - time to delay in milliseconds
 * @return {(function(...[*]): void)}
 */
function debounce(fn, ms = 250) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            fn.apply(this, args);
        }, ms);
    };
}

/**
 * Start the Immersive Context and send an invitation to all users
 * @return {Promise<void>}
 */
async function start() {
    hideEl(content);

    await app.start();
    await app.updateContext();

    showElements();

    if (app.isImmersive && app.userIsHost)
        await app.sdk.sendAppInvitationToAllParticipants();
}

/**
 * Draw the entire screen - to be used with debounce()
 * @return {Promise<void>}
 */
async function render() {
    if (!app.isImmersive) return;

    const totalWidth = innerWidth * devicePixelRatio;
    const totalHeight = innerHeight * devicePixelRatio;

    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.width = totalWidth;
    canvas.height = totalHeight;

    const targetAspectRatio = 16 / 9;
    let safeWidth = totalWidth;
    let safeHeight = totalHeight;
    let safeX = 0;
    let safeY = 0;

    if ((totalWidth / totalHeight) > targetAspectRatio) {
        safeWidth = totalHeight * targetAspectRatio;
        safeX = (totalWidth - safeWidth) / 2;
    } else {
        safeHeight = totalWidth / targetAspectRatio;
        safeY = (totalHeight - safeHeight) / 2;
    }

    ctx.clearRect(0, 0, totalWidth, totalHeight);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    ctx.fillStyle = settings.color;
    ctx.fillRect(safeX, safeY, safeWidth, safeHeight);

    await app.clearAllParticipants();
    await app.clearAllImages();

    const participantsSnapshot = [...settings.cast];

    const data = await draw({
        ctx,
        participants: participantsSnapshot,
        safeArea: { x: safeX, y: safeY, width: safeWidth, height: safeHeight }
    });
    
    for (let i = 0; i < data.length; i++) {
        const { participant, img } = data[i];
        const id = participant?.participantId;

        if (img) {
            await app.drawImage(img);
        }
        
        if (id) {
            await app.drawParticipant(participant);
            // ##### CAMBIO FINAL AQUÍ #####
            // Se llama a la API para remover el fondo virtual del participante.
            try {
                await app.sdk.removeVirtualBackground({ participantId: id });
            } catch (e) {
                console.error("Error al remover el fondo virtual:", e);
            }
            // ###########################
        }
    }

    clearCanvas();
}

/**
 * Redraw one of the displayed participants
 * @param {Number} idx - index of the participant (0-24)
 * @param {String} p - participant ID
 * @return {Promise<void>}
 */
async function drawCastMember(idx, p) {
    if (!app.isImmersive || idx >= 25) return;

    const totalWidth = innerWidth * devicePixelRatio;
    const totalHeight = innerHeight * devicePixelRatio;
    const targetAspectRatio = 16 / 9;
    let safeWidth = totalWidth;
    let safeHeight = totalHeight;
    let safeX = 0;
    let safeY = 0;

    if ((totalWidth / totalHeight) > targetAspectRatio) {
        safeWidth = totalHeight * targetAspectRatio;
        safeX = (totalWidth - safeWidth) / 2;
    } else {
        safeHeight = totalWidth / targetAspectRatio;
        safeY = (totalHeight - safeHeight) / 2;
    }
    const safeArea = { x: safeX, y: safeY, width: safeWidth, height: safeHeight };

    const { img, participant } = await drawQuadrant({
        ctx,
        idx,
        participantId: p,
        safeArea: safeArea
    });

    await app.drawImage(img);

    if (participant?.participantId) {
        const id = participant.participantId;
        const drawn = app.drawnParticipants[idx];

        if (drawn) await app.clearParticipant(drawn);

        if (id) {
            await app.drawParticipant(participant);
             // Se añade también aquí por consistencia
            try {
                await app.sdk.removeVirtualBackground({ participantId: id });
            } catch (e) {
                console.error("Error al remover el fondo virtual:", e);
            }
        }
    }

    clearCanvas();
}

/**
 * Handle socket-io update events sent from the meeting host
 * @param {Array.<String>} participants - participants to display
 * @param {String} color - UI color
 * @return {Promise<void>}
 */
async function onUpdate({ participants, color }) {
    const changes = {
        color: color && settings.color !== color,
        participants: participants && settings.cast !== participants,
    };
    
    if (changes.color) {
        settings.color = color;
        await app.sdk.postMessage({ color: settings.color });
    }

    if (changes.participants) settings.cast = participants;

    if (!app.isImmersive) return;

    const allChanged = Object.values(changes).reduce(
        (sum, next) => sum && next,
        true
    );

    const len = app.drawnImages.length;
    const hasImages = len > 0;

    if (allChanged || changes.color || (changes.participants && !hasImages))
        return await render();

    if (changes.participants && hasImages)
        for (let i = 0; i < len; i++) {
            await drawCastMember(i, settings.cast[i]);
        }
}

/**
 * Set the participants in the Cast Selection element
 * @param {Array.<Object>} participants - Participant objects from the Zoom JS SDK
 */
function setCastSelect(participants) {
    for (let i = 0; i < castSel.options.length; i++) castSel.remove(i);

    for (const p of participants) {
        const prefix = p.role === 'host' ? '[You] ' : '';
        const opt = document.createElement('option');

        opt.value = p.participantId;
        opt.text = `${prefix}${p.screenName}`;

        castSel.appendChild(opt);
    }
}

/**
 * Hide and Show elements based on the Zoom Running Context
 */
function showElements() {
    const { style } = document.body;
    if (app.isImmersive) {
        style.overflow = 'hidden';
        hideEl(content);
    } else showEl(content);

    if (app.isInMeeting) {
        if (app.userIsHost) {
            showEl(controls);
            hideEl(helpMsg);
        } else {
            helpMsg.innerText = 'This app must be started by the host';
        }
    }

    if (app.userIsHost) {
        showEl(hostControls);
        setCastSelect(app.participants);
    }
}


/* DOM Event Handlers */

colorSel.onchange = async (e) => {
    if (custColorInp.value.length > 0) return;

    const color = colors[e.target.value];
    if (!color) return;

    settings.color = color;

    await app.sdk.postMessage({
        color,
    });

    socket.emit('sendUpdate', {
        color: settings.color,
        meetingUUID: settings.uuid,
    });
};

custColorInp.onchange = async (e) => {
    const { value } = e.target;
    if (value.length > 0) {
        settings.color = value;

        colorSel.setAttribute('disabled', '');

        await app.sdk.postMessage({
            color: settings.color,
        });

        if (app.userIsHost)
            socket.emit('sendUpdate', {
                color: settings.color,
                meetingUUID: settings.uuid,
            });
    } else colorSel.removeAttribute('disabled');
};

setCastBtn.onclick = async () => {
    const selected = castSel.querySelectorAll('option:checked');
    const hasUI = app.drawnImages.length > 0;

    const cast = [];
    
    for (let i = 0; i < 25 && i < selected.length; i++) {
        const id = selected[i].value;

        if (!id) continue;

        cast.push(id);

        if (hasUI) await drawCastMember(i, id);
    }

    settings.cast = cast;

    const updateCast = settings.cast;

    if (app.isInMeeting) await start();
    else if (app.isImmersive && !hasUI) await render();
    else if (app.isInClient) await app.sdk.postMessage({ updateCast });

    socket.emit('sendUpdate', {
        participants: settings.cast,
        color: settings.color,
        meetingUUID: settings.uuid,
    });
};

window.onresize = debounce(render, 1000);

(async () => {
    try {
        await app.init();

        /* Zoom Event Handlers */

        app.sdk.onConnect(async () => {
            if (app.isInClient) return;

            await app.sdk.takeParticipantPhoto();
            app.sdk.onPhoto(async (payload) => {
                console.log(JSON.stringify(payload));
            });

            await app.sdk.postMessage({
                participants: app.participants,
                color: settings.color,
                isHost: app.userIsHost,
                uuid: settings.uuid,
            });
        });

        app.sdk.onMeeting(({ action }) => {
            if (action === 'ended') socket.disconnect();
        });

        app.sdk.onParticipantChange(async ({ participants }) => {
            for (const part of participants) {
                const p = {
                    participantId: part.participantId.toString(),
                    screenName: part.screenName,
                    role: part.role,
                };

                const i = app.participants.findIndex(
                    ({ participantId }) => participantId === p.participantId
                );

                if (part.status === 'leave' && i !== -1) {
                    app.participants.splice(i, 1);
                    const idx = settings.cast.indexOf(p.participantId);

                    if (idx === -1) return;

                    settings.cast.splice(idx, 1);

                    if (app.isImmersive) await app.clearParticipant(p.participantId);
                } else app.participants.push(p);
            }

            await app.sdk.postMessage({ participants: app.participants });
            setCastSelect(app.participants);
        });

        app.sdk.onMessage(async ({ payload }) => {
            const {
                color,
                updateCast,
                ended,
                isHost,
                participants,
                uuid,
            } = payload;

            if (uuid) {
                showEl(controls);
                settings.uuid = uuid;
            }

            if (ended) {
                hideEl(controls);
                hideEl(hostControls);
            }

            if (isHost) {
                showEl(hostControls);
                setCastSelect(app.participants);
            }

            if (participants) {
                helpMsg.classList.add(classes.hidden);
                controls.classList.remove(classes.hidden);
                setCastSelect(participants);
            }

            if (updateCast) {
                settings.cast = updateCast.slice(0, 25);

                if (app.isInMeeting) await start();
                else if (app.isImmersive) {
                    const len = app.drawnImages.length;
                    if (len <= 0) await render();
                    else
                        for (let i = 0; i < len; i++) {
                            const p = settings.cast[i];
                            if (!p) continue;

                            await drawCastMember(i, p);
                        }
                }
            }

            if (color) {
                const idx = Object.values(colors).indexOf(color);
                const isCustom = idx === -1;

                settings.color = color;

                if (isCustom) {
                    custColorInp.value = color;
                    colorSel.setAttribute('disabled', '');
                } else {
                    colorSel.removeAttribute('disabled');
                    colorSel.value = Object.keys(colors)[idx];
                }

                if (app.isImmersive) await render();
            }
        });


        if (!app.isInClient) {
            const { meetingUUID } = await app.sdk.getMeetingUUID();
            settings.uuid = meetingUUID;

            await app.sdk.connect();

            if (!app.userIsHost) {
                socket.on('update', onUpdate);
                socket.emit('join', { meetingUUID: settings.uuid });
            }
        }
        showElements();
    } catch (e) {
        console.error(e);
    }
})();