// ========================================
// ### Module: Matrix API ###
// ========================================
const MatrixAPI = {
    /**
     * Headers pour les requêtes Matrix
     */
    getHeaders() {
        return {
            'Authorization': `Bearer ${CONFIG.MATRIX_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        };
    },

    // ========================================
    // ### SECTION 1: RECHERCHE ###
    // ========================================

    /**
     * Recherche un salon existant par son nom exact
     */
    async searchRoomByName(roomName) {
        console.log(`Recherche salon: "${roomName}"`);
        
        try {
            const syncFilter = {
                room: {
                    timeline: { limit: 0 },
                    state: { types: ["m.room.name"] },
                    ephemeral: { limit: 0 }
                },
                presence: { limit: 0 },
                account_data: { limit: 0 }
            };
            
            const url = new URL(`${CONFIG.MATRIX_HOMESERVER}/_matrix/client/${CONFIG.MATRIX_API_VERSION}/sync`);
            url.searchParams.append('filter', JSON.stringify(syncFilter));
            url.searchParams.append('timeout', '0');
            url.searchParams.append('full_state', 'true');
            
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders()
            });
            
            if (!response.ok) throw new Error(`Erreur sync: ${response.status}`);
            
            const syncData = await response.json();
            const joinedRooms = syncData.rooms?.join || {};
            
            for (const [roomId, roomData] of Object.entries(joinedRooms)) {
                const stateEvents = roomData.state?.events || [];
                const nameEvent = stateEvents.find(event => event.type === 'm.room.name');
                
                if (nameEvent && nameEvent.content.name?.toLowerCase() === roomName.toLowerCase()) {
                    console.log(`Salon existant trouvé: "${nameEvent.content.name}"`);
                    return {
                        room_id: roomId,
                        name: nameEvent.content.name
                    };
                }
            }
            
            console.log("Aucun salon existant trouvé avec ce nom.");
            return null;
            
        } catch (error) {
            console.error('Erreur recherche salon:', error);
            return null;
        }
    },

    /**
     * Recherche un utilisateur Matrix par nom pour obtenir son ID
     */
    async getMatrixIdByName(searchTerm) {
        console.log(`Recherche de l'utilisateur '${searchTerm}' pour obtenir son ID Matrix...`);
        
        const searchData = {
            search_term: searchTerm,
            limit: 1
        };
        
        const apiVersions = [CONFIG.MATRIX_API_VERSION, 'v3', 'r0'];
        
        for (const version of apiVersions) {
            try {
                const response = await fetch(
                    `${CONFIG.MATRIX_HOMESERVER}/_matrix/client/${version}/user_directory/search`,
                    {
                        method: 'POST',
                        headers: this.getHeaders(),
                        body: JSON.stringify(searchData)
                    }
                );
                
                if (response.ok) {
                    const data = await response.json();
                    const results = data.results || [];
                    
                    if (results.length > 0) {
                        const user = results[0];
                        console.log(`Utilisateur trouvé: ${user.display_name || 'Nom inconnu'} (${user.user_id})`);
                        return user;
                    } else {
                        console.log("Aucun utilisateur trouvé avec ce nom.");
                        return null;
                    }
                }
                
                if (response.status === 401) {
                    const urlWithToken = `${CONFIG.MATRIX_HOMESERVER}/_matrix/client/${version}/user_directory/search?access_token=${CONFIG.MATRIX_ACCESS_TOKEN}`;
                    const response2 = await fetch(urlWithToken, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(searchData)
                    });
                    
                    if (response2.ok) {
                        const data = await response2.json();
                        const results = data.results || [];
                        
                        if (results.length > 0) {
                            const user = results[0];
                            console.log(`Utilisateur trouvé: ${user.display_name || 'Nom inconnu'} (${user.user_id})`);
                            return user;
                        }
                    }
                }
                
            } catch (error) {
                console.error(`Erreur recherche API ${version}:`, error);
                continue;
            }
        }
        
        console.log("Aucun utilisateur trouvé avec ce nom.");
        return null;
    },

    // ========================================
    // ### SECTION 2: GESTION DES SALONS ###
    // ========================================

    /**
     * Crée un salon Matrix avec un utilisateur
     */
    async createRoom(matrixUserId, roomName) {
        console.log(`Création d'un salon avec '${matrixUserId}'...`);
        
        const roomData = {
            preset: "trusted_private_chat",
            is_direct: true,
            name: roomName,
            invite: [matrixUserId]
        };
        
        try {
            const response = await fetch(
                `${CONFIG.MATRIX_HOMESERVER}/_matrix/client/${CONFIG.MATRIX_API_VERSION}/createRoom`,
                {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify(roomData)
                }
            );
            
            if (!response.ok) {
                if (response.status === 401) {
                    const urlWithToken = `${CONFIG.MATRIX_HOMESERVER}/_matrix/client/${CONFIG.MATRIX_API_VERSION}/createRoom?access_token=${CONFIG.MATRIX_ACCESS_TOKEN}`;
                    const response2 = await fetch(urlWithToken, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(roomData)
                    });
                    
                    if (response2.ok) {
                        const data = await response2.json();
                        console.log(`Salon créé avec succès ! Room ID: ${data.room_id}`);
                        return data.room_id;
                    }
                }
                
                throw new Error(`Échec de la création du salon: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`Salon créé avec succès ! Room ID: ${data.room_id}`);
            return data.room_id;
            
        } catch (error) {
            console.error('Erreur lors de la création du salon:', error);
            throw error;
        }
    },

    /**
     * Récupère les membres d'un salon
     */
    async getRoomMembers(roomId) {
        try {
            const response = await fetch(
                `${CONFIG.MATRIX_HOMESERVER}/_matrix/client/${CONFIG.MATRIX_API_VERSION}/rooms/${roomId}/members`,
                {
                    method: 'GET',
                    headers: this.getHeaders()
                }
            );
            
            if (!response.ok) throw new Error(`Erreur récupération des membres: ${response.status}`);
            
            const data = await response.json();
            const members = [];
            
            for (const event of data.chunk || []) {
                if (event.content?.membership === 'join') {
                    members.push({
                        user_id: event.state_key,
                        display_name: event.content.displayname || event.state_key.split(':')[0].substring(1)
                    });
                }
            }
            
            return members;
            
        } catch (error) {
            console.error('Erreur lors de la récupération des membres:', error);
            return [];
        }
    },

    // ========================================
    // ### SECTION 3: ENVOI DE MESSAGES ###
    // ========================================

    /**
     * Envoie un message dans un salon
     */
    async sendMessage(roomId, message) {
        console.log(`Envoi message dans ${roomId}`);
        
        const messageData = {
            msgtype: "m.text",
            body: message.body,
            formatted_body: `<strong>${message.subject}</strong><br/>${message.body}`,
            format: "org.matrix.custom.html",
            metadata: {
                trigger_type: message.triggerType,
                timestamp: message.timestamp,
                grist_record_id: message.record?.id
            }
        };
        
        const txnId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            const response = await fetch(
                `${CONFIG.MATRIX_HOMESERVER}/_matrix/client/${CONFIG.MATRIX_API_VERSION}/rooms/${roomId}/send/m.room.message/${txnId}`,
                {
                    method: 'PUT',
                    headers: this.getHeaders(),
                    body: JSON.stringify(messageData)
                }
            );
            
            if (!response.ok) {
                if (response.status === 401) {
                    const urlWithToken = `${CONFIG.MATRIX_HOMESERVER}/_matrix/client/${CONFIG.MATRIX_API_VERSION}/rooms/${roomId}/send/m.room.message/${txnId}?access_token=${CONFIG.MATRIX_ACCESS_TOKEN}`;
                    const response2 = await fetch(urlWithToken, {
                        method: 'PUT',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(messageData)
                    });
                    
                    if (response2.ok) {
                        const data = await response2.json();
                        console.log(`Message envoyé: ${data.event_id}`);
                        return data.event_id;
                    }
                }
                
                throw new Error(`Erreur envoi message: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`Message envoyé: ${data.event_id}`);
            return data.event_id;
            
        } catch (error) {
            console.error('Erreur envoi message:', error);
            throw error;
        }
    }
};
