const NotificationManager = {
    async sendNotifications(message) {
        if (AppState.isProcessing) {
            console.log('Une notification est déjà en cours d\'envoi');
            return;
        }
        
        AppState.isProcessing = true;
        
        try {
            const results = {
                success: [],
                failed: []
            };
            
            // Traiter les destinataires individuels
            for (const recipient of AppState.selectedIndividuals) {
                try {
                    await this.sendToIndividual(recipient, message);
                    results.success.push(recipient);
                } catch (error) {
                    console.error(`Erreur envoi à ${recipient.name}:`, error);
                    results.failed.push({...recipient, error: error.message});
                }
            }
            
            // Traiter les groupes
            for (const group of AppState.selectedGroups) {
                try {
                    await this.sendToGroup(group, message);
                    results.success.push(group);
                } catch (error) {
                    console.error(`Erreur envoi au groupe ${group.name}:`, error);
                    results.failed.push({...group, error: error.message});
                }
            }
            
            console.log(`Notifications envoyées: ${results.success.length} succès, ${results.failed.length} échecs`);
            return results;
            
        } catch (error) {
            console.error('Erreur globale:', error);
        } finally {
            AppState.isProcessing = false;
        }
    },

    async sendToIndividual(recipient, message) {
        console.log(`📤 Envoi à ${recipient.name}`);
        
        let roomId = recipient.roomId;
        
        if (!roomId) {
            let matrixId = recipient.matrixId;
            
            if (!matrixId) {
                const users = await MatrixAPI.searchUsers(recipient.email || recipient.name);
                if (users.length === 0) {
                    throw new Error(`Utilisateur Matrix non trouvé: ${recipient.name}`);
                }
                matrixId = users[0].user_id;
                recipient.matrixId = matrixId;
            }
            
            roomId = await MatrixAPI.findDirectRoom(matrixId);
            
            if (!roomId) {
                roomId = await MatrixAPI.createRoom(matrixId, `Notifications - ${recipient.name}`);
            }
            
            recipient.roomId = roomId;
        }
        
        const eventId = await MatrixAPI.sendMessage(roomId, message);
        return { roomId, eventId };
    },

    async sendToGroup(group, message) {
        console.log(`📤 Envoi au groupe ${group.name}`);
        
        let roomId = group.roomId;
        
        if (!roomId) {
            const memberIds = [];
            
            if (group.members && group.members.length > 0) {
                for (const member of group.members) {
                    if (member.matrixId) {
                        memberIds.push(member.matrixId);
                    } else if (member.email || member.name) {
                        const users = await MatrixAPI.searchUsers(member.email || member.name);
                        if (users.length > 0) {
                            memberIds.push(users[0].user_id);
                        }
                    }
                }
            }
            
            roomId = await MatrixAPI.createGroupRoom(group.name, memberIds);
            group.roomId = roomId;
        }
        
        const eventId = await MatrixAPI.sendMessage(roomId, message);
        return { roomId, eventId };
    }
};