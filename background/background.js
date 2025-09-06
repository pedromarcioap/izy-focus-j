// --- State Management ---
let timerState = {
    timeLeft: 25 * 60, // 25 minutes in seconds
    isRunning: false,
    mode: 'focus', // 'focus' or 'break'
    task: '',
    focusDuration: 25 * 60,
    breakDuration: 5 * 60
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
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function resetTimer() {
    pauseTimer();
    timerState.timeLeft = timerState.focusDuration;
    timerState.mode = 'focus';
    broadcastStateUpdate();
}

function handleTimerEnd() {
    pauseTimer();
    const previousMode = timerState.mode;

    // Increment trees and save session stats if a focus session was completed
    if (previousMode === 'focus') {
        const session = {
            task: timerState.task || 'Foco',
            duration: timerState.focusDuration,
            completedAt: Date.now()
        };

        chrome.storage.local.get(['treesPlanted', 'sessionHistory'], (result) => {
            const newCount = (result.treesPlanted || 0) + 1;
            const newHistory = result.sessionHistory || [];
            newHistory.push(session);

            chrome.storage.local.set({
                treesPlanted: newCount,
                sessionHistory: newHistory
            }, () => {
                broadcastStateUpdate(); // Broadcast update after state is saved
            });
        });
    }

    timerState.mode = previousMode === 'focus' ? 'break' : 'focus';
    timerState.timeLeft = timerState.mode === 'focus' ? timerState.focusDuration : timerState.breakDuration;

    // Send notification
    chrome.notifications.create({
        type: 'basic',
        iconUrl: '../icons/icon128.png',
        title: previousMode === 'focus' ? 'Hora da Pausa!' : 'Hora de Focar!',
        message: previousMode === 'focus' ? `Bom trabalho em '${timerState.task}'! Você plantou uma árvore.` : 'Sua pausa acabou. Vamos voltar ao trabalho!',
        priority: 2
    });

    // If it was a break session, we still need to broadcast the state update.
    if (previousMode !== 'focus') {
        broadcastStateUpdate();
    }
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
            timerState.task = message.task || 'Foco';
            startTimer();
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
    return true; // Indicates that the response is sent asynchronously for other cases
});


// --- Site Blocking Logic ---
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (timerState.isRunning && timerState.mode === 'focus' && changeInfo.url) {
        chrome.storage.local.get(['blockList'], (result) => {
            const blockList = result.blockList || [];
            if (blockList.some(blockedSite => changeInfo.url.includes(blockedSite))) {
                // For now, let's just log it. A better implementation would be to redirect.
                console.log(`BLOCKED: Navigation to ${changeInfo.url} was blocked.`);
                // In a future step, we can redirect:
                // chrome.tabs.update(tabId, { url: 'options/blocked.html' });
                // Or inject a script to show a message:
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
