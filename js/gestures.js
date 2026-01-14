/**
 * Touch Gesture Handler
 * Handles swipe, pull-to-refresh, and long-press gestures
 */

class GestureHandler {
    constructor() {
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.touchStartTime = 0;
        this.longPressTimer = null;
        this.swipeThreshold = 50;
        this.longPressDelay = 500;
        this.pullThreshold = 80;
        this.isPulling = false;
    }

    /**
     * Initialize gesture handlers
     */
    init() {
        this.initSwipeGestures();
        this.initPullToRefresh();
        this.initLongPress();
    }

    /**
     * Initialize swipe gestures on list items
     */
    initSwipeGestures() {
        const swipeItems = document.querySelectorAll('.tenant-item, .property-card');

        swipeItems.forEach(item => {
            // Wrap item in swipe container if not already
            if (!item.parentElement.classList.contains('swipe-container')) {
                const container = document.createElement('div');
                container.className = 'swipe-container';
                item.parentNode.insertBefore(container, item);
                container.appendChild(item);

                // Add swipe actions
                this.addSwipeActions(container, item);
            }

            item.classList.add('swipe-item');

            item.addEventListener('touchstart', (e) => this.handleSwipeStart(e, item), { passive: true });
            item.addEventListener('touchmove', (e) => this.handleSwipeMove(e, item), { passive: false });
            item.addEventListener('touchend', (e) => this.handleSwipeEnd(e, item), { passive: true });
        });
    }

