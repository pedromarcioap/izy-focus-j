document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const timerDisplay = document.getElementById('timer-display');
    const taskInput = document.getElementById('task-input');
    const startButton = document.getElementById('start-button');
    const pauseButton = document.getElementById('pause-button');
    const resetButton = document.getElementById('reset-button');
    const gardenDiv = document.getElementById('garden');
    const hyperfocusToggle = document.getElementById('hyperfocus-toggle');

    // --- Render Functions ---

    function renderTimer(timeLeft) {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function renderGarden(treeCount) {
        gardenDiv.innerHTML = '';
        for (let i = 0; i < treeCount; i++) {
            const treeSpan = document.createElement('span');
            treeSpan.textContent = '🌳';
            treeSpan.title = `Árvore ${i + 1}`;
            gardenDiv.appendChild(treeSpan);
        }
    }

    function updateUI(state) {
        renderTimer(state.timeLeft);
        renderGarden(state.treesPlanted || 0);

        taskInput.value = state.task || '';
        hyperfocusToggle.checked = state.isBlockingEnabled;

        if (state.isRunning) {
            startButton.style.display = 'none';
            pauseButton.style.display = 'inline-block';
            taskInput.disabled = true;
            hyperfocusToggle.disabled = true;
        } else {
            startButton.style.display = 'inline-block';
            pauseButton.style.display = 'none';
            taskInput.disabled = false;
            hyperfocusToggle.disabled = false;
        }
    }

    // --- Event Listeners ---

    startButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ command: 'start', task: taskInput.value });
    });

    pauseButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ command: 'pause' });
    });

    resetButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ command: 'reset' });
    });

    hyperfocusToggle.addEventListener('change', () => {
        chrome.runtime.sendMessage({
            command: 'toggleBlocking',
            isBlockingEnabled: hyperfocusToggle.checked
        });
    });

    // --- Communication with Background ---

    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'TIME_UPDATE') {
            renderTimer(message.timeLeft);
        }
        if (message.type === 'STATE_UPDATE') {
            updateUI(message.state);
        }
    });

    // --- Initial State Load ---

    function loadInitialState() {
        chrome.runtime.sendMessage({ command: 'getState' }, (response) => {
            if (chrome.runtime.lastError) {
                // Handle error, e.g., background script not ready
                console.error(chrome.runtime.lastError.message);
                // Set a default state for the UI
                updateUI({
                    timeLeft: 25 * 60,
                    isRunning: false,
                    task: '',
                    treesPlanted: 0,
                    isBlockingEnabled: true
                });
            } else {
                updateUI(response);
            }
        });
    }

    loadInitialState();
});
