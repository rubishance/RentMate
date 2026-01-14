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

    // --- Contract Page Logic ---
    const btnNewContract = document.getElementById('btnNewContract');
    const modalOverlay = document.getElementById('contractModal');
    const btnCloseModal = document.getElementById('closeModal');
    const btnCancel = document.getElementById('btnCancel');

    // Only init if we are on contracts page
    if (btnNewContract && modalOverlay) {

        // Open Modal
        btnNewContract.addEventListener('click', () => {
            modalOverlay.classList.add('open');
            resetModal();
        });

        // Close Modal
        const closeModal = () => modalOverlay.classList.remove('open');
        btnCloseModal.addEventListener('click', closeModal);
        btnCancel.addEventListener('click', closeModal);

        // Close on click outside
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });

        // Scan Logic
        const scanBox = document.getElementById('scanDropzone');
        const scanSection = document.getElementById('scanSection');
        const contractForm = document.getElementById('contractForm');

        // 1. Trigger File Selection
        const fileInput = document.getElementById('contractFileInput');
        // Legacy btnScan removed

        // 2. Handle File Selection
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // --- VALIDATION START ---
            const MAX_SIZE_MB = 10;
            const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

            // 1. Check Size
            if (file.size > MAX_SIZE_MB * 1024 * 1024) {
                showToast(`הקובץ גדול מדי. מקסימום ${MAX_SIZE_MB}MB.`, 'error');
                e.target.value = ''; // Reset input
                return;
            }

            // 2. Check Type
            if (!ALLOWED_TYPES.includes(file.type)) {
                showToast('סוג קובץ לא נתמך. מותר: PDF, JPEG, PNG.', 'error');
                e.target.value = ''; // Reset input
                return;
            }
            // --- VALIDATION END ---

            // UI Loading State
            scanBox.classList.add('scanning');
            // Update btnUploadFile text if specific button was clicked? 
            // We can just use the scanBox or general status as feedback.

            // disable buttons
            const btnUploadFile = document.getElementById('btnUploadFile');
            if (btnUploadFile) {
                btnUploadFile.innerHTML = '<i class="ph ph-spinner ph-spin"></i> מעבד...';
                btnUploadFile.disabled = true;
            }

            try {
                await processAndUploadFile(file);
            } catch (error) {
                console.error(error);
                showToast('שגיאה בעיבוד הקובץ', 'error');
            } finally {
                scanBox.classList.remove('scanning');
                if (btnUploadFile) {
                    btnUploadFile.innerHTML = '<i class="ph ph-upload"></i> העלה קובץ';
                    btnUploadFile.disabled = false;
                }
            }
        });

        // Camera Capture Logic
        const btnCamera = document.getElementById('btnCamera');
        const btnUploadFile = document.getElementById('btnUploadFile'); // Defined closer to usage validation logic
        const cameraModal = document.getElementById('cameraModal');
        const closeCameraModal = document.getElementById('closeCameraModal');
        const cameraVideo = document.getElementById('cameraVideo');
        const cameraCanvas = document.getElementById('cameraCanvas');
        const btnCapture = document.getElementById('btnCapture');
        const compressionProgress = document.getElementById('compressionProgress');
        const compressionStatus = document.getElementById('compressionStatus');
        const progressFill = document.getElementById('progressFill');

        let cameraStream = null;

        // Open camera modal
        if (btnCamera) {
            btnCamera.addEventListener('click', async () => {
                try {
                    cameraModal.classList.add('open');

                    // Request camera access
                    cameraStream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
                        audio: false
                    });

                    cameraVideo.srcObject = cameraStream;
                } catch (error) {
                    console.error('Camera access error:', error);
                    cameraModal.classList.remove('open');
                    showToast('לא ניתן לגשת למצלמה. אנא וודא שהרשאות המצלמה מאושרות ונסה שנית.', 'error');
                }
            });
        }

        // Close camera modal
        const closeCameraFn = () => {
            cameraModal.classList.remove('open');
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
                cameraStream = null;
            }
        };

        if (closeCameraModal) closeCameraModal.addEventListener('click', closeCameraFn);
        if (cameraModal) {
            cameraModal.addEventListener('click', (e) => {
                if (e.target === cameraModal) closeCameraFn();
            });
        }

        // Capture photo from camera
        if (btnCapture) {
            btnCapture.addEventListener('click', async () => {
                // Capture from video to canvas
                const context = cameraCanvas.getContext('2d');
                cameraCanvas.width = cameraVideo.videoWidth;
                cameraCanvas.height = cameraVideo.videoHeight;
                context.drawImage(cameraVideo, 0, 0);

                // Convert canvas to blob
                cameraCanvas.toBlob(async (blob) => {
                    const file = new File([blob], `contract_${Date.now()}.jpg`, { type: 'image/jpeg' });

                    closeCameraFn();

                    // Process the captured file
                    await processAndUploadFile(file);
                }, 'image/jpeg', 0.95);
            });
        }

        // Upload file button Listener
        if (btnUploadFile) {
            btnUploadFile.addEventListener('click', () => fileInput.click());
        }

        // Process and upload file with compression
        async function processAndUploadFile(file) {
            // Show compression progress
            if (compressionProgress) compressionProgress.classList.remove('hidden');
            if (progressFill) progressFill.style.width = '10%';
            if (compressionStatus) compressionStatus.textContent = 'בודק קובץ...';

            try {
                let filesToProcess = [];

                // 1. Handle PDF Conversion or Single Image
                if (FileCompression.isPdf(file)) {
                    if (compressionStatus) compressionStatus.textContent = 'ממיר PDF לתמונות...';
                    if (progressFill) progressFill.style.width = '20%';
                    filesToProcess = await FileCompression.convertPdfToImages(file);
                    console.log(`Converted PDF to ${filesToProcess.length} images`);
                } else {
                    filesToProcess = [file];
                }

                const finalFilesToUpload = [];
                let totalOriginalSize = 0;
                let totalCompressedSize = 0;

                // 2. Process/Compress each file
                for (let i = 0; i < filesToProcess.length; i++) {
                    const currentFile = filesToProcess[i];
                    totalOriginalSize += currentFile.size;

                    const progressStep = 20 + ((i + 1) / filesToProcess.length * 50); // 20% to 70%
                    if (progressFill) progressFill.style.width = `${progressStep}%`;
                    if (compressionStatus) compressionStatus.textContent = filesToProcess.length > 1
                        ? `מעבד דף ${i + 1} מתוך ${filesToProcess.length}...`
                        : 'מכווץ תמונה...';

                    if (FileCompression.shouldCompress(currentFile)) {
                        const result = await FileCompression.compressImage(currentFile);
                        finalFilesToUpload.push(result.file);
                        totalCompressedSize += result.file.size;
                    } else {
                        finalFilesToUpload.push(currentFile);
                        totalCompressedSize += currentFile.size;
                    }
                }

                // Stats
                const originalSizeStr = FileCompression.formatFileSize(totalOriginalSize);
                const compressedSizeStr = FileCompression.formatFileSize(totalCompressedSize);
                const savings = totalOriginalSize > 0
                    ? ((1 - (totalCompressedSize / totalOriginalSize)) * 100).toFixed(0)
                    : 0;

                if (compressionStatus) compressionStatus.textContent = `מוכן להעלאה: ${originalSizeStr} → ${compressedSizeStr} (${savings}% חיסכון)`;
                if (progressFill) progressFill.style.width = '75%';

                // 3. Upload to server
                if (compressionStatus) compressionStatus.textContent = 'מעלה לשרת ומבצע סריקת AI...';
                if (progressFill) progressFill.style.width = '85%';
                if (scanBox) scanBox.classList.add('scanning');

                const formData = new FormData();
                finalFilesToUpload.forEach(f => {
                    formData.append('contractFile', f);
                });

                const response = await fetch(`${CONFIG.API_URL}/api/scan-contract`, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) throw new Error('Server Error');

                const data = await response.json();

                // Success
                if (progressFill) progressFill.style.width = '100%';
                if (compressionStatus) compressionStatus.textContent = 'הסריקה הושלמה בהצלחה!';
                if (scanBox) scanBox.classList.remove('scanning');

                setTimeout(() => {
                    if (compressionProgress) compressionProgress.classList.add('hidden');
                    if (progressFill) progressFill.style.width = '0%';
                    if (scanSection) scanSection.classList.add('hidden');
                    if (contractForm) contractForm.classList.remove('hidden');
                    populateFormWithRealData(data);
                    showToast('פרטי החוזה חולצו בהצלחה!', 'success');
                }, 1000);

            } catch (error) {
                console.error('Error processing file:', error);
                if (scanBox) scanBox.classList.remove('scanning');
                if (compressionProgress) compressionProgress.classList.add('hidden');
                if (progressFill) progressFill.style.width = '0%';

                let msg = 'שגיאה בעיבוד הקובץ.';
                if (error.message.includes('Server Error')) msg = 'שגיאה בשרת. אנא נסה מאוחר יותר.';
                if (error.message.includes('NetworkError')) msg = 'בעיית חיבור. בדוק את החיבור לאינטרנט.';

                showToast(msg, 'error');
            }
        }

        function resetModal() {
            scanSection.classList.remove('hidden');
            contractForm.classList.add('hidden');
            document.getElementById('renewalOptionsList').innerHTML = '';

            // Clear ID logic
            const idInput = document.getElementById('contractId');
            if (idInput) idInput.value = '';

            const modalParams = document.querySelector('#contractModal h2');
            if (modalParams) modalParams.textContent = 'חוזה חדש';
            const btnSave = document.getElementById('btnSaveContract');
            if (btnSave) btnSave.textContent = 'שמור חוזה';

            // Reset inputs
            document.querySelectorAll('#contractForm input').forEach(i => {
                if (i.type === 'checkbox') i.checked = false;
                else i.value = '';
            });
            // Reset upload button state just in case
            if (btnUploadFile) {
                btnUploadFile.innerHTML = '<i class="ph ph-upload"></i> העלה קובץ';
                btnUploadFile.disabled = false;
            }
        }

        function populateFormWithRealData(data) {
            // Helper to extract value safely (whether it's raw string or {value, quote} object)
            const getVal = (field) => {
                if (!field) return null;
                if (typeof field === 'object' && 'value' in field) return field.value;
                return field;
            };

            // Helper to get quote (tooltip)
            const getQuote = (field) => {
                if (!field || typeof field !== 'object' || !field.quote) return '';
                return `מקור בחוזה: "${field.quote}"`;
            };

            // Helper to set input with tooltip
            const setInput = (id, fieldData) => {
                const el = document.getElementById(id);
                if (!el) return;

                const val = getVal(fieldData);
                const quote = getQuote(fieldData);

                if (val !== null && val !== undefined) {
                    if (el.type === 'checkbox') {
                        el.checked = !!val;
                    } else {
                        el.value = val;
                    }

                    // Add Tooltip / Title
                    if (quote) {
                        el.title = quote;
                        el.style.borderColor = '#4da6ff'; // Highlight fields with data
                        // Ideally we could append a small icon next to it, 
                        // but title attribute is the simplest non-breaking change.
                    }
                }
            };

            // Use provided data or fallback to defaults if some fields are missing
            const mockData = data || {};

            // Ensuring Defaults handled by getVal check
            const property = mockData.property || "לא זוהה נכס";

            // Asset Creation Check
            (async () => {
                if (!window.rentMateDB) return;
                const allProps = await window.rentMateDB.getAll('properties');
                const propVal = getVal(property);
                if (propVal && !allProps.find(p => p.address === propVal)) {
                    showToast(`נכס חדש "${propVal}" זוהה בסריקה.`, 'info');
                }
            })();

            // Fill Fields using helper
            setInput('inpProperty', mockData.property);
            setInput('inpTenantName', mockData.tenantName);
            setInput('inpTenantID', mockData.tenantID);
            setInput('inpTenantEmail', mockData.tenantEmail);
            setInput('inpTenantPhone', mockData.tenantPhone);

            setInput('inpAmount', mockData.amount);
            setInput('inpCurrency', mockData.currency);
            setInput('inpFreq', mockData.freq);

            setInput('inpStart', mockData.start);
            setInput('inpEnd', mockData.end);

            setInput('inpLinkageType', mockData.linkageType);
            setInput('inpBaseIndexDate', mockData.baseIndexDate);

            setInput('chkParking', mockData.parking);
            setInput('chkStorage', mockData.storage);
            setInput('chkPainting', mockData.painting);
            setInput('inpFurniture', mockData.furniture);

            // Render Renewals (Handle Value array)
            const renewalList = document.getElementById('renewalOptionsList');
            renewalList.innerHTML = '';

            const renewalsVal = getVal(mockData.renewals) || [];
            const renewalsQuote = getQuote(mockData.renewals);

            if (renewalsVal.length > 0) {
                // If there's a main quote for the section, show it
                if (renewalsQuote) {
                    const quoteDiv = document.createElement('div');
                    quoteDiv.className = 'renewal-quote';
                    quoteDiv.style.fontSize = '0.8rem';
                    quoteDiv.style.color = '#666';
                    quoteDiv.style.marginBottom = '0.5rem';
                    quoteDiv.style.fontStyle = 'italic';
                    quoteDiv.innerText = renewalsQuote;
                    renewalList.appendChild(quoteDiv);
                }

                renewalsVal.forEach(opt => {
                    const div = document.createElement('div');
                    div.className = 'renewal-item';
                    div.innerHTML = `<strong>${opt.title || 'אופציה'}</strong>: ${opt.desc || ''}`;
                    renewalList.appendChild(div);
                });
            }
        }

        // Save Contract Logic
        document.getElementById('btnSaveContract').addEventListener('click', async () => {
            const btnSave = document.getElementById('btnSaveContract');
            const originalText = btnSave.innerHTML;
            btnSave.innerHTML = '<i class="ph ph-spinner ph-spin"></i> שומר...';
            btnSave.disabled = true;

            try {
                // 1. Gather Data from DOM
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
                    freq: document.getElementById('inpFreq').value,
                    furniture: document.getElementById('inpFurniture').value,
                    linkageType: document.getElementById('inpLinkageType').value,
                    paymentDates: [] // Pending full implementation
                };

                if (!window.rentMateDB) {
                    throw new Error('Database not initialized');
                }

                // 2. Resolve/Create Property
                let propertyId = null;
                const properties = await window.rentMateDB.getAll('properties');
                const existingProp = properties.find(p => p.address === rawData.propertyStr);

                if (existingProp) {
                    propertyId = existingProp.id;
                } else if (rawData.propertyStr) {
                    // Create new Property
                    const newProp = {
                        address: rawData.propertyStr,
                        type: 'residential', // Default
                        rooms: 3, // Default/Unknown
                        size: 0,
                        price: Number(rawData.amount) || 0,
                        status: 'occupied',
                        image: null // Could use first page of contract later?
                    };
                    propertyId = await window.rentMateDB.add('properties', newProp);
                    showToast(`נכס חדש נוצר: ${rawData.propertyStr}`, 'success');
                }

                // 3. Resolve/Create Tenant
                let tenantId = null;
                const tenants = await window.rentMateDB.getAll('tenants');
                // Match by ID first, then Name
                const existingTenant = tenants.find(t =>
                    (rawData.tenantID && t.idNumber === rawData.tenantID) ||
                    t.name === rawData.tenantName
                );

                if (existingTenant) {
                    tenantId = existingTenant.id;
                    // Optional: Update missing details?
                } else if (rawData.tenantName) {
                    const newTenant = {
                        name: rawData.tenantName,
                        idNumber: rawData.tenantID,
                        phone: rawData.tenantPhone,
                        email: rawData.tenantEmail,
                        status: 'active',
                        propertyId: propertyId // Link immediately to this property
                    };
                    tenantId = await window.rentMateDB.add('tenants', newTenant);
                    showToast(`דייר חדש נוצר: ${rawData.tenantName}`, 'success');
                }

                // 4. Save Contract
                const contract = {
                    propertyId: propertyId,
                    tenantId: tenantId,
                    propertyAddress: rawData.propertyStr, // Denormalized for easier display
                    tenantName: rawData.tenantName,       // Denormalized
                    startDate: rawData.start,
                    endDate: rawData.end,
                    amount: Number(rawData.amount),
                    currency: rawData.currency,
                    paymentFrequency: rawData.freq,
                    linkageType: rawData.linkageType,
                    furnitureInfo: rawData.furniture,
                    status: 'active',
                    // Keep original created_at if updating
                    created_at: undefined // Will be handled below
                };

                const contractId = document.getElementById('contractId').value;
                if (contractId) {
                    await window.rentMateDB.updateContract(Number(contractId), contract);
                    showToast('החוזה עודכן בהצלחה', 'success');
                } else {
                    // CREATE
                    contract.created_at = new Date().toISOString();
                    await window.rentMateDB.add('contracts', contract);
                    showToast('החוזה נוצר בהצלחה', 'success');
                }

                // 5. Update UI (Reload list or add row)
                // Re-fetch logic or simple append (simulated for speed)
                setTimeout(() => location.reload(), 500);

                closeModal();

            } catch (error) {
                console.error('Save failed:', error);
                showToast('שגיאה בשמירת החוזה', 'error');
            } finally {
                btnSave.innerHTML = originalText;
                btnSave.disabled = false;
            }
        });
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
    const propertiesGrid = document.getElementById('propertiesGrid');

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
        window.editProperty = async (id) => {
            try {
                const prop = await window.rentMateDB.get('properties', id);
                if (!prop) {
                    showToast('הנכס לא נמצא', 'error');
                    return;
                }

                // Populate Form
                document.getElementById('propId').value = prop.id;
                document.getElementById('propAddress').value = prop.address;
                document.getElementById('propCity').value = prop.city;
                document.getElementById('propStatus').value = prop.status;
                document.getElementById('propPrice').value = prop.price;
                document.getElementById('propRooms').value = prop.rooms || '';

                // Change Title/Button
                document.querySelector('#propertyModal h2').textContent = 'עריכת נכס';
                document.getElementById('btnSaveProperty').textContent = 'עדכן נכס';

                // Open Modal
                document.getElementById('propertyModal').classList.add('open');
            } catch (err) {
                console.error(err);
                showToast('שגיאה בטעינת הנכס', 'error');
            }
        };
    }

    if (btnAddProperty && propertyModal) {
        // Open Modal (Add Mode)
        btnAddProperty.addEventListener('click', () => {
            propertyModal.classList.add('open');
            document.getElementById('propertyForm').reset();
            document.getElementById('propId').value = ''; // Clear ID
            document.querySelector('#propertyModal h2').textContent = 'הוספת נכס חדש';
            document.getElementById('btnSaveProperty').textContent = 'שמור נכס';
        });

        // Close Modal Handlers
        const closePropModal = () => propertyModal.classList.remove('open');
        btnClosePropertyModal.addEventListener('click', closePropModal);
        btnCancelProperty.addEventListener('click', closePropModal);
        propertyModal.addEventListener('click', (e) => {
            if (e.target === propertyModal) closePropModal();
        });

        // Save Property Logic
        btnSaveProperty.addEventListener('click', async () => {
            const id = document.getElementById('propId').value; // Check for ID
            const address = document.getElementById('propAddress').value;
            const city = document.getElementById('propCity').value;
            const status = document.getElementById('propStatus').value;
            const price = document.getElementById('propPrice').value;
            const rooms = document.getElementById('propRooms').value;

            // Only address and city are required
            if (!address || !city) {
                showToast('אנא מלא כתובת ועיר', 'error');
                return;
            }

            try {
                const propertyData = {
                    title: address,
                    address,
                    city,
                    status,
                    price: price || 0,
                    rooms: rooms || 0,
                    type: 'apartment',
                    // Preserve created_at if editing, else new
                    created_at: id ? undefined : new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                if (id) {
                    await window.rentMateDB.updateProperty(Number(id), propertyData);
                    showToast('הנכס עודכן בהצלחה', 'success');
                } else {
                    // CREATE
                    await window.rentMateDB.add('properties', propertyData);
                    showToast('הנכס נוסף בהצלחה', 'success');
                }

                closePropModal();

                // Reload page to show new property
                setTimeout(() => location.reload(), 500);
            } catch (error) {
                console.error('Error saving property:', error);
                showToast('שגיאה בשמירת הנכס', 'error');
            }
        });
    }

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

        // Wait for DB to be ready
        let retries = 0;
        while (!window.rentMateDB.db && retries < 15) {
            await new Promise(r => setTimeout(r, 200));
            retries++;
        }

        if (!window.rentMateDB.db) {
            console.error('Database failed to initialize in time');
            tenantsList.innerHTML = `<p class="text-danger">שגיאה בטעינת דיירים - נסה לרענן</p>`;
            return;
        }

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
                    <button class="btn-icon text-primary" title="ערוך דייר" onclick="window.editTenant(${tenant.id})">
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
                const modal = document.getElementById('propertyModal');
                if (modal) {
                    modal.classList.add('open');
                    // Reset form
                    const form = document.getElementById('propertyForm');
                    if (form) form.reset();
                    document.getElementById('propId').value = '';
                    const h2 = modal.querySelector('h2');
                    if (h2) h2.textContent = 'הוספת נכס חדש';
                    const btn = document.getElementById('btnSaveProperty');
                    if (btn) btn.textContent = 'שמור נכס';
                }
            };
        }

        // Tenants
        const btnAddTenant = document.getElementById('btnAddTenant');
        if (btnAddTenant) {
            btnAddTenant.onclick = window.openTenantModal;
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
});
