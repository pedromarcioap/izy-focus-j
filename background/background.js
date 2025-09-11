// --- State Management ---
let timerState = {
    timeLeft: 25 * 60,
    isRunning: false,
    mode: 'focus',
    task: '',
    focusDuration: 25 * 60,
    breakDuration: 5 * 60,
    sessionIsPristine: true,
    isBlockingEnabled: true
};

let timerInterval = null;

// --- Timer Logic ---
function startTimer() {
    if (timerState.isRunning) return;
    timerState.isRunning = true;
    timerInterval = setInterval(() => {
        timerState.timeLeft--;
        broadcastTimeUpdate();
        if (timerState.timeLeft <= 0) {
            handleTimerEnd();
        }
    }, 1000);
}

function pauseTimer() {
    timerState.isRunning = false;
    timerState.sessionIsPristine = false;
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Resets the timer state. Can optionally take a new duration.
function resetTimer(newDuration) {
    pauseTimer();
    // If a new duration is provided (e.g., from the dropdown), update focusDuration.
    // Otherwise, it keeps the existing focusDuration.
    if (newDuration) {
        timerState.focusDuration = newDuration;
    }
    timerState.timeLeft = timerState.focusDuration;
    timerState.mode = 'focus';
    timerState.sessionIsPristine = true;
}

function handleTimerEnd() {
    const previousMode = timerState.mode;
    const wasPristine = timerState.sessionIsPristine;

    if (previousMode === 'focus') {
        const session = {
            task: timerState.task || 'Foco',
            duration: timerState.focusDuration,
            completedAt: Date.now(),
            wasPristine: wasPristine
        };

        chrome.storage.local.get(['gardenPlants', 'sessionHistory'], (result) => {
            const newGarden = result.gardenPlants || [];
            const plant = wasPristine ? '🌳' : '🌱';
            newGarden.push(plant);

            const newHistory = result.sessionHistory || [];
            newHistory.push(session);

            chrome.storage.local.set({
                gardenPlants: newGarden,
                sessionHistory: newHistory
            }, () => {
                // After saving, reset the timer for the break and broadcast the new state.
                resetTimer(); // Resets to the current focusDuration for the upcoming break state change.
                timerState.mode = 'break';
                timerState.timeLeft = timerState.breakDuration; // Set to break duration.
                broadcastStateUpdate();
            });
        });

        let notificationMessage = `Bom trabalho em '${timerState.task}'! Você cultivou uma ${wasPristine ? 'árvore' : 'muda'}.`;
        chrome.notifications.create({ type: 'basic', iconUrl: '../icons/icon128.png', title: 'Sessão de Foco Concluída!', message: notificationMessage, priority: 2 });

    } else { // End of a break session
        resetTimer(); // Reset back to a new focus session.
        broadcastStateUpdate();
        chrome.notifications.create({ type: 'basic', iconUrl: '../icons/icon128.png', title: 'Hora de Focar!', message: 'Sua pausa acabou. Vamos voltar ao trabalho!', priority: 2 });
    }
}

// --- Communication ---
function broadcastTimeUpdate() {
    chrome.runtime.sendMessage({ type: 'TIME_UPDATE', timeLeft: timerState.timeLeft }, () => { if (chrome.runtime.lastError) {} });
}

function broadcastStateUpdate() {
    chrome.storage.local.get(['gardenPlants'], (result) => {
        const gardenPlants = result.gardenPlants || [];
        chrome.runtime.sendMessage({ type: 'STATE_UPDATE', state: { ...timerState, gardenPlants } }, () => { if (chrome.runtime.lastError) {} });
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.command) {
        case 'start':
            // This is a new session if the timer is not currently running.
            if (!timerState.isRunning) {
                timerState.sessionIsPristine = true;
                // If a duration is passed, it means the user just selected it.
                if (message.duration) {
                    timerState.focusDuration = message.duration;
                    timerState.timeLeft = message.duration;
                }
            }
            timerState.task = message.task || 'Foco';
            startTimer();
            broadcastStateUpdate();
            sendResponse(timerState);
            break;
        case 'pause':
            pauseTimer();
            broadcastStateUpdate();
            sendResponse(timerState);
            break;
        case 'reset':
            resetTimer(message.duration); // Pass optional new duration.
            broadcastStateUpdate(); // Ensure UI is always updated after a manual reset.
            sendResponse(timerState);
            break;
        case 'getState':
            chrome.storage.local.get(['gardenPlants'], (result) => {
                const gardenPlants = result.gardenPlants || [];
                sendResponse({ ...timerState, gardenPlants });
            });
            return true;
        case 'toggleBlocking':
            timerState.isBlockingEnabled = message.isBlockingEnabled;
            broadcastStateUpdate();
            sendResponse(timerState);
            break;
    }
    return true;
});

// --- Site Blocking Logic ---
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (timerState.isRunning && timerState.mode === 'focus' && timerState.isBlockingEnabled && changeInfo.url) {
        chrome.storage.local.get(['blockList'], (result) => {
            const blockList = result.blockList || [];
            if (blockList.some(blockedSite => changeInfo.url.includes(blockedSite))) {
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: () => {
                        document.body.innerHTML = `
                            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; background-color: #1c1c1e; color: white;">
                                <h1>Site Bloqueado pela Izy Focus C</h1>
                            </div>
                        `;
                    }
                });
            }
        });
    }
});
