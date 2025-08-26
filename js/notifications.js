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
            
            // Traiter tous les destinataires (individuels et groupes) de la même façon
            const allRecipients = [...AppState.selectedIndividuals, ...AppState.selectedGroups];
            
            for (const recipient of allRecipients) {
                try {
                    await this.sendNotification(recipient, message);
                    results.success.push(recipient);
                } catch (error) {
                    console.error(`Erreur envoi à ${recipient.name}:`, error);
                    results.failed.push({...recipient, error: error.message});
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

    async sendNotification(recipient, message) {
        console.log(`Envoi à ${recipient.name || recipient.display_name}`);
        
        // 1. Créer le nom du salon selon votre format
        const roomName = `Alerte Grist : ${recipient.display_name || recipient.name}`;
        
        // 2. Chercher salon existant par nom
        let roomInfo = await MatrixAPI.searchRoomByName(roomName);
        
        if (roomInfo) {
            // Salon trouvé - récupérer les membres
            const members = await MatrixAPI.getRoomMembers(roomInfo.room_id);
            roomInfo.members = members;
            
            console.log(`Salon existant utilisé: ${roomInfo.name}`);
        } else {
            // 3. Si pas trouvé, chercher l'utilisateur par nom
            const userInfo = await MatrixAPI.getMatrixIdByName(recipient.display_name || recipient.name);
            if (!userInfo) {
                throw new Error(`Utilisateur Matrix non trouvé: ${recipient.name}`);
            }
            
            // 4. Créer le salon
            const roomId = await MatrixAPI.createRoom(userInfo.user_id, roomName);
            
            // 5. Récupérer les membres du nouveau salon
            const members = await MatrixAPI.getRoomMembers(roomId);
            
            roomInfo = {
                room_id: roomId,
                name: roomName,
                members: members
            };
            
            console.log(`Nouveau salon créé: ${roomInfo.name}`);
        }
        
        // 6. Sauvegarder dans l'état pour affichage
        recipient.roomId = roomInfo.room_id;
        recipient.roomName = roomInfo.name;
        recipient.members = roomInfo.members;
        
        // 7. Envoyer le message
        const eventId = await MatrixAPI.sendMessage(roomInfo.room_id, message);
        
        return { roomId: roomInfo.room_id, eventId, members: roomInfo.members };
    }
};
