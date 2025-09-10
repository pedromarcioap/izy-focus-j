document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const totalSessionsEl = document.getElementById('total-sessions');
    const totalFocusTimeEl = document.getElementById('total-focus-time');
    const totalPlantsEl = document.getElementById('total-plants');
    const perfectStreakEl = document.getElementById('perfect-streak');
    const successRateEl = document.getElementById('success-rate');
    const historyTableBodyEl = document.getElementById('history-table-body');
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

            // --- Populate History Table ---
            historyTableBodyEl.innerHTML = '';
            if (totalSessions === 0) {
                historyTableBodyEl.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhuma sessão registrada ainda.</td></tr>';
                return;
            }

            const reversedHistory = [...history].reverse();

            reversedHistory.forEach(session => {
                const row = document.createElement('tr');

                const statusCell = document.createElement('td');
                statusCell.textContent = session.wasPristine ? '🌳' : '🌱';

                const taskCell = document.createElement('td');
                taskCell.textContent = session.task;

                const durationCell = document.createElement('td');
                durationCell.textContent = `${session.duration / 60} min`;

                const dateCell = document.createElement('td');
                dateCell.textContent = new Date(session.completedAt).toLocaleDateString('pt-BR', {
                    year: 'numeric', month: 'long', day: 'numeric'
                });

                row.appendChild(statusCell);
                row.appendChild(taskCell);
                row.appendChild(durationCell);
                row.appendChild(dateCell);

                historyTableBodyEl.appendChild(row);
            });
        });
    }

    function clearHistory() {
        if (confirm('Você tem certeza que deseja apagar todo o histórico e seu jardim? Esta ação não pode ser desfeita.')) {
            // Clear stats and the garden
            chrome.storage.local.set({ sessionHistory: [], gardenPlants: [] }, () => {
                console.log('Histórico e jardim zerados.');
                loadStats();
            });
        }
    }

    clearHistoryButton.addEventListener('click', clearHistory);
    loadStats();
});
