// --- State Management ---
let timerState = {
    timeLeft: 25 * 60, // 25 minutes in seconds
    isRunning: false,
    mode: 'focus', // 'focus' or 'break'
    task: '',
    focusDuration: 25 * 60,
    breakDuration: 5 * 60,
    sessionIsPristine: true // A session is "pristine" if it hasn't been paused.
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
    timerState.sessionIsPristine = false; // Pausing invalidates the session for rewards
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function resetTimer(shouldBroadcast = true) {
    pauseTimer();
    timerState.timeLeft = timerState.focusDuration;
    timerState.mode = 'focus';
    timerState.sessionIsPristine = true; // Resetting starts a new, pristine session
    if (shouldBroadcast) {
        broadcastStateUpdate();
    }
}

function handleTimerEnd() {
    const previousMode = timerState.mode;
    const wasPristine = timerState.sessionIsPristine;

    // Stop the timer before doing anything else
    pauseTimer();

    // Save session stats if a focus session was completed
    if (previousMode === 'focus') {
        const session = {
            task: timerState.task || 'Foco',
            duration: timerState.focusDuration,
            completedAt: Date.now(),
            wasPristine: wasPristine
        };

        chrome.storage.local.get(['treesPlanted', 'sessionHistory'], (result) => {
            let newCount = result.treesPlanted || 0;
            if (wasPristine) {
                newCount++; // Only plant a tree if the session was not paused
            }

            const newHistory = result.sessionHistory || [];
            newHistory.push(session);

            chrome.storage.local.set({
                treesPlanted: newCount,
                sessionHistory: newHistory
            }, () => {
                // Reset for the next session and then broadcast the final state
                resetTimer(false); // Reset state but don't broadcast yet
                broadcastStateUpdate(); // Now broadcast the fully updated state
            });
        });
    } else {
         // If it was a break session, just reset and broadcast
        resetTimer(false);
        broadcastStateUpdate();
    }

    // Send notification
    let notificationMessage = `Bom trabalho em '${timerState.task}'!`;
    if (previousMode === 'focus') {
        notificationMessage += wasPristine ? ' Você plantou uma árvore.' : ' Sessão concluída, mas nenhuma árvore plantada por ter pausado.';
    } else {
        notificationMessage = 'Sua pausa acabou. Vamos voltar ao trabalho!';
    }

    chrome.notifications.create({
        type: 'basic',
        iconUrl: '../icons/icon128.png',
        title: previousMode === 'focus' ? 'Sessão de Foco Concluída!' : 'Hora de Focar!',
        message: notificationMessage,
        priority: 2
    });
}


// --- Communication ---
function broadcastTimeUpdate() {
    chrome.runtime.sendMessage({ type: 'TIME_UPDATE', timeLeft: timerState.timeLeft });
}

function broadcastStateUpdate() {
    chrome.storage.local.get(['treesPlanted'], (result) => {
        const treesPlanted = result.treesPlanted || 0;
        chrome.runtime.sendMessage({ type: 'STATE_UPDATE', state: { ...timerState, treesPlanted } });
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.command) {
        case 'start':
            // If starting from a stopped state, it's a new session
            if (!timerState.isRunning) {
                timerState.sessionIsPristine = true;
                // Set the duration for the new session
                if (message.duration) {
                    timerState.focusDuration = message.duration;
                    timerState.timeLeft = message.duration;
                }
            }
            timerState.task = message.task || 'Foco';
            startTimer();
            broadcastStateUpdate(); // Broadcast the new state to all popups
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
            chrome.storage.local.get(['treesPlanted'], (result) => {
                const treesPlanted = result.treesPlanted || 0;
                sendResponse({ ...timerState, treesPlanted });
            });
            return true; // Keep channel open for async response
    }
    return true;
});


// --- Site Blocking Logic ---
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (timerState.isRunning && timerState.mode === 'focus' && changeInfo.url) {
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
