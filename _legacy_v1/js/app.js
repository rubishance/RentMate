document.addEventListener('DOMContentLoaded', () => {
    console.log('RentMate App Initialized');

    // Theme Handling
    function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }
    initTheme();

    window.toggleTheme = () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);

        // Update toggle UI if exists
        const toggles = document.querySelectorAll('.theme-toggle input');
        toggles.forEach(t => t.checked = (next === 'dark'));
    };

    // Mobile Navigation Logic
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const body = document.body;

    function toggleSidebar() {
        const isOpen = sidebar.classList.contains('open');

        if (isOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }

    function openSidebar() {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('active');
        // Prevent background scrolling when menu is open
        body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
        body.style.overflow = '';
    }

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', toggleSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }

    // Utility: Debounce
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Close sidebar on window resize (Debounced)
    window.addEventListener('resize', debounce(() => {
        if (window.innerWidth > 768) {
            closeSidebar();
        }
    }, 250));

    // Email Functionality
    const emailButtons = document.querySelectorAll('.btn-outline-sm[title="Email Tenant"]');

    emailButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const tenantItem = e.target.closest('.tenant-item');
            const tenantName = tenantItem.querySelector('.tenant-details h3').innerText;

            // Visual feedback - button loading state
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Sending...';
            btn.disabled = true;

            try {
                await sendEmailToTenant(tenantName);
                showToast(`המייל נשלח בהצלחה ל-${tenantName}`, 'success');
            } catch (error) {
                console.error('Email error:', error);
                showToast('שליחת המייל נכשלה. אנא נסה שנית.', 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    });

    async function sendEmailToTenant(tenantName) {
        // Use our new secure backend endpoint
        const response = await fetch(`${CONFIG.API_URL}/api/send-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: 'delivered@resend.dev', // Hardcoded for safety in testing
                tenantName: tenantName,
                subject: `Important Update from RentMate for ${tenantName}`,
                html: `<p>Hi ${tenantName},</p><p>This is an automated message from your property management dashboard.</p><p>Best,<br>RentMate Team</p>`
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to send email');
        }

        return await response.json();
    }

    // Toast Notification Logic
    function showToast(message, type = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        let icon = 'info';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'warning-circle';

        toast.innerHTML = `
            <i class="ph ph-${icon} toast-icon"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    // --- Contract Page Logic (Wizard) ---
    // Expose init function globally so add-contract.html can use it
    window.initContractWizard = () => {
        // IDs might be different on standalone vs modal contract.html
        // We use the IDs present in add-contract.html (which match contracts.html modal)

        const wizard = new WizardController({
            totalSteps: 4,
            progressBarId: null,
            progressFillId: 'wizardProgressFill',
            stepsIndicatorId: 'wizardSteps',

            btnBackId: 'btnWizardBack',
            btnNextId: 'btnWizardNext',
            btnSaveId: 'btnWizardSave',

            containers: ['step-parties', 'step-financials', 'step-terms', 'step-summary'],

            onNext: async (step) => {
                // Validation Logic
                if (step === 1) {
                    const prop = document.getElementById('inpProperty').value;
                    const tenant = document.getElementById('inpTenantName').value;
                    if (!prop || !tenant) {
                        showToast('אנא מלא את כתובת הנכס ושם הדייר', 'error');
                        return false;
                    }
                }
                if (step === 2) {
                    const amount = document.getElementById('inpAmount').value;
                    if (!amount) {
                        showToast('אנא הזן סכום שכר דירה', 'error');
                        return false;
                    }
                }

                if (step === 3) {
                    // Populate Summary for Step 4
                    document.getElementById('sumProperty').textContent = document.getElementById('inpProperty').value;
                    document.getElementById('sumTenant').textContent = document.getElementById('inpTenantName').value;

                    const start = document.getElementById('inpStart').value;
                    const end = document.getElementById('inpEnd').value;
                    document.getElementById('sumPeriod').textContent = `${start} - ${end}`;

                    const amt = document.getElementById('inpAmount').value;
                    const curr = document.getElementById('inpCurrency').value;
                    const symbol = curr === 'ILS' ? '₪' : (curr === 'USD' ? '$' : '€');
                    document.getElementById('sumAmount').textContent = `${symbol}${Number(amt).toLocaleString()}`;

                    // Additional Summary Fields Logic
                    const signingDate = document.getElementById('inpSigningDate').value;
                    if (signingDate) { /* ... */ }
                }

                return true;
            },

            onComplete: () => {
                saveContract();
            }
        });

        // Setup Form Listeners (Toggles)
        setupWizardFormListeners();

        // Populate Properties Datalist
        populatePropertiesDatalist();

        // Scan Button Handler
        const btnTriggerScan = document.getElementById('btnTriggerScan');
        const fileInput = document.getElementById('contractFileInput');
        if (btnTriggerScan && fileInput) {
            btnTriggerScan.addEventListener('click', () => {
                fileInput.click();
            });
            fileInput.addEventListener('change', handleScanFile);
        }

        return wizard;
    };

    const setupWizardFormListeners = () => {
        // Linkage Toggle
        const chkLinkage = document.getElementById('chkLinkage');
        const linkageDetails = document.getElementById('linkageDetails');
        if (chkLinkage && linkageDetails) {
            chkLinkage.addEventListener('change', () => {
                linkageDetails.classList.toggle('hidden', !chkLinkage.checked);
            });
        }

        // Option Toggle
        const chkOption = document.getElementById('chkOption');
        const optionDetails = document.getElementById('optionDetails');
        if (chkOption && optionDetails) {
            chkOption.addEventListener('change', () => {
                optionDetails.classList.toggle('hidden', !chkOption.checked);
            });
        }
    };

    async function populatePropertiesDatalist() {
        const dl = document.getElementById('propertiesList');
        if (!dl || !window.rentMateDB) return;
        try {
            await window.rentMateDB._ensureInit();
            const props = await window.rentMateDB.getAll('properties');
            dl.innerHTML = props.map(p => `<option value="${p.address}">`).join('');
        } catch (e) { console.error('Error loading properties for list', e); }
    }

    async function handleScanFile(e) {
        const file = e.target.files[0];
        if (!file) return;

        const btnScan = document.getElementById('btnTriggerScan');
        const originalText = btnScan.innerHTML;
        btnScan.innerHTML = '<i class="ph ph-spinner ph-spin"></i> מעבד...';
        btnScan.disabled = true;

        try {
            await processAndUploadFile(file);
        } catch (error) {
            console.error(error);
            showToast('שגיאה בעיבוד הקובץ', 'error');
        } finally {
            btnScan.innerHTML = originalText;
            btnScan.disabled = false;
        }
    }

    // Initialize if on old pages (contracts.html with modal) - Legacy support or cleanup
    const btnNewContract = document.getElementById('btnNewContract');
    const modalOverlay = document.getElementById('contractModal');

    if (btnNewContract && modalOverlay) {
        // This block handles the OLD modal behavior if it still exists
        let wizard = null;
        btnNewContract.addEventListener('click', () => {
            modalOverlay.classList.add('open');
            resetModal(); // Ensure modal is reset
            if (!wizard) wizard = window.initContractWizard();
            else wizard.goTo(1);
        });

        // Close Modal
        const btnCloseModal = document.getElementById('closeModal');
        const closeModal = () => modalOverlay.classList.remove('open');
        if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);

        // Removed broken legacy code block

    }

    function populateFormWithRealData(data) {
        const mockData = data || {};

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = (val && val.value) ? val.value : (val || '');
        };

        setVal('inpProperty', mockData.property);
        setVal('inpTenantName', mockData.tenantName);
        setVal('inpTenantID', mockData.tenantID);
        setVal('inpTenantEmail', mockData.tenantEmail);
        setVal('inpTenantPhone', mockData.tenantPhone);

        setVal('inpAmount', mockData.amount);
        setVal('inpCurrency', mockData.currency);
        setVal('inpFreq', mockData.freq);
        setVal('inpPaymentDay', mockData.paymentDay);

        setVal('inpStart', mockData.start);
        setVal('inpEnd', mockData.end);

        setVal('inpLinkageType', mockData.linkageType);
        setVal('inpLinkageType', mockData.linkageType);
        setVal('inpBaseIndexDate', mockData.baseIndexDate);

        // New Fields Mapping
        setVal('inpPaymentMethod', mockData.paymentMethod);
        if (mockData.deposit) {
            setVal('inpDepositAmount', mockData.deposit.amount);
            setVal('inpDepositType', mockData.deposit.type);
        }
        setVal('inpSigningDate', mockData.signingDate);
        if (mockData.option) {
            const chkOpt = document.getElementById('chkOption');
            if (chkOpt) {
                chkOpt.checked = true;
                chkOpt.dispatchEvent(new Event('change'));
            }
            setVal('inpOptionPeriod', mockData.option.period);
            // radio logic for option type if needed
        }
    }

    function resetModal() {
        // ... legacy modal reset ...
        document.querySelectorAll('.wizard-body input, .wizard-body textarea').forEach(i => {
            if (i.type !== 'radio' && i.type !== 'checkbox') i.value = '';
            if (i.type === 'checkbox') i.checked = false;
        });
        const idInput = document.getElementById('contractId');
        if (idInput) idInput.value = '';
        // If wizard instance exists, go to step 1 (cant verify instance here easily without global)
    }

    async function saveContract() {
        const btnSave = document.getElementById('btnWizardSave');
        btnSave.disabled = true;
        btnSave.innerHTML = '<i class="ph ph-spinner ph-spin"></i> שומר...';

        try {
            const rawData = {
                propertyStr: document.getElementById('inpProperty').value,
                tenantName: document.getElementById('inpTenantName').value,
                tenantID: document.getElementById('inpTenantID').value,
                tenantEmail: document.getElementById('inpTenantEmail').value,
                tenantPhone: document.getElementById('inpTenantPhone').value,
                start: document.getElementById('inpStart').value,
                end: document.getElementById('inpEnd').value,
                amount: document.getElementById('inpAmount').value,
                currency: document.getElementById('inpCurrency').value,
                freq: document.querySelector('input[name="freq"]:checked').value,
                paymentDay: document.getElementById('inpPaymentDay').value,
                paymentMethod: document.getElementById('inpPaymentMethod').value,
                depositAmount: document.getElementById('inpDepositAmount').value,
                depositType: document.getElementById('inpDepositType').value,
                signingDate: document.getElementById('inpSigningDate').value,
                optionIncluded: document.getElementById('chkOption').checked,
                optionPeriod: document.getElementById('inpOptionPeriod').value,
                optionType: document.querySelector('input[name="optType"]:checked') ? document.querySelector('input[name="optType"]:checked').value : 'automatic',
                linkageIncluded: document.getElementById('chkLinkage').checked,
                linkageType: document.getElementById('inpLinkageType').value,
                baseIndexDate: document.getElementById('inpBaseIndexDate').value,
                furnitureDetails: document.getElementById('inpFurniture').value,
                paintingRequired: document.getElementById('chkPainting').checked,
                petsAllowed: document.getElementById('chkPets').checked,
                // ... other fields
            };

            // DB Operations (Shortened for brevity - reuse logic)
            if (!window.rentMateDB) throw new Error('DB Init Failed');

            // 1. Property
            let propertyId = null;
            const properties = await window.rentMateDB.getAll('properties');
            const existingProp = properties.find(p => p.address === rawData.propertyStr);
            if (existingProp) propertyId = existingProp.id;
            else {
                propertyId = await window.rentMateDB.add('properties', {
                    address: rawData.propertyStr,
                    price: Number(rawData.amount),
                    status: 'occupied'
                });
            }

            // 2. Tenant
            let tenantId = null;
            const tenants = await window.rentMateDB.getAll('tenants');
            const existingTenant = tenants.find(t => t.name === rawData.tenantName);
            if (existingTenant) tenantId = existingTenant.id;
            else {
                tenantId = await window.rentMateDB.add('tenants', {
                    name: rawData.tenantName,
                    idNumber: rawData.tenantID,
                    phone: rawData.tenantPhone,
                    email: rawData.tenantEmail,
                    status: 'active',
                    propertyId: propertyId
                });
            }

            // 3. Contract
            const contract = {
                propertyId,
                tenantId,
                propertyAddress: rawData.propertyStr,
                tenantName: rawData.tenantName,
                startDate: rawData.start,
                endDate: rawData.end,
                amount: Number(rawData.amount),
                currency: rawData.currency,
                paymentFrequency: rawData.freq,
                paymentDay: rawData.paymentDay,
                paymentMethod: rawData.paymentMethod,
                deposit: {
                    amount: rawData.depositAmount,
                    type: rawData.depositType
                },
                signingDate: rawData.signingDate,
                option: rawData.optionIncluded ? {
                    period: rawData.optionPeriod,
                    type: rawData.optionType
                } : null,
                linkage: rawData.linkageIncluded ? {
                    type: rawData.linkageType,
                    baseDate: rawData.baseIndexDate
                } : null,
                amenities: {
                    furniture: rawData.furnitureDetails,
                    painting: rawData.paintingRequired,
                    pets: rawData.petsAllowed
                },
                status: 'active',
                created_at: new Date().toISOString()
            };

            await window.rentMateDB.add('contracts', contract);

            showToast('החוזה נשמר בהצלחה!', 'success');

            // Redirect logic
            if (window.location.pathname.includes('add-contract.html')) {
                setTimeout(() => window.location.href = 'contracts.html', 1000);
            } else {
                // Modal behavior
                const m = document.getElementById('contractModal');
                if (m) m.classList.remove('open');
                setTimeout(() => location.reload(), 500);
            }

        } catch (e) {
            console.error(e);
            showToast('שגיאה בשמירה', 'error');
        } finally {
            btnSave.disabled = false;
            btnSave.innerHTML = 'שמור חוזה';
        }
    }


    // --- Settings Page Logic ---
    const btnSaveSettings = document.getElementById('btnSaveSettings');
    if (btnSaveSettings) {
        btnSaveSettings.addEventListener('click', async () => {
            const userName = document.getElementById('userName').value;
            const userEmail = document.getElementById('userEmail').value;
            const userPhone = document.getElementById('userPhone').value;
            const language = document.getElementById('language')?.value;
            const currency = document.getElementById('currency')?.value;

            btnSaveSettings.disabled = true;
            btnSaveSettings.innerHTML = '<i class="ph ph-spinner ph-spin"></i> שומר...';

            try {
                // Save settings to database
                const settings = {
                    userName,
                    userEmail,
                    userPhone,
                    language,
                    currency,
                    updated_at: new Date().toISOString()
                };

                // Store in IndexedDB
                await window.rentMateDB.update('settings', { key: 'userSettings', value: settings });

                btnSaveSettings.disabled = false;
                btnSaveSettings.innerHTML = '<i class="ph ph-floppy-disk"></i> שמור הגדרות';
                showToast('ההגדרות נשמרו בהצלחה', 'success');
            } catch (error) {
                console.error('Error saving settings:', error);
                btnSaveSettings.disabled = false;
                btnSaveSettings.innerHTML = '<i class="ph ph-floppy-disk"></i> שמור הגדרות';
                showToast('שגיאה בשמירת ההגדרות', 'error');
            }
        });
    }

    // Attach to Settings Page Buttons if they exist
    const btnBackup = document.getElementById('btnBackup');
    const btnRestore = document.getElementById('btnRestore');

    if (btnBackup) btnBackup.addEventListener('click', window.downloadBackup);
    if (btnRestore) btnRestore.addEventListener('click', window.triggerRestore);

    // --- Property Page Logic ---
    const btnAddProperty = document.getElementById('btnAddProperty');
    const propertyModal = document.getElementById('propertyModal');
    const btnClosePropertyModal = document.getElementById('closePropertyModal');
    const btnCancelProperty = document.getElementById('btnCancelProperty');
    const btnSaveProperty = document.getElementById('btnSaveProperty');

    // AUTO-RENDER PROPERTIES (If on Properties Page)
    window.loadProperties = async () => {
        const grid = document.getElementById('propertiesGrid');
        if (!grid) return;

        // Failsafe spinner reference (try to find any likely spinner)
        const getSpinner = () => document.querySelector('.pull-refresh-indicator') || document.querySelector('.loader') || document.querySelector('.spinner');

        try {
            // Wait for DB Instance
            // Removed duplicate loop

            if (!window.rentMateDB) {
                console.warn('DB not initialized after wait');
                const s = getSpinner();
                if (s) s.remove();
                return;
            }

            // Explicitly ensuring init here to be safe
            await window.rentMateDB._ensureInit();

            // Trust internal _ensureInit inside getAll
            const properties = await window.rentMateDB.getAll('properties');
            console.log('Loaded properties:', properties);

            if (!Array.isArray(properties)) {
                console.error('Properties is not an array:', properties);
                throw new Error('Data format error');
            }

            // Success - Populate
            if (properties.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state" style="grid-column: 1/-1;">
                        <i class="ph ph-house-line empty-state-icon"></i>
                        <h3>אין נכסים עדיין</h3>
                        <p>הוסף את הנכס הראשון שלך כדי להתחיל לנהל.</p>
                        <button class="btn btn-primary" onclick="document.getElementById('btnAddProperty').click()">
                            <i class="ph ph-plus"></i> הוסף נכס ראשון
                        </button>
                    </div>
                `;
            } else {
                grid.innerHTML = properties.map(p => {
                    const statusClass = p.status === 'occupied' ? 'success' : (p.status === 'vacant' ? 'warning' : 'danger');
                    const statusText = p.status === 'occupied' ? 'מושכר' : (p.status === 'vacant' ? 'פנוי' : 'בשיפוץ');
                    // Format price with commas
                    const price = Number(p.price || 0).toLocaleString();

                    return `
                    <div class="property-card" id="prop-${p.id}">
                        <div class="card-image">
                            <i class="ph ph-house"></i>
                        </div>
                        <div class="card-details">
                            <div class="card-header">
                                <h3>${p.address}</h3>
                                <span class="badge badge-${statusClass}">${statusText}</span>
                            </div>
                            <div class="location">${p.city || ''} • ${p.rooms || '-'} חדרים</div>
                            <div class="card-footer">
                                <div class="price">₪${price}</div>
                                <div class="actions" style="display:flex; gap:0.5rem;">
                                    <button class="btn-icon" title="פרטים" onclick="window.showPropertyDetails(${p.id})"><i class="ph ph-eye"></i></button>
                                    <button class="btn-icon text-primary" title="ערוך" onclick="window.editProperty(${p.id})"><i class="ph ph-pencil-simple"></i></button>
                                    <button class="btn-icon text-danger" title="מחק" onclick="window.deleteProperty(${p.id})"><i class="ph ph-trash"></i></button>
                                </div>
                            </div>
                        </div>
                    </div>
                    `;
                }).join('');

                // Trigger animations if available
                if (window.staggerAnimation) {
                    window.staggerAnimation('.property-card');
                }
            }

            // Update stats if modal exists
            if (window.showPropertiesModal) {
                // Update stats without opening modal
                // logic...
            }

        } catch (err) {
            console.error('Failed to load properties:', err);
            grid.innerHTML = '<p class="text-danger" style="text-align:center; grid-column:1/-1;">שגיאה בטעינת הנכסים</p>';
        } finally {
            // ALWAYS remove spinner found
            const s = getSpinner();
            if (s) s.remove();
        }
    };

    // Auto-call if we are already ready (double check)
    if (document.getElementById('propertiesGrid') && window.rentMateDB) {
        window.loadProperties();
    }


    if (btnBackup) btnBackup.addEventListener('click', window.downloadBackup);
    if (btnRestore) btnRestore.addEventListener('click', window.triggerRestore);

    // Global Delete Function
    window.deleteProperty = async (id) => {
        if (!confirm('האם אתה בטוח שברצונך למחוק נכס זה? פעולה זו לא ניתנת לביטול.')) return;

        try {
            await window.rentMateDB.delete('properties', id);
            showToast('הנכס נמחק בהצלחה', 'success');
            // Remove from DOM
            const el = document.getElementById(`prop-${id}`);
            if (el) el.remove();

            // Check if empty
            const properties = await window.rentMateDB.getAll('properties');
            if (properties.length === 0) location.reload(); // Simple reload to show empty state
        } catch (err) {
            console.error(err);
            showToast('שגיאה במחיקת הנכס', 'error');
        }
    };
    // Global Edit Property Function
    if (window.rentMateDB) {
        window.editProperty = function (id) {
            window.location.href = `add-property.html?id=${id}`;
        };
    }

    // Modal listeners removed (migrated to add-property.html)

    // --- Tenant Page Logic ---
    const btnAddTenant = document.getElementById('btnAddTenant');
    const tenantModal = document.getElementById('tenantModal');
    const btnCloseTenantModal = document.getElementById('closeTenantModal');
    const btnCancelTenant = document.getElementById('btnCancelTenant');
    const btnSaveTenant = document.getElementById('btnSaveTenant');

    // Define loadTenants globally
    window.loadTenants = async function () {
        const tenantsList = document.getElementById('tenantsList');
        if (!tenantsList || !window.rentMateDB) return;

        // Wait for DB Instance (not .db property)
        let retries = 0;
        while (!window.rentMateDB && retries < 15) {
            await new Promise(r => setTimeout(r, 200));
            retries++;
        }

        if (!window.rentMateDB) {
            console.error('Database Object failure');
            return;
        }

        // Explicit init to prevent deadlock logic
        await window.rentMateDB._ensureInit();

        // Show Skeleton
        tenantsList.innerHTML = Array(3).fill(0).map(() => `
        <div class="tenant-item">
            <div class="tenant-info">
                <div class="tenant-avatar skeleton"></div>
                <div class="tenant-details" style="width: 100%">
                    <div class="skeleton skeleton-text" style="width: 50%"></div>
                    <div class="skeleton skeleton-text" style="width: 30%"></div>
                </div>
            </div>
        </div>
    `).join('');

        try {
            const tenants = await window.rentMateDB.getAll('tenants');
            const properties = await window.rentMateDB.getAll('properties');
            const propMap = {};
            properties.forEach(p => propMap[p.id] = p.address);

            // Clear Skeleton
            tenantsList.innerHTML = '';

            if (!tenants || tenants.length === 0) {
                tenantsList.innerHTML = `
                <div class="empty-state">
                    <i class="ph ph-users empty-state-icon"></i>
                    <h3>אין דיירים עדיין</h3>
                    <p>צור דייר חדש ושייך אותו לנכס.</p>
                    <button class="btn btn-primary" onclick="window.openTenantModal()">
                        <i class="ph ph-plus"></i> הוסף דייר
                    </button>
                </div>
            `;
                return;
            }

            tenants.forEach((tenant, index) => {
                const div = document.createElement('div');
                div.className = 'tenant-item';
                div.id = `tenant-${tenant.id}`;
                div.setAttribute('data-animate', 'fade-in-up');
                div.setAttribute('data-delay', index * 100);

                const firstLetter = tenant.name ? tenant.name.charAt(0) : '?';
                const propName = propMap[tenant.propertyId] || 'לא משויך';

                let badge = '<span class="badge badge-success">פעיל</span>';
                if (tenant.status === 'late') badge = '<span class="badge badge-warning">באיחור</span>';

                div.innerHTML = `
                <div class="tenant-info">
                    <div class="tenant-avatar bg-blue">${firstLetter}</div>
                    <div class="tenant-details">
                        <h3>${tenant.name}</h3>
                        <p class="tenant-property">${propName}</p>
                    </div>
                </div>
                <div class="tenant-status">
                    ${badge}
                </div>
                <div class="tenant-contact">
                    <button class="btn btn-outline-sm" title="Email Tenant" onclick="window.location.href='mailto:${tenant.email}'">
                        <i class="ph ph-envelope"></i>
                    </button>
                    <button class="btn-icon" title="Call" onclick="window.location.href='tel:${tenant.phone}'">
                        <i class="ph ph-phone"></i>
                    </button>
                    <button class="btn-icon text-primary" title="ערוך דייר" onclick="window.location.href='add-tenant.html?id=${tenant.id}'">
                        <i class="ph ph-pencil-simple"></i>
                    </button>
                    <button class="btn-icon text-danger" title="מחק דייר" onclick="window.deleteTenant(${tenant.id})">
                        <i class="ph ph-trash"></i>
                    </button>
                </div>
            `;
                tenantsList.appendChild(div);
            });
        } catch (err) {
            console.error('Error loading tenants:', err);
            tenantsList.innerHTML = `<p class="text-danger">שגיאה: ${err.message}</p>`;
        }
    };

    // Ensure button listeners are attached robustness
    window.initAppHandlers = function () {
        // Properties
        const btnAddProperty = document.getElementById('btnAddProperty');
        if (btnAddProperty) {
            btnAddProperty.onclick = () => {
                window.location.href = 'add-property.html';
            };
        }

        // Tenants
        const btnAddTenant = document.getElementById('btnAddTenant');
        if (btnAddTenant) {
            btnAddTenant.onclick = () => window.location.href = 'add-tenant.html';
        }
    };

    // Global Tenant Modal Helpers
    window.openTenantModal = () => {
        const modal = document.getElementById('tenantModal');
        if (modal) {
            modal.classList.add('open');
            document.getElementById('tenantForm').reset();
            document.getElementById('tenantId').value = '';
            const h2 = modal.querySelector('h2');
            if (h2) h2.textContent = 'הוספת דייר חדש';
        }
        populatePropertySelect();
    };

    async function populatePropertySelect() {
        const select = document.getElementById('tenantProperty');
        if (!select || !window.rentMateDB) return;

        try {
            const properties = await window.rentMateDB.getAll('properties');
            select.innerHTML = '<option value="">בחר נכס...</option>';
            properties.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.address;
                select.appendChild(opt);
            });
        } catch (e) { console.error(e); }
    }

    // Global functions for editing/deleting tenants
    window.editTenant = async (id) => {
        try {
            const tenant = await window.rentMateDB.get('tenants', id);
            if (!tenant) return;

            window.openTenantModal();
            document.getElementById('tenantId').value = tenant.id;
            document.getElementById('tenantName').value = tenant.name;
            document.getElementById('tenantPhone').value = tenant.phone;
            document.getElementById('tenantEmail').value = tenant.email;
            // Wait for select to populate then set value
            setTimeout(() => {
                document.getElementById('tenantProperty').value = tenant.propertyId;
            }, 100);

            const modal = document.getElementById('tenantModal');
            if (modal) modal.querySelector('h2').textContent = 'עריכת דייר';
        } catch (e) { console.error(e); }
    };

    window.deleteTenant = async (id) => {
        if (!confirm('למחוק דייר זה?')) return;
        try {
            await window.rentMateDB.delete('tenants', id);
            await window.loadTenants();
            showToast('דייר נמחק', 'success');
        } catch (e) { console.error(e); }
    };

    // Call init handlers immediately in case DOM is ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        window.initAppHandlers();
    } else {
        document.addEventListener('DOMContentLoaded', window.initAppHandlers);
    }
    // Close loadTenants if it was open
    // It seems the previous block was part of loadTenants, but sticking initAppHandlers in the middle broke it.
    // Based on the context, we likely just need to clean up the tail of loadTenants.

    // NOTE: If this block was part of loadTenants, we need to make sure we don't break the closure.
    // However, looking at the code, initAppHandlers (lines 977+) seems to initiate a new block.
    // The code at 1063 calls initAppHandlers.
    // The code at 1069 is ORPHANED HTML from a template literal.

    // SAFE FIX: Remove the text and the trying-to-close braces that follow it, 
    // assuming they are debris from a bad paste.

    // CHECK if we need to close something before 1063.
    // If 1063 is at root level, then we are good.
    // If 1063 is inside loadTenants, that's wrong.

    // Let's assume we just delete the garbage.


    // Global Delete Tenant
    window.deleteTenant = async (id) => {
        if (!confirm('האם אתה בטוח שברצונך למחוק דייר זה?')) return;
        try {
            await window.rentMateDB.delete('tenants', id);
            showToast('הדייר נמחק בהצלחה', 'success');
            const el = document.getElementById(`tenant - ${id} `);
            if (el) el.remove();

            const tenants = await window.rentMateDB.getAll('tenants');
            if (tenants.length === 0) location.reload();
        } catch (err) {
            console.error(err);
            showToast('שגיאה במחיקת הדייר', 'error');
        }
    };

    // Global Edit Tenant
    window.editTenant = async (id) => {
        try {
            const tenant = await window.rentMateDB.get('tenants', id);
            if (!tenant) {
                showToast('הדייר לא נמצא', 'error');
                return;
            }

            // Populate Form
            document.getElementById('tenantId').value = tenant.id;
            document.getElementById('tenantName').value = tenant.name;
            document.getElementById('tenantEmail').value = tenant.email || '';
            document.getElementById('tenantPhone').value = tenant.phone;
            document.getElementById('tenantID').value = tenant.identity || ''; // Assuming identity field exists

            // Select Property
            const propSelect = document.getElementById('tenantProperty');
            if (propSelect) {
                // Populate if empty (should be handled by click listener but just in case)
                if (propSelect.options.length <= 1) {
                    const properties = await window.rentMateDB.getAll('properties');
                    propSelect.innerHTML = '<option value="">בחר נכס...</option>';
                    properties.forEach(p => {
                        const option = document.createElement('option');
                        option.value = p.address;
                        option.textContent = p.address;
                        propSelect.appendChild(option);
                    });
                }
                propSelect.value = tenant.property_address || '';
            }

            // Change Title/Button
            document.querySelector('#tenantModal h2').textContent = 'עריכת דייר';
            document.getElementById('btnSaveTenant').textContent = 'עדכן דייר';

            // Open Modal
            document.getElementById('tenantModal').classList.add('open');
        } catch (err) {
            console.error(err);
            showToast('שגיאה בטעינת הדייר', 'error');
        }
    };



    // --- Index Calculator Page Logic ---
    const btnCalculate = document.getElementById('btnCalculate');
    const btnResetCalc = document.getElementById('btnResetCalc');
    const calcResults = document.getElementById('calcResults');

    if (btnCalculate) {
        btnCalculate.addEventListener('click', () => {
            const baseRent = parseFloat(document.getElementById('calcBaseRent').value);
            const baseIndex = parseFloat(document.getElementById('calcBaseIndex').value);
            const currentIndex = parseFloat(document.getElementById('calcCurrentIndex').value);

            // Validation
            if (!baseRent || !baseIndex || !currentIndex) {
                showToast('אנא מלא את כל השדות', 'error');
                return;
            }

            if (baseIndex <= 0) {
                showToast('מדד הבסיס חייב להיות גדול מאפס', 'error');
                return;
            }

            // Calculation
            // Formula: New Rent = Base Rent * (Current Index / Base Index)
            const newRent = baseRent * (currentIndex / baseIndex);
            const difference = newRent - baseRent;
            const percentChange = ((currentIndex - baseIndex) / baseIndex) * 100;

            // Update UI
            document.getElementById('resNewRent').textContent = `₪${newRent.toLocaleString(undefined, { maximumFractionDigits: 0 })} `;
            const diffEl = document.getElementById('resDiff');
            diffEl.textContent = `₪${Math.abs(difference).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${difference >= 0 ? 'תוספת' : 'הפחתה'} `;
            diffEl.className = difference >= 0 ? 'value text-danger' : 'value text-success';

            document.getElementById('resPercent').textContent = `${Math.abs(percentChange).toFixed(2)}% `;

            // Badge logic
            const badge = document.getElementById('calcBadge');
            if (difference > 0) {
                badge.textContent = 'עליה';
                badge.className = 'badge badge-danger';
            } else if (difference < 0) {
                badge.textContent = 'ירידה';
                badge.className = 'badge badge-success';
            } else {
                badge.textContent = 'ללא שינוי';
                badge.className = 'badge';
            }

            // Show Results
            calcResults.classList.remove('hidden');
            calcResults.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // Animation
            calcResults.style.animation = 'none';
            calcResults.offsetHeight; /* trigger reflow */
            calcResults.style.animation = 'highlight 1s ease-out';
        });

        // Reset
        btnResetCalc.addEventListener('click', () => {
            document.getElementById('calcBaseRent').value = '';
            document.getElementById('calcBaseIndex').value = '';
            document.getElementById('calcCurrentIndex').value = '';
            calcResults.classList.add('hidden');
        });
    }

    // AUTO-RENDER CONTRACTS (If on Contracts Page)
    const contractsTableBody = document.querySelector('.contracts-table tbody');
    if (contractsTableBody && window.rentMateDB) {
        (async () => {
            if (!window.rentMateDB.db) await new Promise(r => setTimeout(r, 500));

            // Show skeleton in table
            if (contractsTableBody) {
                contractsTableBody.innerHTML = Array(3).fill(0).map(() => `
        < tr >
        <td colspan="6">
            <div class="skeleton skeleton-text" style="width: 100%; height: 20px;"></div>
        </td>
                    </tr >
        `).join('');
            }

            try {
                const contracts = await window.rentMateDB.getAll('contracts');

                if (contracts.length === 0) {
                    contractsTableBody.innerHTML = `
        < tr >
        <td colspan="6">
            <div class="empty-state">
                <i class="ph ph-file-text empty-state-icon"></i>
                <h3>אין חוזים עדיין</h3>
                <p>הוסף חוזה חדש ידנית או באמצעות סריקה.</p>
                <button class="btn btn-primary" onclick="document.getElementById('btnNewContract').click()">
                    <i class="ph ph-plus"></i> חוזה חדש
                </button>
            </div>
        </td>
                        </tr >
        `;
                    return;
                }

                if (contracts.length > 0) {
                    contractsTableBody.innerHTML = '';
                    contracts.forEach(contract => {
                        const row = document.createElement('tr');
                        row.id = `contract - ${contract.id} `;

                        // Date Formatting Safe Check - Numeric only
                        const formatDate = (d) => {
                            if (!d) return '-';
                            const dateObj = new Date(d);
                            if (isNaN(dateObj.getTime())) return '-';
                            return dateObj.toLocaleDateString('he-IL');
                        };
                        const startDateFormatted = formatDate(contract.startDate);
                        const endDateFormatted = formatDate(contract.endDate);
                        const dateRange = `< div style = "line-height: 1.4;" > ${startDateFormatted} <br><small style="color: #999;">עד: ${endDateFormatted}</small></div>`;

                        // Amount Formatting
                        const symbol = contract.currency === 'USD' ? '$' : '₪';
                        const amount = Number(contract.amount || 0).toLocaleString();

                        // Status Logic (Simple)
                        let statusBadge = '<span class="badge badge-success">פעיל</span>';
                        // Check if expired logic could go here
                        if (contract.endDate && new Date(contract.endDate) < new Date()) {
                            statusBadge = '<span class="badge badge-warning">הסתיים</span>';
                        }

                        row.innerHTML = `
        < td class="fw-500" > ${contract.propertyAddress || 'נכס לא ידוע'}</td >
                            <td>${contract.tenantName || 'דייר לא ידוע'}</td>
                            <td>${dateRange}</td>
                            <td>${statusBadge}</td>
                            <td>${symbol}${amount}</td>
                            <td>
                                <button class="btn-icon" title="צפה בחוזה" onclick="window.viewContract(${contract.id})"><i class="ph ph-eye"></i></button>
                                <button class="btn-icon" title="הורד חוזה" onclick="window.downloadContract(${contract.id})"><i class="ph ph-download-simple"></i></button>
                                <button class="btn-icon text-primary" title="ערוך חוזה" onclick="window.editContract(${contract.id})"><i class="ph ph-pencil-simple"></i></button>
                                <button class="btn-icon text-danger" title="מחק חוזה" onclick="window.deleteContract(${contract.id})"><i class="ph ph-trash"></i></button>
                            </td>
    `;
                        contractsTableBody.appendChild(row);
                    });
                }
            } catch (err) {
                console.error('Failed to render contracts:', err);
                contractsTableBody.innerHTML = '<tr><td colspan="6" class="text-danger text-center">שגיאה בטעינת חוזים</td></tr>';
            }
        })();


        // Global Delete Contract
        window.deleteContract = async (id) => {
            if (!confirm('⚠️ האם אתה בטוח שברצונך למחוק חוזה זה?\n\nכל הנתונים הקשורים לחוזה יימחקו לצמיתות ולא ניתן יהיה לשחזר אותם.\n\nהאם להמשיך?')) return;
            try {
                await window.rentMateDB.delete('contracts', id);
                showToast('החוזה נמחק בהצלחה', 'success');
                const el = document.getElementById(`contract - ${id} `);
                if (el) el.remove();

                const contracts = await window.rentMateDB.getAll('contracts');
                if (contracts.length === 0) location.reload();
            } catch (err) {
                console.error(err);
                showToast('שגיאה במחיקת החוזה', 'error');
            }
            // Initialize handlers if available
            if (window.initAppHandlers) {
                window.initAppHandlers();
            } else {
                console.warn('initAppHandlers not found immediately, retrying...');
                setTimeout(() => {
                    if (window.initAppHandlers) window.initAppHandlers();
                }, 1000);
            }
        };

        // Global View Contract
        window.viewContract = async (id) => {
            try {
                const contract = await window.rentMateDB.get('contracts', id);
                if (!contract) {
                    showToast('החוזה לא נמצא', 'error');
                    return;
                }

                // Show contract details in a toast for now
                showToast(`צפייה בחוזה: ${contract.propertyAddress} - ${contract.tenantName} `, 'info');

                // TODO: Implement full contract view modal in future
                console.log('Contract details:', contract);
            } catch (err) {
                console.error(err);
                showToast('שגיאה בטעינת החוזה', 'error');
            }
        };

        // Global Download Contract
        window.downloadContract = async (id) => {
            try {
                const contract = await window.rentMateDB.get('contracts', id);
                if (!contract) {
                    showToast('החוזה לא נמצא', 'error');
                    return;
                }

                // Create a simple text representation
                const contractText = `
חוזה שכירות
=============

נכס: ${contract.propertyAddress || 'לא צוין'}
דייר: ${contract.tenantName || 'לא צוין'}
תאריך התחלה: ${contract.startDate || 'לא צוין'}
תאריך סיום: ${contract.endDate || 'לא צוין'}
סכום: ${contract.currency === 'USD' ? '$' : '₪'}${contract.amount || 0}
תדירות תשלום: ${contract.paymentFrequency || 'לא צוין'}
סוג הצמדה: ${contract.linkageType || 'לא צוין'}
סטטוס: ${contract.status || 'לא צוין'}

נוצר בתאריך: ${contract.createdAt ? new Date(contract.createdAt).toLocaleDateString('he-IL') : 'לא ידוע'}
                `.trim();

                // Create and download file
                const blob = new Blob([contractText], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `חוזה_${contract.propertyAddress || 'נכס'}_${Date.now()}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                showToast('החוזה הורד בהצלחה', 'success');
            } catch (err) {
                console.error(err);
                showToast('שגיאה בהורדת החוזה', 'error');
            }
        };

        // Global Edit Contract
        window.editContract = async (id) => {
            try {
                const contract = await window.rentMateDB.get('contracts', id);
                if (!contract) {
                    showToast('החוזה לא נמצא', 'error');
                    return;
                }

                // Switch to form view
                const scanSection = document.getElementById('scanSection');
                const contractForm = document.getElementById('contractForm');
                if (scanSection) scanSection.classList.add('hidden');
                if (contractForm) contractForm.classList.remove('hidden');

                // Populate Form
                document.getElementById('contractId').value = contract.id;
                document.getElementById('inpProperty').value = contract.propertyAddress || '';
                document.getElementById('inpTenantName').value = contract.tenantName || '';
                // Note: details like email/phone might not be in contract object depending on schema
                // If they are missing, we might need to fetch Tenant object logic, but for now use what we have
                document.getElementById('inpTenantID').value = '';
                document.getElementById('inpTenantEmail').value = '';
                document.getElementById('inpTenantPhone').value = '';

                document.getElementById('inpStart').value = contract.startDate || '';
                document.getElementById('inpEnd').value = contract.endDate || '';
                document.getElementById('inpAmount').value = contract.amount || '';
                document.getElementById('inpCurrency').value = contract.currency || 'ILS';
                document.getElementById('inpFreq').value = contract.paymentFrequency || 'חודשי';
                document.getElementById('inpFurniture').value = contract.furnitureInfo || '';
                document.getElementById('inpLinkageType').value = contract.linkageType || '';

                // Change Title/Button
                const modalParams = document.querySelector('#contractModal h2');
                if (modalParams) modalParams.textContent = 'עריכת חוזה';
                const btnSave = document.getElementById('btnSaveContract');
                if (btnSave) btnSave.textContent = 'עדכן חוזה';

                // Open Modal
                document.getElementById('contractModal').classList.add('open');
            } catch (err) {
                console.error(err);
                showToast('שגיאה בטעינת החוזה', 'error');
            }
        };
    }

    // --- PWA Install Logic ---
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        // Update UI to notify the user they can add to home screen
        showInstallPromotion();
    });

    function showInstallPromotion() {
        // Check if button already exists
        if (document.getElementById('pwaInstallBtn')) return;

        const navLinks = document.querySelector('.nav-links');

        const installBtnHTML = `
            <li id="pwaInstallLi" style="margin-top: auto; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1);">
                <a href="#" id="pwaInstallBtn" style="color: #4da6ff;">
                    <i class="ph ph-download-simple"></i>
                    התקן אפליקציה
                </a>
            </li>
        `;

        // Handle standard pages
        if (navLinks) {
            const spacer = navLinks.querySelector('.spacer');
            if (spacer) {
                spacer.insertAdjacentHTML('afterend', installBtnHTML);
            } else {
                navLinks.insertAdjacentHTML('beforeend', installBtnHTML);
            }
        }
        // Handle settings page structure
        else {
            const settingsSidebar = document.querySelector('.sidebar nav');
            if (settingsSidebar) {
                const btnHtmlSettings = `
                    <a href="#" id="pwaInstallBtn" class="nav-item" style="color: #4da6ff; margin-top: 1rem;">
                        <i class="ph ph-download-simple"></i>
                        <span>התקן אפליקציה</span>
                    </a>
                 `;
                settingsSidebar.insertAdjacentHTML('beforeend', btnHtmlSettings);
            }
        }

        // Add Click Listener
        const btn = document.getElementById('pwaInstallBtn');
        if (btn) {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                // Hide our user interface that shows our A2HS button
                if (document.getElementById('pwaInstallLi')) {
                    document.getElementById('pwaInstallLi').style.display = 'none';
                } else {
                    btn.style.display = 'none';
                }

                // Show the prompt
                deferredPrompt.prompt();
                // Wait for the user to respond to the prompt
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to the install prompt: ${outcome}`);
                // We've used the prompt, and can't use it again, throw it away
                deferredPrompt = null;
            });
        }
    }

    // AUTO-RENDER DASHBOARD (If on Dashboard Page)
    const statTotalProperties = document.getElementById('statTotalProperties');
    if (statTotalProperties && window.rentMateDB) {
        (async () => {
            if (!window.rentMateDB.db) await new Promise(r => setTimeout(r, 500));

            try {
                const properties = await window.rentMateDB.getAll('properties');
                const contracts = await window.rentMateDB.getAll('contracts');

                // 1. Total Properties
                statTotalProperties.textContent = properties.length;

                // 2. Total Monthly Income (from active contracts)
                const activeContracts = contracts.filter(c => c.status === 'active' || !c.endDate || new Date(c.endDate) > new Date());
                const totalIncome = activeContracts.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

                const statTotalIncome = document.getElementById('statTotalIncome');
                if (statTotalIncome) statTotalIncome.textContent = `₪${totalIncome.toLocaleString()}`;

                // 3. Active Contracts Count
                const statActiveContracts = document.getElementById('statActiveContracts');
                if (statActiveContracts) statActiveContracts.textContent = activeContracts.length;

                // 4. Recent Activity (Show last 3 added contracts)
                const activityList = document.getElementById('recentActivityList');
                if (activityList) {
                    if (contracts.length === 0) {
                        activityList.innerHTML = `
                            <div class="empty-state" style="padding: 1rem; border: none; background: transparent;">
                                <p>אין פעילות אחרונה להצגה.</p>
                            </div>
                         `;
                    } else {
                        // Sort by creation date descending (assuming we have createdAt, or valid start date)
                        const sorted = [...contracts].reverse().slice(0, 3);
                        activityList.innerHTML = '';

                        sorted.forEach(c => {
                            const item = document.createElement('div');
                            item.className = 'activity-item';
                            item.style.padding = '0.75rem 0';
                            item.style.borderBottom = '1px solid #eee';
                            item.innerHTML = `
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <div>
                                        <strong>חוזה חדש נחתם</strong>
                                        <div class="text-xs text-muted">${c.propertyAddress || 'נכס'}</div>
                                    </div>
                                    <span class="text-xs">${new Date(c.startDate).toLocaleDateString()}</span>
                                </div>
                             `;
                            activityList.appendChild(item);
                        });
                    }
                }

            } catch (err) {
                console.error('Failed to render dashboard:', err);
            }
        })();
    }

    // Dashboard Stat Modal Functions
    const statModal = document.getElementById('statModal');
    const statModalTitle = document.getElementById('statModalTitle');
    const statModalBody = document.getElementById('statModalBody');
    const closeStatModal = document.getElementById('closeStatModal');
    const btnCloseStatModal = document.getElementById('btnCloseStatModal');

    if (statModal && closeStatModal && btnCloseStatModal) {
        const closeModal = () => statModal.classList.remove('open');
        closeStatModal.addEventListener('click', closeModal);
        btnCloseStatModal.addEventListener('click', closeModal);
        statModal.addEventListener('click', (e) => {
            if (e.target === statModal) closeModal();
        });
    }

    // Camera Button - Open Camera Modal
    const btnCamera = document.getElementById('btnCamera');
    const cameraModal = document.getElementById('cameraModal');
    const closeCameraModal = document.getElementById('closeCameraModal');

    if (btnCamera && cameraModal) {
        btnCamera.addEventListener('click', () => {
            contractModal.classList.remove('open');
            cameraModal.style.display = 'flex';
            cameraModal.classList.add('open');
            initCamera();
        });

        if (closeCameraModal) {
            closeCameraModal.addEventListener('click', () => {
                cameraModal.classList.remove('open');
                cameraModal.style.display = 'none';
                stopCamera();
            });
        }

        cameraModal.addEventListener('click', (e) => {
            if (e.target === cameraModal) {
                cameraModal.classList.remove('open');
                cameraModal.style.display = 'none';
                stopCamera();
            }
        });
    }

    // Manual Entry Button - Skip scanning and go straight to form
    const btnManualEntry = document.getElementById('btnManualEntry');
    if (btnManualEntry) {
        btnManualEntry.addEventListener('click', () => {
            // Hide scan section, show form
            const scanSection = document.querySelector('.scan-section');
            const formSection = document.querySelector('.contract-form');

            if (scanSection) scanSection.style.display = 'none';
            if (formSection) formSection.style.display = 'block';

            // Update modal title
            const modalTitle = document.querySelector('#contractModal .modal-header h2');
            if (modalTitle) modalTitle.textContent = 'הוסף חוזה ידנית';
        });
    }

    // Show Properties Modal
    window.showPropertiesModal = async () => {
        if (!window.rentMateDB) return;

        try {
            const properties = await window.rentMateDB.getAll('properties');

            statModalTitle.textContent = `סה"כ נכסים (${properties.length})`;

            if (properties.length === 0) {
                statModalBody.innerHTML = '<p style="text-align: center; color: #999;">אין נכסים עדיין</p>';
            } else {
                let html = '<div style="max-height: 400px; overflow-y: auto;">';

                // Group by status
                const occupied = properties.filter(p => p.status === 'occupied');
                const vacant = properties.filter(p => p.status === 'vacant');
                const maintenance = properties.filter(p => p.status !== 'occupied' && p.status !== 'vacant');

                html += `
                    <div style="margin-bottom: 1rem;">
                        <h4 style="margin-bottom: 0.5rem;">סיכום לפי סטטוס:</h4>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-bottom: 1rem;">
                            <div style="padding: 0.5rem; background: #e8f5e9; border-radius: 4px; text-align: center;">
                                <div style="font-size: 1.5rem; font-weight: bold; color: #2e7d32;">${occupied.length}</div>
                                <div style="font-size: 0.85rem; color: #666;">מושכר</div>
                            </div>
                            <div style="padding: 0.5rem; background: #fff3e0; border-radius: 4px; text-align: center;">
                                <div style="font-size: 1.5rem; font-weight: bold; color: #f57c00;">${vacant.length}</div>
                                <div style="font-size: 0.85rem; color: #666;">פנוי</div>
                            </div>
                            <div style="padding: 0.5rem; background: #fce4ec; border-radius: 4px; text-align: center;">
                                <div style="font-size: 1.5rem; font-weight: bold; color: #c2185b;">${maintenance.length}</div>
                                <div style="font-size: 0.85rem; color: #666;">בשיפוץ</div>
                            </div>
                        </div>
                    </div>
                    <h4 style="margin-bottom: 0.5rem;">רשימת נכסים:</h4>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f5f5f5; border-bottom: 2px solid #ddd;">
                                <th style="padding: 0.5rem; text-align: right;">כתובת</th>
                                <th style="padding: 0.5rem; text-align: right;">עיר</th>
                                <th style="padding: 0.5rem; text-align: right;">סטטוס</th>
                                <th style="padding: 0.5rem; text-align: right;">מחיר</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                properties.forEach(prop => {
                    let statusColor = '#2e7d32';
                    let statusText = 'מושכר';
                    if (prop.status === 'vacant') {
                        statusColor = '#f57c00';
                        statusText = 'פנוי';
                    } else if (prop.status !== 'occupied') {
                        statusColor = '#c2185b';
                        statusText = 'בשיפוץ';
                    }

                    html += `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 0.5rem;">${prop.address}</td>
                            <td style="padding: 0.5rem;">${prop.city || '-'}</td>
                            <td style="padding: 0.5rem;"><span style="color: ${statusColor}; font-weight: 500;">${statusText}</span></td>
                            <td style="padding: 0.5rem;">₪${Number(prop.price || 0).toLocaleString()}</td>
                        </tr>
                    `;
                });

                html += '</tbody></table></div>';
                statModalBody.innerHTML = html;
            }

            statModal.classList.add('open');
        } catch (err) {
            console.error(err);
            showToast('שגיאה בטעינת נתוני נכסים', 'error');
        }
    };

    // Show Income Modal
    window.showIncomeModal = async () => {
        if (!window.rentMateDB) return;

        try {
            const contracts = await window.rentMateDB.getAll('contracts');
            const activeContracts = contracts.filter(c => c.status === 'active' || !c.endDate || new Date(c.endDate) > new Date());

            const totalIncome = activeContracts.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

            statModalTitle.textContent = `הכנסה חודשית - ₪${totalIncome.toLocaleString()}`;

            if (activeContracts.length === 0) {
                statModalBody.innerHTML = '<p style="text-align: center; color: #999;">אין חוזים פעילים</p>';
            } else {
                let html = '<div style="max-height: 400px; overflow-y: auto;">';

                html += `
                    <div style="margin-bottom: 1rem; padding: 1rem; background: #e8f5e9; border-radius: 8px;">
                        <div style="font-size: 0.9rem; color: #666; margin-bottom: 0.25rem;">סה"כ הכנסה חודשית</div>
                        <div style="font-size: 2rem; font-weight: bold; color: #2e7d32;">₪${totalIncome.toLocaleString()}</div>
                        <div style="font-size: 0.85rem; color: #666; margin-top: 0.25rem;">מ-${activeContracts.length} חוזים פעילים</div>
                    </div>
                    <h4 style="margin-bottom: 0.5rem;">פירוט לפי חוזה:</h4>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f5f5f5; border-bottom: 2px solid #ddd;">
                                <th style="padding: 0.5rem; text-align: right;">נכס</th>
                                <th style="padding: 0.5rem; text-align: right;">דייר</th>
                                <th style="padding: 0.5rem; text-align: right;">סכום</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                activeContracts.forEach(contract => {
                    const symbol = contract.currency === 'USD' ? '$' : '₪';
                    html += `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 0.5rem;">${contract.propertyAddress || 'נכס לא ידוע'}</td>
                            <td style="padding: 0.5rem;">${contract.tenantName || 'דייר לא ידוע'}</td>
                            <td style="padding: 0.5rem; font-weight: 500;">${symbol}${Number(contract.amount || 0).toLocaleString()}</td>
                        </tr>
                    `;
                });

                html += '</tbody></table></div>';
                statModalBody.innerHTML = html;
            }

            statModal.classList.add('open');
        } catch (err) {
            console.error(err);
            showToast('שגיאה בטעינת נתוני הכנסות', 'error');
        }
    };

    // Show Contracts Modal
    window.showContractsModal = async () => {
        if (!window.rentMateDB) return;

        try {
            const contracts = await window.rentMateDB.getAll('contracts');
            const activeContracts = contracts.filter(c => c.status === 'active' || !c.endDate || new Date(c.endDate) > new Date());
            const expiredContracts = contracts.filter(c => c.endDate && new Date(c.endDate) < new Date());

            statModalTitle.textContent = `חוזים פעילים (${activeContracts.length})`;

            if (contracts.length === 0) {
                statModalBody.innerHTML = '<p style="text-align: center; color: #999;">אין חוזים במערכת</p>';
            } else {
                let html = '<div style="max-height: 400px; overflow-y: auto;">';

                html += `
                    <div style="margin-bottom: 1rem;">
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; margin-bottom: 1rem;">
                            <div style="padding: 0.75rem; background: #e8f5e9; border-radius: 4px; text-align: center;">
                                <div style="font-size: 1.5rem; font-weight: bold; color: #2e7d32;">${activeContracts.length}</div>
                                <div style="font-size: 0.85rem; color: #666;">פעילים</div>
                            </div>
                            <div style="padding: 0.75rem; background: #fff3e0; border-radius: 4px; text-align: center;">
                                <div style="font-size: 1.5rem; font-weight: bold; color: #f57c00;">${expiredContracts.length}</div>
                                <div style="font-size: 0.85rem; color: #666;">הסתיימו</div>
                            </div>
                        </div>
                    </div>
                    <h4 style="margin-bottom: 0.5rem;">חוזים פעילים:</h4>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f5f5f5; border-bottom: 2px solid #ddd;">
                                <th style="padding: 0.5rem; text-align: right;">נכס</th>
                                <th style="padding: 0.5rem; text-align: right;">דייר</th>
                                <th style="padding: 0.5rem; text-align: right;">תוקף</th>
                                <th style="padding: 0.5rem; text-align: right;">סכום</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                activeContracts.forEach(contract => {
                    const symbol = contract.currency === 'USD' ? '$' : '₪';
                    const endDate = contract.endDate ? new Date(contract.endDate).toLocaleDateString('he-IL') : 'ללא תאריך סיום';

                    html += `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 0.5rem;">${contract.propertyAddress || 'נכס לא ידוע'}</td>
                            <td style="padding: 0.5rem;">${contract.tenantName || 'דייר לא ידוע'}</td>
                            <td style="padding: 0.5rem; font-size: 0.85rem;">${endDate}</td>
                            <td style="padding: 0.5rem; font-weight: 500;">${symbol}${Number(contract.amount || 0).toLocaleString()}</td>
                        </tr>
                    `;
                });

                html += '</tbody></table></div>';
                statModalBody.innerHTML = html;
            }

            statModal.classList.add('open');
        } catch (err) {
            console.error(err);
            showToast('שגיאה בטעינת נתוני חוזים', 'error');
        }
    };

    // AUTO-RENDER PAYMENTS (If on Payments Page)
    const paymentsTableBody = document.getElementById('paymentsTableBody');
    if (paymentsTableBody && window.rentMateDB) {
        (async () => {
            if (!window.rentMateDB.db) await new Promise(r => setTimeout(r, 500));

            try {
                if (paymentsTableBody && window.rentMateDB) {
                    const contracts = await window.rentMateDB.getAll('contracts');
                    const activeContracts = contracts.filter(c => c.status === 'active');

                    // Optimized: Fetch only this month's payments via index
                    const currentMonthIdx = new Date().getMonth();
                    const currentYear = new Date().getFullYear();
                    const startOfMonth = new Date(currentYear, currentMonthIdx, 1);
                    const endOfMonth = new Date(currentYear, currentMonthIdx + 1, 0, 23, 59, 59);

                    let thisMonthPayments = [];
                    try {
                        thisMonthPayments = await window.rentMateDB.getByDateRange('payments', startOfMonth, endOfMonth);
                    } catch (e) {
                        console.warn('Optimized query failed, falling back to getAll:', e);
                        const allPayments = await window.rentMateDB.getAll('payments');
                        thisMonthPayments = allPayments.filter(p => {
                            const pDate = new Date(p.date || p.paidDate); // Support both
                            return pDate.getTime() >= startOfMonth.getTime() && pDate.getTime() <= endOfMonth.getTime();
                        });
                    }

                    // Calc Stats
                    const totalMonthly = activeContracts.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

                    // Calculate Pending vs Collected
                    const collected = thisMonthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                    const pending = totalMonthly - collected; // Simplified view

                    const elMonthly = document.getElementById('payStatMonthly');
                    if (elMonthly) elMonthly.textContent = `₪${totalMonthly.toLocaleString()}`;

                    const elPending = document.getElementById('payStatPending');
                    if (elPending) elPending.textContent = `₪${Math.max(0, pending).toLocaleString()}`; // Don't show negative

                    // Render List
                    if (paymentsTableBody) {
                        paymentsTableBody.innerHTML = '';

                        if (activeContracts.length === 0) {
                            paymentsTableBody.innerHTML = `
                            <tr>
                                <td colspan="6">
                                    <div class="empty-state">
                                        <i class="ph ph-money empty-state-icon"></i>
                                        <h3>אין תשלומים קרובים</h3>
                                        <p>לא נמצאו חוזים פעילים עם תשלומים קרובים.</p>
                                    </div>
                                </td>
                            </tr>
                         `;
                        }
                    }

                    const currentMonthName = new Date().toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
                    const elHeader = document.getElementById('paymentHeaderTitle');
                    if (elHeader) elHeader.textContent = `תשלומים קרובים (${currentMonthName})`;

                    activeContracts.forEach(c => {
                        const row = document.createElement('tr');
                        const amount = Number(c.amount).toLocaleString();
                        // Assume payment day = start day, fallback to 1st
                        const day = c.startDate ? new Date(c.startDate).getDate() : 1;
                        const paymentDate = `${day}/${new Date().getMonth() + 1}/${new Date().getFullYear()}`;

                        // Check if paid
                        const paidRecord = thisMonthPayments.find(p => p.contractId === c.id);
                        const isPaid = !!paidRecord;

                        let statusBadge = '<span class="badge badge-warning">ממתין</span>';
                        let actions = `
                             <button class="btn-icon text-success" title="סמן כשולם" onclick="window.markAsPaid(${c.id}, ${c.amount}, '${c.tenantName}')"><i class="ph ph-check-circle"></i></button>
                             <button class="btn-icon text-primary" title="שלח תזכורת" onclick="window.sendPaymentReminder(${c.id}, '${c.tenantName}')"><i class="ph ph-paper-plane-tilt"></i></button>
                        `;

                        if (isPaid) {
                            statusBadge = '<span class="badge badge-success">שולם</span>';
                            actions = `<span class="text-muted" style="font-size: 0.85rem;"><i class="ph ph-check"></i> התקבל</span>`;
                        }

                        row.innerHTML = `
                         <td class="fw-500">${c.propertyAddress}</td>
                         <td>${c.tenantName}</td>
                         <td>${paymentDate}</td>
                         <td>₪${amount}</td>
                         <td>${statusBadge}</td>
                         <td>${actions}</td>
                     `;
                        paymentsTableBody.appendChild(row);
                    });
                }
            } catch (err) {
                console.error('Failed to render payments:', err);
                // Fallback empty state
            }
        })();

        // AUTO-RENDER CONTRACTS (If on Contracts Page)
        const contractsTableBody = document.getElementById('contractsTableBody');
        if (contractsTableBody && window.rentMateDB) {
            (async () => {
                if (!window.rentMateDB.db) await new Promise(r => setTimeout(r, 500));

                // Skeleton
                contractsTableBody.innerHTML = Array(3).fill(0).map(() => `
                    <tr>
                        <td><div class="skeleton skeleton-text"></div></td>
                        <td><div class="skeleton skeleton-text"></div></td>
                        <td><div class="skeleton skeleton-text"></div></td>
                        <td><div class="skeleton skeleton-text"></div></td>
                        <td><div class="skeleton skeleton-text"></div></td>
                        <td><div class="skeleton skeleton-text"></div></td>
                    </tr>
                `).join('');

                try {
                    const contracts = await window.rentMateDB.getAll('contracts');

                    if (contracts.length === 0) {
                        contractsTableBody.innerHTML = `
                            <tr>
                                <td colspan="6">
                                    <div class="empty-state">
                                        <i class="ph ph-files empty-state-icon"></i>
                                        <h3>אין חוזים עדיין</h3>
                                        <p>צור את החוזה הראשון שלך בקלות.</p>
                                        <button class="btn btn-primary" onclick="document.getElementById('btnNewContract').click()">
                                            <i class="ph ph-plus"></i> חוזה חדש
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `;
                        return;
                    }

                    contractsTableBody.innerHTML = '';
                    contracts.forEach((contract, index) => {
                        const row = document.createElement('tr');
                        row.style.animation = `fadeInUp 0.3s ease forwards ${index * 0.05}s`;
                        row.style.opacity = '0'; // Start hidden for animation

                        const dateRange = `${new Date(contract.startDate).toLocaleDateString('he-IL')} - ${new Date(contract.endDate).toLocaleDateString('he-IL')}`;
                        const symbol = contract.currency === 'USD' ? '$' : '₪';

                        // Check status (simplified)
                        let statusBadge = '<span class="badge badge-success">פעיל</span>';
                        if (new Date(contract.endDate) < new Date()) {
                            statusBadge = '<span class="badge badge-error">הסתיים</span>';
                        }

                        row.innerHTML = `
                            <td class="fw-500">${contract.propertyAddress}</td>
                            <td>${contract.tenantName}</td>
                            <td>${dateRange}</td>
                            <td>${statusBadge}</td>
                            <td>${symbol}${Number(contract.amount).toLocaleString()}</td>
                            <td>
                                <button class="btn-icon" title="צפה בחוזה" onclick="window.viewContract(${contract.id})"><i class="ph ph-eye"></i></button>
                                <button class="btn-icon" title="הורד חוזה" onclick="window.downloadContract(${contract.id})"><i class="ph ph-download-simple"></i></button>
                                <button class="btn-icon text-primary" title="ערוך חוזה" onclick="window.editContract(${contract.id})"><i class="ph ph-pencil-simple"></i></button>
                                <button class="btn-icon text-danger" title="מחק חוזה" onclick="window.deleteContract(${contract.id})"><i class="ph ph-trash"></i></button>
                            </td>
                        `;
                        contractsTableBody.appendChild(row);
                    });

                } catch (err) {
                    console.error(err);
                    contractsTableBody.innerHTML = '<tr><td colspan="6" class="text-danger">שגיאה בטעינת חוזים</td></tr>';
                }
            })();
        }

        // Global Mark as Paid
        window.markAsPaid = async (contractId, amount, tenantName) => {
            if (!confirm(`האם לסמן את התשלום של ${tenantName} בסך ₪${amount} כשולם?`)) return;

            try {
                // Add payment record
                const payment = {
                    contractId: contractId,
                    amount: amount,
                    currency: 'ILS', // Default for now
                    date: new Date().toISOString(), // Paid *Now*
                    paidDate: new Date().toISOString(),
                    status: 'paid',
                    method: 'manual'
                };

                await window.rentMateDB.add('payments', payment);
                showToast(`התשלום עבור ${tenantName} עודכן בהצלחה!`, 'success');

                // Refresh Page (or re-run render logic, but reload is safer/easier)
                setTimeout(() => location.reload(), 500);

            } catch (err) {
                console.error(err);
                showToast('שגיאה בעדכון התשלום', 'error');
            }
        };

        // Global Send Reminder
        window.sendPaymentReminder = async (contractId, tenantName) => {
            const btn = event.currentTarget; // Get button to show loading
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
            btn.disabled = true;

            try {
                // Simulate network delay
                await new Promise(r => setTimeout(r, 1500));

                // Here we would call the email API
                // For now, just success toast
                showToast(`תזכורת תשלום נשלחה ל-${tenantName}`, 'success');

            } catch (err) {
                console.error(err);
                showToast('שגיאה בשליחת התזכורת', 'error');
            } finally {
                btn.innerHTML = originalHtml;
                btn.disabled = false;
            }
        };
        // Utility: XSS Sanitization
        function sanitize(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        // --- PROPERTY DETAILS MODAL ---
        window.showPropertyDetails = async (id) => {
            try {
                const prop = await window.rentMateDB.get('properties', id);
                if (!prop) return;

                console.log('Viewing Property Details:', prop);

                const statusText = prop.status === 'occupied' ? 'מושכר' : (prop.status === 'vacant' ? 'פנוי' : 'בשיפוץ');
                const price = Number(prop.price).toLocaleString();

                const details = `
            🏠 **${sanitize(prop.address)}, ${sanitize(prop.city)}**
            💰 גובה שכירות: ₪${price}
            📊 סטטוס: ${statusText}
            🚪 חדרים: ${sanitize(prop.rooms) || '-'}
        `;

                showToast(details, 'info');
            } catch (err) {
                console.error(err);
                showToast('שגיאה בטעינת פרטי הנכס', 'error');
            }
        };

        // --- TENANT DETAILS MODAL ---
        window.showTenantDetails = async (id) => {
            try {
                const tenant = await window.rentMateDB.get('tenants', id);
                if (!tenant) return;

                console.log('Viewing Tenant Details:', tenant);

                const details = `
            👤 **${sanitize(tenant.name)}**
            📧 ${sanitize(tenant.email) || '-'}
            📞 ${sanitize(tenant.phone) || '-'}
            🏠 נכס: ${sanitize(tenant.propertyAddress) || '-'}
        `;

                showToast(details, 'info');
            } catch (err) {
                console.error(err);
                showToast('שגיאה בטעינת פרטי הדייר', 'error');
            }
        };

        // --- ADMIN STATS LOADING ---
        async function loadAdminStats() {
            try {
                // Check if user is admin
                const isAdmin = await window.isAdmin?.();
                if (!isAdmin) return;

                // Load total users count
                const { data: users, error } = await window.supabaseService.getClient()
                    .from('user_profiles')
                    .select('id', { count: 'exact', head: true });

                if (!error && users !== null) {
                    const statElement = document.getElementById('statTotalUsers');
                    if (statElement) {
                        statElement.textContent = users.length || 0;
                    }
                }
            } catch (err) {
                console.error('Error loading admin stats:', err);
            }
        }

        // Call loadAdminStats if on dashboard
        if (document.getElementById('statTotalUsers')) {
            // Wait for auth to initialize
            setTimeout(loadAdminStats, 1000);
        }
    }
    // --- EMERGENCY FAILSAFE: Clear Overlays ---
    // If something crashes (like DB init), force remove stuck overlays after 3s
    setTimeout(() => {
        const stuckOverlays = document.querySelectorAll('.modal-overlay.open, .loader, .spinner-overlay, .backdrop');
        if (stuckOverlays.length > 0) {
            console.warn('Emergency Failsafe: Clearing stuck overlays', stuckOverlays);
            stuckOverlays.forEach(el => {
                el.classList.remove('open', 'active', 'show');
                el.style.display = 'none';
                el.style.opacity = '0';
                el.style.pointerEvents = 'none'; // Ensure clicks pass through
            });
            // Also reset body overflow just in case
            document.body.style.overflow = '';
        }
    }, 2000);

});

// --- Robust Initialization (Failsafe) ---
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        console.log('Running Robust Handlers Init');
        if (window.initAppHandlers) {
            window.initAppHandlers();
        } else {
            console.warn('initAppHandlers not found, attaching manually');
            const btnAddProp = document.getElementById('btnAddProperty');
            if (btnAddProp) btnAddProp.onclick = () => window.location.href = 'add-property.html';

            const btnAddTen = document.getElementById('btnAddTenant');
            if (btnAddTen) btnAddTen.onclick = () => window.location.href = 'add-tenant.html';
        }

        // Contracts Button Failsafe
        const btnNewContract = document.getElementById('btnNewContract');
        if (btnNewContract) {
            btnNewContract.onclick = () => window.location.href = 'add-contract.html';
        }

        // Attach Logout Handlers explicitly to any element that looks like a logout button
        const logoutLinks = document.querySelectorAll('a[href="#"][onclick*="logout"], .logout-btn');
        logoutLinks.forEach(link => {
            link.onclick = (e) => {
                e.preventDefault();
                if (window.logout) window.logout();
                else console.error('Logout function not found');
            };
        });

    }, 500);
});
