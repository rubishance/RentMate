/**
 * RentMate Database Operations with User Authentication
 * Helper functions to ensure user_id is included in all database operations
 */

/**
 * Add user_id to data object for insert operations
 * @param {Object} data - Data to insert
 * @returns {Promise<Object>} Data with user_id added
 */
async function addUserIdToData(data) {
    const userId = await getUserId();
    if (!userId) {
        throw new Error('User not authenticated');
    }
    return { ...data, user_id: userId };
}

/**
 * Wrapper for adding property with user_id
 */
async function addPropertyWithAuth(propertyData) {
    const dataWithUser = await addUserIdToData(propertyData);
    return await window.supabaseService.add('properties', dataWithUser);
}

/**
 * Wrapper for adding tenant with user_id
 */
async function addTenantWithAuth(tenantData) {
    const dataWithUser = await addUserIdToData(tenantData);
    return await window.supabaseService.add('tenants', dataWithUser);
}

/**
 * Wrapper for adding contract with user_id
 */
async function addContractWithAuth(contractData) {
    const dataWithUser = await addUserIdToData(contractData);
    return await window.supabaseService.add('contracts', dataWithUser);
}

/**
 * Wrapper for adding file with user_id
 */
async function addFileWithAuth(fileData) {
    const dataWithUser = await addUserIdToData(fileData);
    return await window.supabaseService.add('files', dataWithUser);
}

/**
 * Wrapper for adding settings with user_id
 */
async function addSettingsWithAuth(settingsData) {
    const dataWithUser = await addUserIdToData(settingsData);
    return await window.supabaseService.add('settings', dataWithUser);
}

// Export to global scope
window.addUserIdToData = addUserIdToData;
window.addPropertyWithAuth = addPropertyWithAuth;
window.addTenantWithAuth = addTenantWithAuth;
window.addContractWithAuth = addContractWithAuth;
window.addFileWithAuth = addFileWithAuth;
window.addSettingsWithAuth = addSettingsWithAuth;
