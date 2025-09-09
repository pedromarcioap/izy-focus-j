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

function resetTimer(shouldBroadcast = true) {
    pauseTimer();
    timerState.timeLeft = timerState.focusDuration;
    timerState.mode = 'focus';
    timerState.sessionIsPristine = true;
    if (shouldBroadcast) {
        broadcastStateUpdate();
    }
}

function handleTimerEnd() {
    const previousMode = timerState.mode;
    const wasPristine = timerState.sessionIsPristine;
    pauseTimer();

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
                resetTimer(false);
                broadcastStateUpdate();
            });
        });

        let notificationMessage = `Bom trabalho em '${timerState.task}'! Você cultivou uma ${wasPristine ? 'árvore' : 'muda'}.`;
        chrome.notifications.create({
            type: 'basic',
            iconUrl: '../icons/icon128.png',
            title: 'Sessão de Foco Concluída!',
            message: notificationMessage,
            priority: 2
        });

    } else { // End of a break session
        resetTimer(false);
        broadcastStateUpdate();
        chrome.notifications.create({
            type: 'basic',
            iconUrl: '../icons/icon128.png',
            title: 'Hora de Focar!',
            message: 'Sua pausa acabou. Vamos voltar ao trabalho!',
            priority: 2
        });
    }
}

// --- Communication ---
function broadcastTimeUpdate() {
    chrome.runtime.sendMessage({ type: 'TIME_UPDATE', timeLeft: timerState.timeLeft }, () => {
        if (chrome.runtime.lastError) {}
    });
}

function broadcastStateUpdate() {
    chrome.storage.local.get(['gardenPlants'], (result) => {
        const gardenPlants = result.gardenPlants || [];
        chrome.runtime.sendMessage({ type: 'STATE_UPDATE', state: { ...timerState, gardenPlants } }, () => {
            if (chrome.runtime.lastError) {}
        });
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.command) {
        case 'start':
            if (!timerState.isRunning) {
                timerState.sessionIsPristine = true;
                timerState.timeLeft = timerState.focusDuration;
            }
            timerState.task = message.task || 'Foco';
            startTimer();
            broadcastStateUpdate();
            sendResponse(timerState);
            break;
        case 'pause':
            pauseTimer();
            sendResponse(timerState);
            break;
        case 'reset':
            resetTimer();
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
