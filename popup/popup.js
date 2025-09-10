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
    const durationSelect = document.getElementById('duration-select');

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
        durationSelect.value = Math.round(state.focusDuration / 60);


        if (state.isRunning) {
            actionButtonsDiv.innerHTML = ''; // Clear buttons
            actionButtonsDiv.appendChild(pauseButton);
            actionButtonsDiv.appendChild(resetButton);
            pauseButton.style.display = 'inline-block';
            resetButton.style.display = 'inline-block';

            taskInput.disabled = true;
            hyperfocusToggle.disabled = true;
            durationSelect.disabled = true;
        } else {
            actionButtonsDiv.innerHTML = ''; // Clear buttons
            actionButtonsDiv.appendChild(startButton);
            startButton.style.display = 'inline-block';
            pauseButton.style.display = 'none';
            resetButton.style.display = 'none';

            taskInput.disabled = false;
            hyperfocusToggle.disabled = false;
            durationSelect.disabled = false;
        }
    }

    // --- Event Listeners ---

    startButton.addEventListener('click', () => {
        const durationInMinutes = parseInt(durationSelect.value, 10);
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

    durationSelect.addEventListener('change', () => {
        const newDurationInSeconds = parseInt(durationSelect.value, 10) * 60;
        // When duration changes, we want to tell the background to adopt this new time
        // This will effectively be a "soft reset" of the timer to the new duration
        chrome.runtime.sendMessage({ command: 'reset', duration: newDurationInSeconds });
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
