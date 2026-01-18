/**
 * RentMate IndexedDB Wrapper
 * Provides offline storage for contracts, properties, tenants, and settings
 */

class RentMateDB {
    constructor() {
        this.dbName = 'RentMateDB';
        this.version = 2; // Bump version for payments store
        this.db = null;
    }

    /**
     * Initialize the database
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('Database failed to open');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database opened successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                this.db = event.target.result;

                // Create object stores if they don't exist
                if (!this.db.objectStoreNames.contains('contracts')) {
                    const contractStore = this.db.createObjectStore('contracts', { keyPath: 'id', autoIncrement: true });
                    contractStore.createIndex('property', 'property', { unique: false });
                    contractStore.createIndex('tenant', 'tenant', { unique: false });
                    contractStore.createIndex('status', 'status', { unique: false });
                }

                if (!this.db.objectStoreNames.contains('properties')) {
                    const propertyStore = this.db.createObjectStore('properties', { keyPath: 'id', autoIncrement: true });
                    propertyStore.createIndex('address', 'address', { unique: false });
                    propertyStore.createIndex('status', 'status', { unique: false });
                }

                if (!this.db.objectStoreNames.contains('tenants')) {
                    const tenantStore = this.db.createObjectStore('tenants', { keyPath: 'id', autoIncrement: true });
                    tenantStore.createIndex('name', 'name', { unique: false });
                    tenantStore.createIndex('property', 'property', { unique: false });
                }

                if (!this.db.objectStoreNames.contains('settings')) {
                    this.db.createObjectStore('settings', { keyPath: 'key' });
                }

                if (!this.db.objectStoreNames.contains('files')) {
                    const fileStore = this.db.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
                    fileStore.createIndex('contractId', 'contractId', { unique: false });
                    fileStore.createIndex('type', 'type', { unique: false });
                }

                // NEW: Payments Store
                if (!this.db.objectStoreNames.contains('payments')) {
                    const paymentStore = this.db.createObjectStore('payments', { keyPath: 'id', autoIncrement: true });
                    paymentStore.createIndex('contractId', 'contractId', { unique: false });
                    paymentStore.createIndex('date', 'date', { unique: false }); // Payment Due Date
                    paymentStore.createIndex('status', 'status', { unique: false });
                }

                console.log('Database setup complete');
            };
        });
    }

    /**
     * Helper to ensure DB is initialized
     */


    /**
     * Helper to ensure DB is initialized
     */
    async _ensureInit() {
        if (!this.db) {
            console.log('Database not initialized, initializing now...');
            await this.init();
        }
        return this.db;
    }

    /**
     * Generic add method
     */
    async add(storeName, data) {
        await this._ensureInit();

        // Cloud Sync: If enabled, try cloud first
        let finalId = null;
        let synced = false;

        // Cloud Sync: If enabled, try cloud first
        if (CONFIG.ENABLE_CLOUD_SYNC && window.supabaseService) {
            try {
                // Create a timeout promise (e.g., 5 seconds)
                const timeout = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Cloud request timed out')), 5000)
                );

                // Race the actual request against the timeout
                const { data: cloudData, error } = await Promise.race([
                    window.supabaseService.add(storeName, data),
                    timeout
                ]);

                if (!error && cloudData && cloudData[0]) {
                    finalId = cloudData[0].id; // Capture Cloud ID
                    synced = true;
                } else {
                    console.error('Cloud add failed, falling back to local:', error);
                }
            } catch (err) {
                console.warn('Cloud sync skipped due to timeout or error:', err);
            }
        }

        // Local Storage (Always Run - Ensure Persistence)
        // If we got a cloud ID, we want to update the data object with it, 
        // effectively replacing the 'pending' state with a 'synced' state.
        if (synced && finalId) {
            data.id = finalId;
            data.synced = true;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const objectStore = transaction.objectStore(storeName);

            // We use put() because if we have a specific ID (from Cloud), we want to use it.
            // If we don't (add failed or timed out), we let IndexedDB generate one.
            const request = objectStore.put(data);

            request.onsuccess = () => {
                // Return the ID that was used (Cloud ID or Local ID)
                resolve(finalId || request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });


    }

