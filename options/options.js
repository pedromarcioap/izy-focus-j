const newSiteInput = document.getElementById('new-site-input');
const addSiteButton = document.getElementById('add-site-button');
const blockListUl = document.getElementById('block-list');
const predefinedListsDiv = document.getElementById('predefined-lists');

const PREDEFINED_LISTS = {
    'Redes Sociais': ['youtube.com', 'facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'reddit.com'],
    'Notícias': ['g1.globo.com', 'uol.com.br', 'cnnbrasil.com.br', 'folha.uol.com.br', 'estadao.com.br'],
    'Streaming': ['netflix.com', 'primevideo.com', 'disneyplus.com', 'hulu.com', 'hbomax.com']
};

// --- Single Source of Truth: blockList ---

async function updateStorageAndRender(newBlockList) {
    // Determine which predefined categories are selected based on the new block list
    const newSelectedCategories = [];
    for (const category in PREDEFINED_LISTS) {
        const allSitesPresent = PREDEFINED_LISTS[category].every(site => newBlockList.includes(site));
        if (allSitesPresent) {
            newSelectedCategories.push(category);
        }
    }

    // Save the updated list and categories
    await chrome.storage.local.set({
        blockList: newBlockList,
        selectedCategories: newSelectedCategories
    });

    // Re-render the entire UI from the new state
    renderPredefinedLists(newSelectedCategories);
    renderCustomBlockList(newBlockList);
}

// --- Render Functions ---

function renderCustomBlockList(list) {
    blockListUl.innerHTML = '';
    if (list && list.length > 0) {
        list.forEach((site, index) => {
            const li = document.createElement('li');
            li.textContent = site;
            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remover';
            removeButton.className = 'remove-button';
            removeButton.dataset.index = index;
            li.appendChild(removeButton);
            blockListUl.appendChild(li);
        });
    } else {
        blockListUl.innerHTML = '<li>Nenhum site na lista de bloqueio.</li>';
    }
}

function renderPredefinedLists(selectedCategories = []) {
    predefinedListsDiv.innerHTML = '';
    for (const category in PREDEFINED_LISTS) {
        const item = document.createElement('div');
        item.className = 'predefined-list-item';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = category;
        checkbox.name = category;
        checkbox.checked = selectedCategories.includes(category);
        const label = document.createElement('label');
        label.htmlFor = category;
        label.textContent = category;
        item.appendChild(checkbox);
        item.appendChild(label);
        predefinedListsDiv.appendChild(item);
    }
}

// --- Event Handlers ---

async function handlePredefinedListChange(event) {
    const category = event.target.name;
    const isChecked = event.target.checked;

    const sitesForCategory = PREDEFINED_LISTS[category];
    const data = await chrome.storage.local.get(['blockList']);
    let currentBlockList = data.blockList || [];

    if (isChecked) {
        // Add category sites to blocklist (avoiding duplicates)
        sitesForCategory.forEach(site => {
            if (!currentBlockList.includes(site)) {
                currentBlockList.push(site);
            }
        });
    } else {
        // Remove category sites from blocklist
        currentBlockList = currentBlockList.filter(site => !sitesForCategory.includes(site));
    }

    await updateStorageAndRender(currentBlockList);
}

async function addSite() {
    const newSite = newSiteInput.value.trim();
    if (!newSite) return;

    const data = await chrome.storage.local.get(['blockList']);
    const currentBlockList = data.blockList || [];

    if (currentBlockList.includes(newSite)) {
        alert('Este site já está na lista.');
        return;
    }

    currentBlockList.push(newSite);
    newSiteInput.value = '';
    await updateStorageAndRender(currentBlockList);
}

async function removeSite(indexToRemove) {
    const data = await chrome.storage.local.get(['blockList']);
    const currentBlockList = data.blockList || [];

    const newList = currentBlockList.filter((_, index) => index !== indexToRemove);

    await updateStorageAndRender(newList);
}

// --- Initial Load ---

async function loadInitialState() {
    const data = await chrome.storage.local.get(['blockList']);
    await updateStorageAndRender(data.blockList || []);
}

// --- Attach Event Listeners ---

document.addEventListener('DOMContentLoaded', loadInitialState);
addSiteButton.addEventListener('click', addSite);
predefinedListsDiv.addEventListener('change', handlePredefinedListChange);

blockListUl.addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-button')) {
        const index = parseInt(event.target.dataset.index, 10);
        removeSite(index);
    }
});

newSiteInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        addSite();
    }
});
