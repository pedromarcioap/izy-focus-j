document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const totalSessionsEl = document.getElementById('total-sessions');
    const totalFocusTimeEl = document.getElementById('total-focus-time');
    const totalPlantsEl = document.getElementById('total-plants');
    const perfectStreakEl = document.getElementById('perfect-streak');
    const successRateEl = document.getElementById('success-rate');
    const successProgressBar = document.getElementById('success-progress-bar');
    const historyListEl = document.getElementById('history-list');
    const clearHistoryButton = document.getElementById('clear-history-button');

    // --- Helper Functions ---
    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) {
            return '0h 0m';
        }
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }

    // --- Main Logic ---
    function loadStats() {
        chrome.storage.local.get(['sessionHistory', 'gardenPlants'], (result) => {
            const history = result.sessionHistory || [];
            const plants = result.gardenPlants || [];

            // --- Calculate Metrics ---
            const totalSessions = history.length;
            const totalFocusSeconds = history.reduce((total, session) => total + session.duration, 0);
            const pristineSessions = history.filter(session => session.wasPristine).length;

            let currentStreak = 0;
            for (let i = history.length - 1; i >= 0; i--) {
                if (history[i].wasPristine) {
                    currentStreak++;
                } else {
                    break; // Streak is broken
                }
            }

            const successRate = totalSessions > 0 ? Math.round((pristineSessions / totalSessions) * 100) : 0;

            // --- Update Summary ---
            totalSessionsEl.textContent = totalSessions;
            totalFocusTimeEl.textContent = formatTime(totalFocusSeconds);
            totalPlantsEl.textContent = plants.length;
            perfectStreakEl.textContent = currentStreak;
            successRateEl.textContent = `${successRate}%`;
            successProgressBar.style.width = `${successRate}%`;

            // --- Populate History List with Cards ---
            historyListEl.innerHTML = '';
            if (totalSessions === 0) {
                const emptyState = document.createElement('p');
                emptyState.textContent = 'Nenhuma sessão registrada ainda.';
                emptyState.style.textAlign = 'center';
                emptyState.style.color = 'var(--text-light)';
                historyListEl.appendChild(emptyState);
                return;
            }

            const reversedHistory = [...history].reverse();

            reversedHistory.forEach(session => {
                const card = document.createElement('div');
                card.className = 'session-card';

                const statusIcon = document.createElement('div');
                statusIcon.className = 'status-icon';
                statusIcon.textContent = session.wasPristine ? '🌳' : '🌱';

                const details = document.createElement('div');
                details.className = 'details';

                const task = document.createElement('div');
                task.className = 'task';
                task.textContent = session.task || 'Foco';

                const meta = document.createElement('div');
                meta.className = 'meta';
                meta.textContent = `${session.duration / 60} min`;

                details.appendChild(task);
                details.appendChild(meta);

                const date = document.createElement('div');
                date.className = 'date';
                date.textContent = new Date(session.completedAt).toLocaleDateString('pt-BR');

                card.appendChild(statusIcon);
                card.appendChild(details);
                card.appendChild(date);

                historyListEl.appendChild(card);
            });
        });
    }

    function clearHistory() {
        if (confirm('Você tem certeza que deseja apagar todo o histórico e seu jardim? Esta ação não pode ser desfeita.')) {
            chrome.storage.local.set({ sessionHistory: [], gardenPlants: [] }, () => {
                console.log('Histórico e jardim zerados.');
                loadStats();
            });
        }
    }

    clearHistoryButton.addEventListener('click', clearHistory);
    loadStats();
});
