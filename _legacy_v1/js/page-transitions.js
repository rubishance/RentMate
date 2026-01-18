/**
 * Page Transitions Controller
 * Adds smooth fade transitions between pages
 */

class PageTransitions {
    constructor() {
        this.transitionDuration = 300; // milliseconds
        this.isTransitioning = false;
    }

    init() {
        // Add transition overlay to body
        this.createOverlay();

        // Intercept navigation links
        this.interceptLinks();

        // Show page with fade-in on load
        this.fadeIn();

        console.log('Page transitions initialized');
    }

    createOverlay() {
        // Check if overlay already exists
        if (document.getElementById('page-transition-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'page-transition-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--bg-primary, #ffffff);
            opacity: 0;
            pointer-events: none;
            z-index: 9999;
            transition: opacity ${this.transitionDuration}ms ease-in-out;
        `;
        document.body.appendChild(overlay);
        this.overlay = overlay;
    }

    interceptLinks() {
        // Get all internal navigation links
        const links = document.querySelectorAll('a[href]');

        links.forEach(link => {
            const href = link.getAttribute('href');

            // Only intercept internal HTML page links
            if (href &&
                href.endsWith('.html') &&
                !href.startsWith('http') &&
                !href.startsWith('mailto:') &&
                !href.startsWith('tel:')) {

                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.navigateTo(href);
                });
            }
        });
    }

    async navigateTo(url) {
        if (this.isTransitioning) return;

        this.isTransitioning = true;

        // Fade out
        await this.fadeOut();

        // Navigate
        window.location.href = url;
    }

    fadeOut() {
        return new Promise(resolve => {
            this.overlay.style.pointerEvents = 'all';
            this.overlay.style.opacity = '1';

            setTimeout(resolve, this.transitionDuration);
        });
    }

    fadeIn() {
        // Start with overlay visible
        if (this.overlay) {
            this.overlay.style.opacity = '1';
            this.overlay.style.pointerEvents = 'all';
        }

        // Fade in after a short delay
        setTimeout(() => {
            if (this.overlay) {
                this.overlay.style.opacity = '0';
                setTimeout(() => {
                    this.overlay.style.pointerEvents = 'none';
                    this.isTransitioning = false;
                }, this.transitionDuration);
            }
        }, 50);
    }

    // Public method to trigger transition programmatically
    async transition(callback) {
        if (this.isTransitioning) return;

        this.isTransitioning = true;
        await this.fadeOut();

        if (callback) callback();

        await this.fadeIn();
        this.isTransitioning = false;
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // window.pageTransitions = new PageTransitions();
        // window.pageTransitions.init();
        console.log('Page transitions disabled for stability');
    });
} else {
    // window.pageTransitions = new PageTransitions();
    // window.pageTransitions.init();
    console.log('Page transitions disabled for stability');
}
