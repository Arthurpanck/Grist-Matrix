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

    /**
     * Recherche des utilisateurs Matrix
     */
    async searchUsers(searchTerm) {
        console.log(`🔍 Recherche Matrix: "${searchTerm}"`);
        
        const searchData = {
            search_term: searchTerm,
            limit: 20
        };
        
        // Essayer différentes versions d'API
        const apiVersions = [CONFIG.MATRIX_API_VERSION, 'v3', 'r0'];
        
        for (const version of apiVersions) {
            try {
                const response = await fetch(
                    `${CONFIG.MATRIX_HOMESERVER}/_matrix/client/${version}/user_directory/search`,
                    {
                        method: 'POST',
                        headers: this.getHeaders(),
                        body: JSON.stringify(searchData),
                        timeout: CONFIG.API_TIMEOUT
                    }
                );
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`✅ ${data.results.length} utilisateur(s) trouvé(s)`);
                    return data.results;
                }
                
                // Si 401, essayer avec token en query parameter
                if (response.status === 401) {
                    const urlWithToken = `${CONFIG.MATRIX_HOMESERVER}/_matrix/client/${version}/user_directory/search?access_token=${CONFIG.MATRIX_ACCESS_TOKEN}`;
                    const response2 = await fetch(urlWithToken, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(searchData)
                    });
                    
                    if (response2.ok) {
                        const data = await response2.json();
                        return data.results;
                    }
                }
                
            } catch (error) {
                console.error(`Erreur recherche API ${version}:`, error);
                continue;
            }
        }
        
        return [];
    },

    /**
     * Crée un salon Matrix
     */
    async createRoom(userId, roomName = null) {
        console.log(`🏠 Création d'un salon avec ${userId}`);
        
        // Vérifier le cache
        const cacheKey = `room_${userId}`;
        if (AppState.roomCache.has(cacheKey)) {
            console.log('📦 Salon trouvé dans le cache');
            return AppState.roomCache.get(cacheKey);
        }
        
        const roomData = {
            preset: "trusted_private_chat",
            is_direct: true,
            invite: [userId],
            name: roomName || `Notification - ${new Date().toLocaleDateString('fr-FR')}`
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
                // Retry avec token en query parameter si 401
                if (response.status === 401) {
                    const urlWithToken = `${CONFIG.MATRIX_HOMESERVER}/_matrix/client/${CONFIG.MATRIX_API_VERSION}/createRoom?access_token=${CONFIG.MATRIX_ACCESS_TOKEN}`;
                    const response2 = await fetch(urlWithToken, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(roomData)
                    });
                    
                    if (response2.ok) {
                        const data = await response2.json();
                        AppState.roomCache.set(cacheKey, data.room_id);
                        return data.room_id;
                    }
                }
                
                throw new Error(`Erreur création salon: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`✅ Salon créé: ${data.room_id}`);
            
            // Mettre en cache
            AppState.roomCache.set(cacheKey, data.room_id);
            
            return data.room_id;
            
        } catch (error) {
            console.error('Erreur création salon:', error);
            throw error;
        }
    },

    /**
     * Crée un salon de groupe
     */
    async createGroupRoom(groupName, memberIds = []) {
        console.log(`👥 Création d'un salon de groupe: ${groupName}`);
        
        const roomData = {
            preset: "private_chat",
            name: groupName,
            topic: `Groupe de notification: ${groupName}`,
            invite: memberIds,
            initial_state: [
                {
                    type: "m.room.guest_access",
                    state_key: "",
                    content: {
                        guest_access: "forbidden"
                    }
                }
            ]
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
                throw new Error(`Erreur création salon groupe: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`✅ Salon groupe créé: ${data.room_id}`);
            
            return data.room_id;
            
        } catch (error) {
            console.error('Erreur création salon groupe:', error);
            throw error;
        }
    },

    /**
     * Envoie un message dans un salon
     */
    async sendMessage(roomId, message) {
        console.log(`📨 Envoi message dans ${roomId}`);
        
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
                // Retry avec token en query parameter si 401
                if (response.status === 401) {
                    const urlWithToken = `${CONFIG.MATRIX_HOMESERVER}/_matrix/client/${CONFIG.MATRIX_API_VERSION}/rooms/${roomId}/send/m.room.message/${txnId}?access_token=${CONFIG.MATRIX_ACCESS_TOKEN}`;
                    const response2 = await fetch(urlWithToken, {
                        method: 'PUT',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(messageData)
                    });
                    
                    if (response2.ok) {
                        const data = await response2.json();
                        console.log(`✅ Message envoyé: ${data.event_id}`);
                        return data.event_id;
                    }
                }
                
                throw new Error(`Erreur envoi message: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`✅ Message envoyé: ${data.event_id}`);
            return data.event_id;
            
        } catch (error) {
            console.error('Erreur envoi message:', error);
            throw error;
        }
    },

    /**
     * Récupère les salons rejoints
     */
    async getJoinedRooms() {
        try {
            const response = await fetch(
                `${CONFIG.MATRIX_HOMESERVER}/_matrix/client/${CONFIG.MATRIX_API_VERSION}/joined_rooms`,
                {
                    method: 'GET',
                    headers: this.getHeaders()
                }
            );
            
            if (!response.ok) {
                throw new Error(`Erreur récupération salons: ${response.status}`);
            }
            
            const data = await response.json();
            return data.joined_rooms || [];
            
        } catch (error) {
            console.error('Erreur récupération salons:', error);
            return [];
        }
    },

    /**
     * Invite un utilisateur dans un salon
     */
    async inviteToRoom(roomId, userId) {
        console.log(`➕ Invitation de ${userId} dans ${roomId}`);
        
        try {
            const response = await fetch(
                `${CONFIG.MATRIX_HOMESERVER}/_matrix/client/${CONFIG.MATRIX_API_VERSION}/rooms/${roomId}/invite`,
                {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify({ user_id: userId })
                }
            );
            
            if (!response.ok) {
                throw new Error(`Erreur invitation: ${response.status}`);
            }
            
            console.log(`✅ ${userId} invité avec succès`);
            return true;
            
        } catch (error) {
            console.error('Erreur invitation:', error);
            return false;
        }
    },

    /**
     * Récupère les informations d'un salon
     */
    async getRoomInfo(roomId) {
        try {
            const response = await fetch(
                `${CONFIG.MATRIX_HOMESERVER}/_matrix/client/${CONFIG.MATRIX_API_VERSION}/rooms/${roomId}/state`,
                {
                    method: 'GET',
                    headers: this.getHeaders()
                }
            );
            
            if (!response.ok) {
                throw new Error(`Erreur récupération info salon: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
            
        } catch (error) {
            console.error('Erreur récupération info salon:', error);
            return null;
        }
    },

    /**
     * Vérifie si un salon existe déjà avec un utilisateur
     */
    async findDirectRoom(userId) {
        try {
            const rooms = await this.getJoinedRooms();
            
            // Pour chaque salon, vérifier s'il s'agit d'un salon direct avec l'utilisateur
            for (const roomId of rooms) {
                const roomInfo = await this.getRoomInfo(roomId);
                
                // Vérifier si c'est un salon direct avec l'utilisateur spécifié
                const members = roomInfo.filter(event => event.type === 'm.room.member');
                const isDirect = members.length === 2 && 
                                members.some(m => m.state_key === userId);
                
                if (isDirect) {
                    console.log(`📦 Salon direct existant trouvé: ${roomId}`);
                    return roomId;
                }
            }
            
            return null;
            
        } catch (error) {
            console.error('Erreur recherche salon direct:', error);
            return null;
        }
    }
};