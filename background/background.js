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
    timerState.mode = previousMode === 'focus' ? 'break' : 'focus';
    timerState.timeLeft = timerState.mode === 'focus' ? timerState.focusDuration : timerState.breakDuration;

    // Send notification
    chrome.notifications.create({
        type: 'basic',
        iconUrl: '../icons/icon128.png',
        title: previousMode === 'focus' ? 'Hora da Pausa!' : 'Hora de Focar!',
        message: previousMode === 'focus' ? `Bom trabalho em '${timerState.task}'! Descanse por 5 minutos.` : 'Sua pausa acabou. Vamos voltar ao trabalho!',
        priority: 2
    });

    broadcastStateUpdate();
}

// --- Communication ---
function broadcastTimeUpdate() {
    chrome.runtime.sendMessage({ type: 'TIME_UPDATE', timeLeft: timerState.timeLeft });
}

function broadcastStateUpdate() {
    chrome.runtime.sendMessage({ type: 'STATE_UPDATE', state: timerState });
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
            sendResponse(timerState);
            break;
    }
    return true; // Indicates that the response is sent asynchronously
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
