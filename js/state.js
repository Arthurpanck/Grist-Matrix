const AppState = {
    selectedIndividuals: [],
    selectedGroups: [],
    triggerMode: 'new-row',
    lastRowCount: 0,
    previousData: new Map(),
    roomCache: new Map(), // Cache des salons créés
    isProcessing: false,
    matrixUsers: [], // Cache des utilisateurs Matrix
    gristData: null,
    currentMappings: null,
    isInitialized: false,
};