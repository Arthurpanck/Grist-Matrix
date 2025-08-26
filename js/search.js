// === All Research Function ===
function openSearchModal(type) {
    console.log('Ouverture modal pour:', type);
    const modal = document.getElementById('search-modal');
    const title = document.querySelector('.modal-title');
    const searchInput = document.getElementById('modal-search-input');
    
    modal.dataset.searchType = type;
    title.textContent = type === 'individual' ? 'Rechercher un destinataire' : 'Rechercher un groupe';
    
    modal.classList.add('active');
    searchInput.value = '';
    searchInput.focus();
    
    loadInitialSuggestions(type);
}

function closeSearchModal() {
    console.log('Fermeture modal');
    const modal = document.getElementById('search-modal');
    modal.classList.remove('active');
    document.getElementById('search-results').innerHTML = '';
}

function loadInitialSuggestions(type) {
    console.log('Chargement suggestions pour:', type);
    const suggestions = type === 'individual' ? [
        { user_id: '@alice:example.com', display_name: 'Alice Dupont', avatar_url: null },
        { user_id: '@bob:example.com', display_name: 'Bob Martin', avatar_url: null },
        { user_id: '@charlie:example.com', display_name: 'Charlie Dubois', avatar_url: null }
    ] : [
        { id: 'group1', name: 'Équipe Dev', members: 5 },
        { id: 'group2', name: 'Support Client', members: 3 },
        { id: 'group3', name: 'Direction', members: 2 }
    ];
    
    displaySearchResults(suggestions, type);
}

function performSearch(query) {
    const type = document.getElementById('search-modal').dataset.searchType;
    const resultsContainer = document.getElementById('search-results');
    
    console.log('Recherche:', query, 'pour type:', type);
    
    if (!query) {
        loadInitialSuggestions(type);
        return;
    }
    
    resultsContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Recherche en cours...</div>';
    
    setTimeout(() => {
        const mockResults = type === 'individual' ? [
            { user_id: `@${query.toLowerCase()}:example.com`, display_name: `${query}`, avatar_url: null }
        ] : [
            { id: `group_${query}`, name: `Groupe ${query}`, members: Math.floor(Math.random() * 10) + 1 }
        ];
        
        displaySearchResults(mockResults, type);
    }, 500);
}

function displaySearchResults(results, type) {
    console.log('Affichage résultats:', results.length, 'pour type:', type);
    const resultsContainer = document.getElementById('search-results');
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Aucun résultat trouvé</div>';
        return;
    }
    
    resultsContainer.innerHTML = results.map(result => `
        <div class="search-result-item" onclick="selectSearchResult(${JSON.stringify(result).replace(/"/g, '&quot;')}, '${type}')">
            <div class="user-avatar">${getInitials(result.display_name || result.name)}</div>
            <div>
                <div style="font-weight: 500;">${result.display_name || result.name}</div>
                <div style="font-size: 12px; color: #666;">${result.user_id || (result.members ? `${result.members} membres` : '')}</div>
            </div>
        </div>
    `).join('');
}

function selectSearchResult(result, type) {
    console.log('Sélection:', result, 'type:', type);
    
    if (type === 'individual') {
        if (!AppState.selectedIndividuals.some(r => r.user_id === result.user_id)) {
            AppState.selectedIndividuals.push(result);
            addRecipientTag(document.getElementById('individual-recipients'), result, 'individual');
            showToast(`${result.display_name} ajouté`, 'success');
        } else {
            showToast('Destinataire déjà ajouté', 'info');
        }
    } else {
        if (!AppState.selectedGroups.some(r => r.id === result.id)) {
            AppState.selectedGroups.push(result);
            addRecipientTag(document.getElementById('group-recipients'), result, 'group');
            showToast(`Groupe ${result.name} ajouté`, 'success');
        } else {
            showToast('Groupe déjà ajouté', 'info');
        }
    }
    
    closeSearchModal();
}

// === INITIALISATION ===
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initialisation...');
    
    // Onglets
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${targetTab}-tab`) {
                    content.classList.add('active');
                }
            });
        });
    });

    // Options de déclenchement
    const triggerOptions = document.querySelectorAll('.trigger-option');
    triggerOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            triggerOptions.forEach(opt => {
                opt.classList.remove('selected');
                opt.querySelector('input[type="radio"]').checked = false;
            });
            
            option.classList.add('selected');
            const radio = option.querySelector('input[type="radio"]');
            radio.checked = true;
            AppState.triggerMode = radio.value;
            
            showToast(`Mode: ${radio.nextElementSibling.textContent}`, 'info');
        });
    });

    // Boutons d'ajout de destinataires
    const addBtns = document.querySelectorAll('.add-recipient-btn');
    console.log(`Trouvé ${addBtns.length} boutons d'ajout`);
    
    addBtns.forEach((btn, index) => {
        const type = btn.dataset.type;
        console.log(`Bouton ${index}: type="${type}"`);
        
        btn.addEventListener('click', function(e) {
            console.log(`Clic sur bouton ${type}`);
            e.preventDefault();
            e.stopPropagation();
            openSearchModal(type);
        });
    });

    // Modal
    const modal = document.getElementById('search-modal');
    const closeBtn = document.getElementById('close-modal');
    const searchInput = document.getElementById('modal-search-input');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeSearchModal);
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeSearchModal();
            }
        });
    }

    // Recherche
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performSearch(e.target.value);
            }, 300);
        });
    }
});
