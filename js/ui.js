// === INITIALISATION ===
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, initialisation...');
    
    // Initialiser Grist
    await GristModule.init();
    
    // Vérifier si le token est configuré
    if (!CONFIG.MATRIX_ACCESS_TOKEN) {
        document.getElementById('config-section').style.display = 'block';
    }
    
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

    // Bouton d'envoi
    const sendBtn = document.getElementById('send-notification');
    if (sendBtn) {
        sendBtn.addEventListener('click', async () => {
            const message = document.getElementById('message-body').value.trim();
            
            if (!message) {
                showToast('Veuillez saisir un message', 'error');
                return;
            }
            
            if (AppState.selectedIndividuals.length === 0 && AppState.selectedGroups.length === 0) {
                showToast('Veuillez sélectionner au moins un destinataire', 'error');
                return;
            }
            
            // Déclencher le workflow complet
            const messageObject = {
                subject: 'Notification Grist',
                body: message,
                triggerType: 'manual',
                timestamp: new Date().toISOString()
            };
            
            await NotificationManager.sendNotifications(messageObject);
        });
    }

    // Configuration Matrix
    const saveTokenBtn = document.getElementById('save-token-btn');
    if (saveTokenBtn) {
        saveTokenBtn.addEventListener('click', async () => {
            const tokenInput = document.getElementById('matrix-token-input');
            const token = tokenInput.value.trim();
            
            if (!token) {
                showToast('Veuillez entrer un token valide', 'error');
                return;
            }
            
            // Mettre à jour la config
            CONFIG.MATRIX_ACCESS_TOKEN = token;
            
            // Sauvegarder dans Grist
            await GristModule.saveOptions();
            
            showToast('Token Matrix sauvegardé', 'success');
            document.getElementById('config-section').style.display = 'none';
        });
    }

    console.log('Initialisation terminée');
});
