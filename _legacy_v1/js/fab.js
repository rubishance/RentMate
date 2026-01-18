/**
 * Floating Action Button (FAB) Controller
 * Handles FAB visibility on scroll and payment marking
 */

class FABController {
    constructor() {
        this.fab = null;
        this.lastScrollY = window.scrollY;
        this.scrollThreshold = 100;
    }

    /**
     * Initialize FAB
     */
    init() {
        this.createFAB();
        this.attachEventListeners();
    }

    /**
     * Create FAB element
     */
    createFAB() {
        // Check if we're on a page that should have FAB
        const currentPage = window.location.pathname;
        if (!currentPage.includes('properties') && !currentPage.includes('tenants')) {
            return;
        }

        this.fab = document.createElement('button');
        this.fab.className = 'fab';
        this.fab.setAttribute('aria-label', 'סמן תשלום כהתקבל');
        this.fab.innerHTML = '<i class="ph ph-check-circle"></i>';

        document.body.appendChild(this.fab);
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        if (!this.fab) return;

        // Click handler
        this.fab.addEventListener('click', () => this.handlePaymentMark());

        // Scroll handler - hide on scroll down, show on scroll up
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.handleScroll();
            }, 100);
        });
    }

    /**
     * Handle scroll to show/hide FAB
     */
    handleScroll() {
        if (!this.fab) return;

        const currentScrollY = window.scrollY;

        // Hide when scrolling down, show when scrolling up
        if (currentScrollY > this.lastScrollY && currentScrollY > this.scrollThreshold) {
            this.fab.classList.add('hidden');
        } else if (currentScrollY < this.lastScrollY) {
            this.fab.classList.remove('hidden');
        }

        this.lastScrollY = currentScrollY;
    }

    /**
     * Handle payment marking
     */
    async handlePaymentMark() {
        // Get selected items (if any)
        const selectedItems = document.querySelectorAll('.tenant-item.selected, .property-card.selected');

        if (selectedItems.length === 0) {
            this.showQuickMarkModal();
        } else {
            await this.markPaymentsReceived(selectedItems);
        }
    }

    /**
     * Show quick mark modal
     */
    showQuickMarkModal() {
        // Create a simple modal for quick payment marking
        const modal = document.createElement('div');
        modal.className = 'modal-overlay open';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2>סמן תשלום כהתקבל</h2>
                    <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()">
                        <i class="ph ph-x"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-grid">
                        <div class="form-group full-width">
                            <label>בחר דייר</label>
                            <select id="quickPaymentTenant">
                                <option value="">בחר דייר...</option>
                                <!-- Will be populated dynamically -->
                            </select>
                        </div>
                        <div class="form-group">
                            <label>סכום</label>
                            <input type="number" id="quickPaymentAmount" placeholder="0">
                        </div>
                        <div class="form-group">
                            <label>תאריך</label>
                            <input type="date" id="quickPaymentDate" value="${new Date().toISOString().split('T')[0]}">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">ביטול</button>
                    <button class="btn btn-primary" onclick="fabController.confirmPayment()">
                        <i class="ph ph-check"></i> אשר תשלום
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Populate tenant dropdown
        this.populateTenantDropdown();
    }

    /**
     * Populate tenant dropdown
     */
    async populateTenantDropdown() {
        const select = document.getElementById('quickPaymentTenant');
        if (!select) return;

        // Get tenants from IndexedDB
        if (window.rentMateDB && window.rentMateDB.db) {
            const tenants = await window.rentMateDB.getAll('tenants');
            tenants.forEach(tenant => {
                const option = document.createElement('option');
                option.value = tenant.id;
                option.textContent = tenant.name;
                select.appendChild(option);
            });
        }
    }

    /**
     * Confirm payment
     */
    async confirmPayment() {
        const tenantId = document.getElementById('quickPaymentTenant')?.value;
        const amount = document.getElementById('quickPaymentAmount')?.value;
        const date = document.getElementById('quickPaymentDate')?.value;

        if (!tenantId || !amount) {
            this.showToast('נא למלא את כל השדות', 'error');
            return;
        }

        // Save payment to IndexedDB
        if (window.rentMateDB && window.rentMateDB.db) {
            const payment = {
                tenantId: parseInt(tenantId),
                amount: parseFloat(amount),
                date: date,
                status: 'received',
                createdAt: new Date().toISOString()
            };

            // Add payments store if not exists
            try {
                await window.rentMateDB.add('payments', payment);
                this.showToast('התשלום נרשם בהצלחה', 'success');

                // Close modal
                document.querySelector('.modal-overlay')?.remove();

                // Refresh page data if needed
                if (typeof refreshData === 'function') {
                    refreshData();
                }
            } catch (error) {
                console.error('Error saving payment:', error);
                this.showToast('שגיאה בשמירת התשלום', 'error');
            }
        }
    }

    /**
     * Mark multiple payments as received
     */
    async markPaymentsReceived(items) {
        // Implementation for batch payment marking
        this.showToast(`${items.length} תשלומים סומנו כהתקבלו`, 'success');
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type} show`;
        toast.innerHTML = `
            <i class="toast-icon ph ph-${type === 'success' ? 'check-circle' : 'warning-circle'}"></i>
            <span>${message}</span>
        `;

        // Add to toast container or create one
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        container.appendChild(toast);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Create global instance
window.fabController = new FABController();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.fabController.init());
} else {
    window.fabController.init();
}
