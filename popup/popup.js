const timerDisplay = document.getElementById('timer-display');
const taskInput = document.getElementById('task-input');
const startButton = document.getElementById('start-button');
const pauseButton = document.getElementById('pause-button');
const resetButton = document.getElementById('reset-button');

// --- Button Event Listeners ---

startButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ command: 'start', task: taskInput.value });
});

pauseButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ command: 'pause' });
});

resetButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ command: 'reset' });
});

// --- Listen for Messages from Background Script ---

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'TIME_UPDATE') {
        updateTimerDisplay(message.timeLeft);
    }
    if (message.type === 'STATE_UPDATE') {
        updateUI(message.state);
    }
});

// --- UI Update Functions ---

function updateTimerDisplay(timeLeft) {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updateUI(state) {
    // Update timer display
    updateTimerDisplay(state.timeLeft);

    // Update task input
    taskInput.value = state.task || '';

    // Update buttons visibility
    if (state.isRunning) {
        startButton.style.display = 'none';
        pauseButton.style.display = 'inline-block';
    } else {
        startButton.style.display = 'inline-block';
        pauseButton.style.display = 'none';
    }
}

// --- Request Initial State on Popup Load ---

document.addEventListener('DOMContentLoaded', () => {
    // Request the current state from the background script
    chrome.runtime.sendMessage({ command: 'getState' }, (response) => {
        if (chrome.runtime.lastError) {
            // Handle error, e.g., background script not ready
            console.error(chrome.runtime.lastError.message);
            // You might want to set a default state here
            updateUI({
                timeLeft: 25 * 60,
                isRunning: false,
                task: ''
            });
        } else {
            updateUI(response);
        }
    });
});
