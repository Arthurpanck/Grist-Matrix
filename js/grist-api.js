const GristModule = {
    async init() {
        console.log('🚀 Initialisation du widget Grist...');
        
        try {
            grist.ready({
                requiredAccess: 'full'
            });

            grist.onRecords(this.handleRecordsChange.bind(this));
            grist.onOptions(this.handleOptionsChange.bind(this));
            
            await this.loadOptions();
            
            AppState.isInitialized = true;
            console.log('✅ Module Grist initialisé');
            
        } catch (error) {
            console.error('❌ Erreur initialisation Grist:', error);
        }
    },

    async handleRecordsChange(records, mappings) {
        console.log('📊 Changement détecté:', records.length, 'enregistrements');
        
        AppState.gristData = records;
        AppState.currentMappings = mappings;
        
        const mappedRecords = mappings ? records.map(record => {
            const mapped = grist.mapColumnNames(record);
            return mapped || record;
        }) : records;
        
        if (AppState.triggerMode === 'new-row') {
            this.detectNewRows(mappedRecords);
        } else if (AppState.triggerMode === 'update') {
            this.detectUpdates(mappedRecords);
        } else if (AppState.triggerMode === 'conditional') {
            this.detectConditionalUpdates(mappedRecords);
        }
    },

    async handleOptionsChange(options) {
        console.log('⚙️ Options mises à jour:', options);
        
        if (options.matrixToken) {
            CONFIG.MATRIX_ACCESS_TOKEN = options.matrixToken;
        }
        
        if (options.triggerMode) {
            AppState.triggerMode = options.triggerMode;
        }
    },

    detectNewRows(records) {
        const currentCount = records.length;
        
        if (AppState.lastRowCount > 0 && currentCount > AppState.lastRowCount) {
            const newRowsCount = currentCount - AppState.lastRowCount;
            console.log(`🆕 ${newRowsCount} nouvelle(s) ligne(s) détectée(s)`);
            
            const newRows = records.slice(-newRowsCount);
            newRows.forEach(row => {
                this.triggerNotification(row, 'new-row');
            });
        }
        
        AppState.lastRowCount = currentCount;
    },

    detectUpdates(records) {
        const currentData = new Map();
        const updatedRows = [];
        
        records.forEach(record => {
            const key = record.id;
            const value = JSON.stringify(record);
            currentData.set(key, value);
            
            if (AppState.previousData.has(key)) {
                const previousValue = AppState.previousData.get(key);
                if (previousValue !== value) {
                    console.log(`🔄 Mise à jour détectée pour la ligne ${key}`);
                    updatedRows.push(record);
                }
            }
        });
        
        updatedRows.forEach(row => {
            this.triggerNotification(row, 'update');
        });
        
        AppState.previousData = currentData;
    },

    detectConditionalUpdates(records) {
        const currentData = new Map();
        
        records.forEach(record => {
            const key = record.id;
            const value = JSON.stringify(record);
            currentData.set(key, value);
            
            if (AppState.previousData.has(key)) {
                const previousRecord = JSON.parse(AppState.previousData.get(key));
                const currentRecord = record;
                
                if (previousRecord.Status !== 'Approuvé' && currentRecord.Status === 'Approuvé') {
                    console.log(`✅ Condition remplie pour la ligne ${key}`);
                    this.triggerNotification(currentRecord, 'conditional-update');
                }
            }
        });
        
        AppState.previousData = currentData;
    },

    async triggerNotification(record, triggerType) {
        if (AppState.isProcessing) {
            console.log('⏳ Traitement en cours...');
            return;
        }
        
        console.log(`🔔 Déclenchement de notification (${triggerType}):`, record);
        
        if (AppState.selectedIndividuals.length === 0 && AppState.selectedGroups.length === 0) {
            console.log('⚠️ Aucun destinataire configuré');
            return;
        }
        
        const body = document.getElementById('message-body')?.value;
        
        if (!body) {
            console.log('⚠️ Aucun message configuré');
            return;
        }
        
        const message = {
            subject: 'Notification Grist',
            body: this.parseTemplate(body, record),
            record: record,
            triggerType: triggerType,
            timestamp: new Date().toISOString()
        };
        
        await NotificationManager.sendNotifications(message);
    },

    parseTemplate(template, record) {
        let parsed = template;
        
        Object.keys(record).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            parsed = parsed.replace(regex, record[key] || '');
        });
        
        parsed = parsed.replace(/{{date}}/g, new Date().toLocaleDateString('fr-FR'));
        parsed = parsed.replace(/{{heure}}/g, new Date().toLocaleTimeString('fr-FR'));
        parsed = parsed.replace(/{{id}}/g, record.id || '');
        
        return parsed;
    },

    async loadOptions() {
        try {
            const options = await grist.getOptions();
            if (options) {
                CONFIG.MATRIX_ACCESS_TOKEN = options.matrixToken || '';
                AppState.selectedIndividuals = options.individuals || [];
                AppState.selectedGroups = options.groups || [];
                AppState.triggerMode = options.triggerMode || 'new-row';
            }
        } catch (error) {
            console.error('Erreur lors du chargement des options:', error);
        }
    },

    async saveOptions() {
        try {
            await grist.setOption('matrixToken', CONFIG.MATRIX_ACCESS_TOKEN);
            await grist.setOption('individuals', AppState.selectedIndividuals);
            await grist.setOption('groups', AppState.selectedGroups);
            await grist.setOption('triggerMode', AppState.triggerMode);
            
            console.log('✅ Options sauvegardées');
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des options:', error);
        }
    }
};
