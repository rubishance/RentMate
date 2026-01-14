// --- PROPERTY DETAILS MODAL ---
window.showPropertyDetails = async (id) => {
    try {
        const prop = await window.rentMateDB.get('properties', id);
        if (!prop) return;

        console.log('Viewing Property Details:', prop);

        // For now, using a structured toast - can be upgraded to a full modal later
        const statusText = prop.status === 'occupied' ? 'מושכר' : (prop.status === 'vacant' ? 'פנוי' : 'בשיפוץ');
        const price = Number(prop.price).toLocaleString();

        const details = `
            🏠 **${prop.address}, ${prop.city}**
            💰 גובה שכירות: ₪${price}
            📊 סטטוס: ${statusText}
            🚪 חדרים: ${prop.rooms || '-'}
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
            👤 **${tenant.name}**
            📧 ${tenant.email || '-'}
            📞 ${tenant.phone || '-'}
            🏠 נכס: ${tenant.propertyAddress || '-'}
        `;

        showToast(details, 'info');
    } catch (err) {
        console.error(err);
        showToast('שגיאה בטעינת פרטי הדייר', 'error');
    }
};

// --- SETTINGS SAVE LOGIC ---
const btnSaveSettings = document.getElementById('btnSaveSettings');
if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', async () => {
        const userName = document.getElementById('userName')?.value;
        const userEmail = document.getElementById('userEmail')?.value;
        const userPhone = document.getElementById('userPhone')?.value;
        const currency = document.getElementById('currency')?.value;
        const language = document.getElementById('language')?.value;
        const notifications = document.getElementById('notifications')?.checked;

        const settings = {
            id: 'user_settings',
            userName,
            userEmail,
            userPhone,
            currency,
            language,
            notifications,
            updatedAt: new Date().toISOString()
        };

        try {
            await window.rentMateDB.put('settings', settings);
            showToast('ההגדרות נשמרו בהצלחה', 'success');
        } catch (err) {
            console.error('Failed to save settings:', err);
            showToast('שגיאה בשמירת ההגדרות', 'error');
        }
    });

    // Load settings on page load
    (async () => {
        try {
            const settings = await window.rentMateDB.get('settings', 'user_settings');
            if (settings) {
                const userNameInput = document.getElementById('userName');
                const userEmailInput = document.getElementById('userEmail');
                const userPhoneInput = document.getElementById('userPhone');
                const currencyInput = document.getElementById('currency');
                const languageInput = document.getElementById('language');
                const notificationsInput = document.getElementById('notifications');

                if (userNameInput) userNameInput.value = settings.userName || '';
                if (userEmailInput) userEmailInput.value = settings.userEmail || '';
                if (userPhoneInput) userPhoneInput.value = settings.userPhone || '';
                if (currencyInput) currencyInput.value = settings.currency || 'ILS';
                if (languageInput) languageInput.value = settings.language || 'he';
                if (notificationsInput) notificationsInput.checked = settings.notifications !== false;
            }
        } catch (err) {
            console.error('Failed to load settings:', err);
        }
    })();
}

// --- PAYMENTS REPORT DOWNLOAD ---
if (location.pathname.includes('payments.html')) {
    const paymentsHeader = document.querySelector('.page-header');
    if (paymentsHeader) {
        const btnDownloadReport = paymentsHeader.querySelector('.btn-outline');
        if (btnDownloadReport) {
            btnDownloadReport.onclick = async () => {
                try {
                    const contracts = await window.rentMateDB.getAll('contracts');
                    const activeContracts = contracts.filter(c => c.status === 'active' || !c.endDate || new Date(c.endDate) > new Date());

                    if (activeContracts.length === 0) {
                        showToast('אין חוזים פעילים להפקת דוח', 'warning');
                        return;
                    }

                    let csv = '\ufeffנכס,דייר,סכום,תאריך יעד,סטטוס\n';
                    activeContracts.forEach(c => {
                        const price = Number(c.amount || c.price || 0).toLocaleString();
                        const nextDate = new Date();
                        const day = new Date(c.startDate).getDate();
                        nextDate.setDate(day);
                        csv += `"${c.propertyAddress}","${c.tenantName}","₪${price}","${nextDate.toLocaleDateString('he-IL')}","ממתין"\n`;
                    });

                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `דוח_תשלומים_${new Date().toLocaleDateString('he-IL').replace(/\//g, '-')}.csv`;
                    link.click();
                    showToast('דוח התשלומים ירד בהצלחה', 'success');
                } catch (err) {
                    console.error('Failed to download report:', err);
                    showToast('שגיאה בהורדת הדוח', 'error');
                }
            };
        }
    }
}
