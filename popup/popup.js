document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const timerDisplay = document.getElementById('timer-display');
    const taskInput = document.getElementById('task-input');
    const startButton = document.getElementById('start-button');
    const pauseButton = document.getElementById('pause-button');
    const resetButton = document.getElementById('reset-button');
    const actionButtonsDiv = document.getElementById('action-buttons');
    const gardenDiv = document.getElementById('garden');
    const hyperfocusToggle = document.getElementById('hyperfocus-toggle');
    const durationInput = document.getElementById('duration-input');
    const statsButton = document.getElementById('stats-button');
    const optionsButton = document.getElementById('options-button');

    // --- Render Functions ---

    function renderTimer(timeLeft) {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function renderGarden(plants = []) {
        gardenDiv.innerHTML = '';
        plants.forEach((plant, index) => {
            const plantSpan = document.createElement('span');
            plantSpan.textContent = plant;
            plantSpan.title = `Planta ${index + 1}`;
            gardenDiv.appendChild(plantSpan);
        });
    }

    function updateUI(state) {
        renderTimer(state.timeLeft);
        renderGarden(state.gardenPlants);

        taskInput.value = state.task || '';
        hyperfocusToggle.checked = state.isBlockingEnabled;
        durationInput.value = Math.round(state.focusDuration / 60);

        if (state.isRunning) {
            actionButtonsDiv.innerHTML = '';
            actionButtonsDiv.appendChild(pauseButton);
            actionButtonsDiv.appendChild(resetButton);
            pauseButton.style.display = 'flex';
            resetButton.style.display = 'flex';

            taskInput.disabled = true;
            hyperfocusToggle.disabled = true;
            durationInput.disabled = true;
        } else {
            actionButtonsDiv.innerHTML = '';
            actionButtonsDiv.appendChild(startButton);
            startButton.style.display = 'flex';
            pauseButton.style.display = 'none';
            resetButton.style.display = 'none';

            taskInput.disabled = false;
            hyperfocusToggle.disabled = false;
            durationInput.disabled = false;
        }
    }

    // --- Event Listeners ---

    startButton.addEventListener('click', () => {
        const durationInMinutes = parseInt(durationInput.value, 10);
        if (isNaN(durationInMinutes) || durationInMinutes < 1) {
            durationInput.value = 25; // Reset to default if invalid
            return;
        }
        chrome.runtime.sendMessage({
            command: 'start',
            task: taskInput.value,
            duration: durationInMinutes * 60
        });
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

    durationInput.addEventListener('input', () => {
        chrome.runtime.sendMessage({ command: 'getState' }, (state) => {
            if (!state.isRunning) {
                const newDurationInSeconds = parseInt(durationInput.value, 10) * 60;
                renderTimer(newDurationInSeconds);
            }
        });
    });

    statsButton.addEventListener('click', () => chrome.tabs.create({ url: 'stats/stats.html' }));
    optionsButton.addEventListener('click', () => chrome.tabs.create({ url: 'options/options.html' }));

    // --- Communication with Background ---

    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'STATE_UPDATE') {
            updateUI(message.state);
        }
    });

    // --- Initial State Load ---
    function loadInitialState() {
        chrome.runtime.sendMessage({ command: 'getState' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                updateUI({
                    timeLeft: 25 * 60,
                    isRunning: false,
                    task: '',
                    gardenPlants: [],
                    isBlockingEnabled: true,
                    focusDuration: 25 * 60
                });
            } else {
                updateUI(response);
            }
        });
    }

    loadInitialState();
});
