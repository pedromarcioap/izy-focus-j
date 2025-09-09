document.addEventListener('DOMContentLoaded', () => {
    const totalSessionsEl = document.getElementById('total-sessions');
    const totalFocusTimeEl = document.getElementById('total-focus-time');
    const totalTreesEl = document.getElementById('total-trees');
    const historyTableBodyEl = document.getElementById('history-table-body');
    const clearHistoryButton = document.getElementById('clear-history-button');

    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) {
            return '0h 0m';
        }
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }

    function loadStats() {
        chrome.storage.local.get(['sessionHistory', 'treesPlanted'], (result) => {
            const history = result.sessionHistory || [];
            const trees = result.treesPlanted || 0;

            // --- Update Summary ---
            totalSessionsEl.textContent = history.length;
            totalTreesEl.textContent = trees;

            const totalFocusSeconds = history.reduce((total, session) => total + session.duration, 0);
            totalFocusTimeEl.textContent = formatTime(totalFocusSeconds);

            // --- Populate History Table ---
            historyTableBodyEl.innerHTML = ''; // Clear existing rows
            if (history.length === 0) {
                historyTableBodyEl.innerHTML = '<tr><td colspan="3" style="text-align:center;">Nenhuma sessão registrada ainda.</td></tr>';
                return;
            }

            // Sort history from most recent to oldest
            history.sort((a, b) => b.completedAt - a.completedAt);

            history.forEach(session => {
                const row = document.createElement('tr');

                const taskCell = document.createElement('td');
                taskCell.textContent = session.task;

                const durationCell = document.createElement('td');
                durationCell.textContent = `${session.duration / 60} min`;

                const dateCell = document.createElement('td');
                dateCell.textContent = new Date(session.completedAt).toLocaleDateString('pt-BR', {
                    year: 'numeric', month: 'long', day: 'numeric'
                });

                row.appendChild(taskCell);
                row.appendChild(durationCell);
                row.appendChild(dateCell);

                historyTableBodyEl.appendChild(row);
            });
        });
    }

    function clearHistory() {
        if (confirm('Você tem certeza que deseja apagar todo o histórico? Esta ação não pode ser desfeita.')) {
            chrome.storage.local.set({ sessionHistory: [], treesPlanted: 0 }, () => {
                console.log('Histórico e árvores zerados.');
                loadStats(); // Refresh the view
            });
        }
    }

    clearHistoryButton.addEventListener('click', clearHistory);

    // Initial load
    loadStats();
});
