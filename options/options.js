const newSiteInput = document.getElementById('new-site-input');
const addSiteButton = document.getElementById('add-site-button');
const blockListUl = document.getElementById('block-list');

// --- Functions ---

function renderBlockList(list) {
    blockListUl.innerHTML = ''; // Clear current list
    if (list && list.length > 0) {
        list.forEach((site, index) => {
            const li = document.createElement('li');
            li.textContent = site;

            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remover';
            removeButton.className = 'remove-button';
            removeButton.dataset.index = index; // Store index for removal

            li.appendChild(removeButton);
            blockListUl.appendChild(li);
        });
    } else {
        blockListUl.innerHTML = '<li>Nenhum site na lista de bloqueio.</li>';
    }
}

async function loadBlockList() {
    const result = await chrome.storage.local.get(['blockList']);
    renderBlockList(result.blockList || []);
}

async function addSite() {
    const newSite = newSiteInput.value.trim();
    if (!newSite) return; // Ignore empty input

    const result = await chrome.storage.local.get(['blockList']);
    const currentList = result.blockList || [];

    if (currentList.includes(newSite)) {
        alert('Este site já está na lista.');
        return;
    }

    const newList = [...currentList, newSite];
    await chrome.storage.local.set({ blockList: newList });

    newSiteInput.value = ''; // Clear input
    loadBlockList(); // Re-render the list
}

async function removeSite(indexToRemove) {
    const result = await chrome.storage.local.get(['blockList']);
    const currentList = result.blockList || [];

    const newList = currentList.filter((_, index) => index !== indexToRemove);

    await chrome.storage.local.set({ blockList: newList });
    loadBlockList(); // Re-render the list
}


// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', loadBlockList);

addSiteButton.addEventListener('click', addSite);

// Use event delegation for remove buttons
blockListUl.addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-button')) {
        const index = parseInt(event.target.dataset.index, 10);
        removeSite(index);
    }
});

// Allow adding with Enter key
newSiteInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        addSite();
    }
});
