const timerDisplay = document.getElementById('timer-display');
const taskInput = document.getElementById('task-input');
const startButton = document.getElementById('start-button');
const pauseButton = document.getElementById('pause-button');
const resetButton = document.getElementById('reset-button');
const treesPlantedCount = document.getElementById('trees-planted-count');
const durationSelect = document.getElementById('duration-select');

// --- Event Listeners ---

startButton.addEventListener('click', () => {
    const durationInMinutes = parseInt(durationSelect.value, 10);
    chrome.runtime.sendMessage({
        command: 'start',
        task: taskInput.value,
        duration: durationInMinutes * 60 // Send duration in seconds
    });
});

pauseButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ command: 'pause' });
});

resetButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ command: 'reset' });
});

durationSelect.addEventListener('change', () => {
    // When the user changes the duration, update the display if the timer is not running
    chrome.runtime.sendMessage({ command: 'getState' }, (response) => {
        if (!response.isRunning) {
            const newDurationInSeconds = parseInt(durationSelect.value, 10) * 60;
            updateTimerDisplay(newDurationInSeconds);
        }
    });
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
    updateTimerDisplay(state.timeLeft);
    taskInput.value = state.task || '';
    treesPlantedCount.textContent = state.treesPlanted || 0;

    // Update buttons and duration select visibility/state
    if (state.isRunning) {
        startButton.style.display = 'none';
        pauseButton.style.display = 'inline-block';
        durationSelect.disabled = true; // Disable dropdown when timer is running
    } else {
        startButton.style.display = 'inline-block';
        pauseButton.style.display = 'none';
        durationSelect.disabled = false; // Enable dropdown when timer is stopped
    }

    // Set the dropdown to the correct value for the current session
    const currentDurationInMinutes = Math.round(state.focusDuration / 60);
    durationSelect.value = currentDurationInMinutes.toString();
}

// --- Request Initial State on Popup Load ---

document.addEventListener('DOMContentLoaded', () => {
    chrome.runtime.sendMessage({ command: 'getState' }, (response) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
            updateUI({
                timeLeft: 25 * 60,
                isRunning: false,
                task: '',
                treesPlanted: 0,
                focusDuration: 25 * 60
            });
        } else {
            updateUI(response);
        }
    });
});