    /**
     * Generic get method
     */
    async get(storeName, id) {
        await this._ensureInit();

        // 1. Try Local First
        try {
            const localItem = await new Promise((resolve, reject) => {
                const transaction = this.db.transaction([storeName], 'readonly');
                const objectStore = transaction.objectStore(storeName);
                const request = objectStore.get(id);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            if (localItem) return localItem;
        } catch (e) {
            console.warn('Local get failed:', e);
        }

        // 2. Try Cloud (if enabled)
        if (CONFIG.ENABLE_CLOUD_SYNC && window.supabaseService) {
            try {
                const timeout = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Cloud get timed out')), 4000)
                );

                // Use getOne wrapper or direct client? supabaseService has getOne
                const result = await Promise.race([
                    window.supabaseService.getOne(storeName, id),
                    timeout
                ]);

                if (result) return result;
            } catch (err) {
                console.warn('Cloud get skipped due to timeout:', err);
            }
        }

        return null;
    }

    /**
     * Generic getAll method
     */
    async getAll(storeName) {
        await this._ensureInit();

        let cloudItems = [];
        let localItems = [];

        // 1. Fetch Local Data (Always)
        try {
            localItems = await new Promise((resolve, reject) => {
                const transaction = this.db.transaction([storeName], 'readonly');
                const objectStore = transaction.objectStore(storeName);
                const request = objectStore.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            console.error('Local fetch failed:', e);
        }

        // 2. Fetch Cloud Data (If enabled)
        if (CONFIG.ENABLE_CLOUD_SYNC && window.supabaseService) {
            try {
                const timeout = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Cloud fetch timed out')), 4000)
                );

                const { data, error } = await Promise.race([
                    window.supabaseService.get(storeName),
                    timeout
                ]);

                if (!error && data) {
                    cloudItems = data;
                } else if (error) {
                    console.warn('Cloud fetch failed:', error);
                }
            } catch (err) {
                console.warn('Cloud fetch skipped due to timeout:', err);
            }
        }

        // 3. Merge and Deduplicate
        // Priority: Cloud > Local (if cloud sync is active, it likely has the latest 'server' truth)
        // But since we write to local immediately now, they should be identical.

        const itemMap = new Map();

        // Add Local items first
        localItems.forEach(item => {
            if (item.id) itemMap.set(String(item.id), item);
        });

        // Add Cloud items (overwriting local if same ID)
        cloudItems.forEach(item => {
            if (item.id) itemMap.set(String(item.id), item);
        });

        return Array.from(itemMap.values());
    }

    /**
     * Optimized: Get items by date range (Requires 'date' index)
     */
    async getByDateRange(storeName, startDate, endDate) {
        await this._ensureInit();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const objectStore = transaction.objectStore(storeName);

            if (!objectStore.indexNames.contains('date')) {
                reject(new Error(`Store '${storeName}' does not have a 'date' index`));
                return;
            }

            const index = objectStore.index('date');
            const range = IDBKeyRange.bound(startDate.toISOString(), endDate.toISOString());
            const request = index.getAll(range);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Generic update method
     */
    async update(storeName, data) {
        await this._ensureInit();
        // Cloud Sync
        if (CONFIG.ENABLE_CLOUD_SYNC && window.supabaseService && data.id) {
            try {
                const timeout = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Cloud request timed out')), 5000)
                );

                await Promise.race([
                    window.supabaseService.update(storeName, data.id, data),
                    timeout
                ]);
            } catch (err) {
                console.warn('Cloud sync skipped due to timeout or error:', err);
            }
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.put(data);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Update Property
     */
    async updateProperty(id, updates) {
        const property = await this.get('properties', id);
        if (!property) throw new Error('Property not found');

        const updatedProperty = { ...property, ...updates };
        return await this.update('properties', updatedProperty);
    }

    /**
     * Update Tenant
     */
    async updateTenant(id, updates) {
        const tenant = await this.get('tenants', id);
        if (!tenant) throw new Error('Tenant not found');

        const updatedTenant = { ...tenant, ...updates };
        return await this.update('tenants', updatedTenant);
    }

    /**
     * Update Contract
     */
    async updateContract(id, updates) {
        const contract = await this.get('contracts', id);
        if (!contract) throw new Error('Contract not found');

        const updatedContract = { ...contract, ...updates };
        return await this.update('contracts', updatedContract);
    }

    /**
     * Generic delete method
     */
    async delete(storeName, id) {
        await this._ensureInit();
        // Cloud Sync
        if (CONFIG.ENABLE_CLOUD_SYNC && window.supabaseService) {
            try {
                const timeout = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Cloud request timed out')), 5000)
                );

                await Promise.race([
                    window.supabaseService.delete(storeName, id),
                    timeout
                ]);
            } catch (err) {
                console.warn('Cloud sync skipped due to timeout or error:', err);
            }
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.delete(id);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Save contract with file (scanned PDF/image)
     */
    async saveContractWithFile(contractData, file) {
        try {
            // 1. Save Contract Metadata
            // If Cloud Sync is ON, this.add() already handles saving to Supabase 'contracts' table
            const contractId = await this.add('contracts', contractData);

            // 2. Handle File
            if (file) {
                let fileData = {
                    contractId: contractId,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    uploadDate: new Date().toISOString()
                };

                // Check Cloud Sync
                if (CONFIG.ENABLE_CLOUD_SYNC && window.supabaseService) {
                    const fileName = `${contractId}_${Date.now()}_${file.name}`;
                    const { data, error } = await window.supabaseService.uploadFile('contract-files', fileName, file);

                    if (!error && data) {
                        // Cloud Upload Success: Save URL instead of Blob
                        fileData.url = data.publicUrl;
                        fileData.storagePath = data.path; // Store internal path just in case

                        // Save File Metadata to 'files' table in Supabase
                        // (this.add will handle routing to Supabase)
                        await this.add('files', fileData);
                    } else {
                        console.error('Cloud Upload Failed:', error);
                        // Fallback? For now, maybe just throw or alert.
                        // Ideally we'd fallback to local but the ID refs might be mixed.
                        alert('Error uploading file to cloud: ' + JSON.stringify(error));
                    }

                } else {
                    // Local Fallback (IndexedDB)
                    fileData.data = await this.fileToArrayBuffer(file);
                    await this.add('files', fileData);
                }
            }

            return contractId;
        } catch (error) {
            console.error('Error saving contract with file:', error);
            throw error;
        }
    }

    /**
     * Get contract with associated file
     */
    async getContractWithFile(contractId) {
        try {
            const contract = await this.get('contracts', contractId);

            // Get associated file
            const transaction = this.db.transaction(['files'], 'readonly');
            const objectStore = transaction.objectStore('files');
            const index = objectStore.index('contractId');
            const request = index.getAll(contractId);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    resolve({
                        contract: contract,
                        files: request.result
                    });
                };

                request.onerror = () => {
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error getting contract with file:', error);
            throw error;
        }
    }

    /**
     * Convert File to ArrayBuffer for storage
     */
    fileToArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Convert ArrayBuffer back to Blob for display
     */
    arrayBufferToBlob(buffer, type) {
        return new Blob([buffer], { type: type });
    }

    /**
     * Save user settings (language, gender, etc.)
     */
    async saveSetting(key, value) {
        return await this.update('settings', { key: key, value: value });
    }

    /**
     * Get user setting
     */
    async getSetting(key) {
        const result = await this.get('settings', key);
        return result ? result.value : null;
    }

    /**
     * Clear all data (for testing or reset)
     */
    async clearAll() {
        const stores = ['contracts', 'properties', 'tenants', 'files'];
        for (const store of stores) {
            const transaction = this.db.transaction([store], 'readwrite');
            const objectStore = transaction.objectStore(store);
            await objectStore.clear();
        }
    }

    /**
     * Export all data (for backup)
     */
    async exportData() {
        const data = {};
        const stores = ['contracts', 'properties', 'tenants', 'settings'];

        for (const store of stores) {
            data[store] = await this.getAll(store);
        }

        return data;
    }

    /**
     * Import data (for restore)
     */
    async importData(data) {
        for (const [storeName, items] of Object.entries(data)) {
            for (const item of items) {
                await this.add(storeName, item);
            }
        }
    }
}

// Create global instance
window.rentMateDB = new RentMateDB();
