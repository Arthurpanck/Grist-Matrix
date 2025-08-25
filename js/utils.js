// === FONCTIONS UTILITAIRES ===
function showToast(message, type = 'info') {
    console.log('Toast:', message, type);
    const toast = document.getElementById('notification-toast');
    const messageEl = document.getElementById('toast-message');
    
    messageEl.textContent = message;
    toast.className = `notification-toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function getInitials(name) {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
}

function addRecipientTag(container, recipient, type) {
    const tag = document.createElement('div');
    tag.className = `recipient-tag ${type === 'group' ? 'group' : ''}`;
    tag.innerHTML = `
        ${recipient.name || recipient.display_name || 'Inconnu'}
        <button class="remove-btn" onclick="removeRecipient('${recipient.user_id || recipient.id}', '${type}')">&times;</button>
    `;
    
    const addBtn = container.querySelector('.add-recipient-btn');
    container.insertBefore(tag, addBtn);
}

function removeRecipient(id, type) {
    if (type === 'individual') {
        AppState.selectedIndividuals = AppState.selectedIndividuals.filter(r => r.user_id !== id && r.id !== id);
        updateRecipientsDisplay('individual-recipients', AppState.selectedIndividuals, 'individual');
    } else {
        AppState.selectedGroups = AppState.selectedGroups.filter(r => r.user_id !== id && r.id !== id);
        updateRecipientsDisplay('group-recipients', AppState.selectedGroups, 'group');
    }
    showToast('Destinataire supprimé', 'info');
}

function updateRecipientsDisplay(containerId, recipients, type) {
    const container = document.getElementById(containerId);
    const existingTags = container.querySelectorAll('.recipient-tag');
    existingTags.forEach(tag => tag.remove());
    
    recipients.forEach(recipient => {
        addRecipientTag(container, recipient, type);
    });
}