    /**
     * Add swipe action buttons
     */
    addSwipeActions(container, item) {
        const actions = document.createElement('div');
        actions.className = 'swipe-actions right';
        actions.innerHTML = `
            <button class="swipe-action-btn delete" data-action="delete">
                <i class="ph ph-trash"></i>
            </button>
            <button class="swipe-action-btn archive" data-action="archive">
                <i class="ph ph-archive"></i>
            </button>
        `;

        container.appendChild(actions);

        // Add click handlers
        actions.querySelectorAll('.swipe-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                this.handleSwipeAction(action, item);
            });
        });
    }

    /**
     * Handle swipe start
     */
    handleSwipeStart(e, item) {
        this.touchStartX = e.changedTouches[0].screenX;
        this.touchStartY = e.changedTouches[0].screenY;
        this.touchStartTime = Date.now();
    }

    /**
     * Handle swipe move
     */
    handleSwipeMove(e, item) {
        const currentX = e.changedTouches[0].screenX;
        const currentY = e.changedTouches[0].screenY;
        const diffX = this.touchStartX - currentX;
        const diffY = this.touchStartY - currentY;

        // Only swipe if horizontal movement is greater than vertical
        if (Math.abs(diffX) > Math.abs(diffY)) {
            e.preventDefault(); // Prevent scrolling

            // Limit swipe distance
            const maxSwipe = 80;
            const swipeDistance = Math.min(Math.abs(diffX), maxSwipe);

            if (diffX > 0) {
                // Swiping left
                item.style.transform = `translateX(-${swipeDistance}px)`;
            } else {
                // Swiping right
                item.style.transform = `translateX(${swipeDistance}px)`;
            }
        }
    }

    /**
     * Handle swipe end
     */
    handleSwipeEnd(e, item) {
        this.touchEndX = e.changedTouches[0].screenX;
        this.touchEndY = e.changedTouches[0].screenY;

        const diffX = this.touchStartX - this.touchEndX;
        const diffY = this.touchStartY - this.touchEndY;

        // Check if it's a swipe (not a tap)
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > this.swipeThreshold) {
            if (diffX > 0) {
                // Swipe left - show actions
                item.classList.add('swiping-left');
                item.style.transform = 'translateX(-80px)';
            } else {
                // Swipe right - hide actions
                this.resetSwipe(item);
            }
        } else {
            // Not a swipe, reset
            this.resetSwipe(item);
        }
    }

    /**
     * Reset swipe state
     */
    resetSwipe(item) {
        item.classList.remove('swiping-left', 'swiping-right');
        item.style.transform = 'translateX(0)';
    }

    /**
     * Handle swipe action (delete/archive)
     */
    async handleSwipeAction(action, item) {
        if (action === 'delete') {
            // Confirm deletion
            if (confirm('האם אתה בטוח שברצונך למחוק?')) {
                // Animate out
                item.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
                item.style.transform = 'translateX(-100%)';
                item.style.opacity = '0';

                setTimeout(() => {
                    item.parentElement.remove();
                    this.showToast('נמחק בהצלחה', 'success');
                }, 300);
            } else {
                this.resetSwipe(item);
            }
        } else if (action === 'archive') {
            // Archive item
            item.style.transition = 'opacity 0.3s ease';
            item.style.opacity = '0.5';
            this.showToast('הועבר לארכיון', 'info');
            this.resetSwipe(item);
        }
    }

    /**
     * Initialize pull-to-refresh
     */
    initPullToRefresh() {
        const containers = document.querySelectorAll('.properties-grid, .tenant-list, .contracts-table-container');

        containers.forEach(container => {
            // Add pull indicator
            const indicator = document.createElement('div');
            indicator.className = 'pull-refresh-indicator';
            indicator.innerHTML = '<div class="spinner"></div>';

            const wrapper = document.createElement('div');
            wrapper.className = 'pull-refresh-container';
            container.parentNode.insertBefore(wrapper, container);
            wrapper.appendChild(indicator);
            wrapper.appendChild(container);

            let startY = 0;
            let currentY = 0;

            wrapper.addEventListener('touchstart', (e) => {
                if (container.scrollTop === 0) {
                    startY = e.touches[0].pageY;
                }
            }, { passive: true });

            wrapper.addEventListener('touchmove', (e) => {
                if (container.scrollTop === 0) {
                    currentY = e.touches[0].pageY;
                    const pullDistance = currentY - startY;

                    if (pullDistance > 0) {
                        e.preventDefault();
                        indicator.classList.add('pulling');
                        indicator.style.transform = `translateX(-50%) translateY(${Math.min(pullDistance, this.pullThreshold)}px)`;
                    }
                }
            }, { passive: false });

            wrapper.addEventListener('touchend', async () => {
                const pullDistance = currentY - startY;

                if (pullDistance > this.pullThreshold) {
                    indicator.classList.add('refreshing');
                    await this.refreshData();
                }

                indicator.classList.remove('pulling', 'refreshing');
                indicator.style.transform = 'translateX(-50%) translateY(0)';
                startY = 0;
                currentY = 0;
            }, { passive: true });
        });
    }

    /**
     * Initialize long-press gesture
     */
    initLongPress() {
        const items = document.querySelectorAll('.property-card, .tenant-item');

        items.forEach(item => {
            item.addEventListener('touchstart', (e) => {
                this.longPressTimer = setTimeout(() => {
                    this.handleLongPress(item, e);
                }, this.longPressDelay);
            }, { passive: true });

            item.addEventListener('touchend', () => {
                clearTimeout(this.longPressTimer);
            }, { passive: true });

            item.addEventListener('touchmove', () => {
                clearTimeout(this.longPressTimer);
            }, { passive: true });
        });
    }

    /**
     * Handle long-press
     */
    handleLongPress(item, event) {
        // Vibrate if supported
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }

        // Show context menu
        this.showContextMenu(item, event);
    }

    /**
     * Show context menu
     */
    showContextMenu(item, event) {
        // Remove existing context menus
        document.querySelectorAll('.context-menu').forEach(menu => menu.remove());

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.position = 'fixed';
        menu.style.top = `${event.touches[0].pageY}px`;
        menu.style.left = `${event.touches[0].pageX}px`;
        menu.innerHTML = `
            <div class="context-menu-item" data-action="edit">
                <i class="ph ph-pencil"></i> ערוך
            </div>
            <div class="context-menu-item" data-action="delete">
                <i class="ph ph-trash"></i> מחק
            </div>
            <div class="context-menu-item" data-action="share">
                <i class="ph ph-share"></i> שתף
            </div>
        `;

        document.body.appendChild(menu);

        // Handle menu item clicks
        menu.querySelectorAll('.context-menu-item').forEach(menuItem => {
            menuItem.addEventListener('click', () => {
                const action = menuItem.dataset.action;
                this.handleContextAction(action, item);
                menu.remove();
            });
        });

        // Close menu on outside click
        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 100);
    }

    /**
     * Handle context menu action
     */
    handleContextAction(action, item) {
        console.log(`Action: ${action}`, item);
        this.showToast(`פעולה: ${action}`, 'info');
    }

    /**
     * Refresh data
     */
    async refreshData() {
        // Simulate data refresh
        return new Promise(resolve => {
            setTimeout(() => {
                this.showToast('הנתונים עודכנו', 'success');
                resolve();
            }, 1500);
        });
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        if (window.fabController) {
            window.fabController.showToast(message, type);
        }
    }
}

// Create global instance
window.gestureHandler = new GestureHandler();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.gestureHandler.init());
} else {
    window.gestureHandler.init();
}
