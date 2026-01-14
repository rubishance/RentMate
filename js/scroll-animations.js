/**
 * Scroll Animations Controller
 * Uses Intersection Observer to trigger animations when elements enter viewport
 */

class ScrollAnimations {
    constructor() {
        this.observer = null;
        this.animatedElements = new Set();
        this.options = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1 // Trigger when 10% of element is visible
        };
    }

    /**
     * Initialize scroll animations
     */
    init() {
        // Check for Intersection Observer support
        if (!('IntersectionObserver' in window)) {
            console.warn('Intersection Observer not supported');
            this.fallbackInit();
            return;
        }

        // Create observer
        this.observer = new IntersectionObserver(
            (entries) => this.handleIntersection(entries),
            this.options
        );

        // Find and observe all elements with data-animate attribute
        this.observeElements();
    }

    /**
     * Find and observe all animatable elements
     */
    observeElements() {
        const elements = document.querySelectorAll('[data-animate]');

        elements.forEach(element => {
            // Initially hide element
            element.style.opacity = '0';
            element.style.transform = this.getInitialTransform(element);

            // Observe element
            this.observer.observe(element);
        });
    }

    /**
     * Get initial transform based on animation type
     */
    getInitialTransform(element) {
        const animationType = element.getAttribute('data-animate');

        switch (animationType) {
            case 'fade-in-up':
                return 'translateY(30px)';
            case 'fade-in-down':
                return 'translateY(-30px)';
            case 'fade-in-left':
                return 'translateX(-30px)';
            case 'fade-in-right':
                return 'translateX(30px)';
            case 'scale-in':
                return 'scale(0.9)';
            case 'fade-in':
            default:
                return 'none';
        }
    }

    /**
     * Handle intersection events
     */
    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting && !this.animatedElements.has(entry.target)) {
                this.animateElement(entry.target);
                this.animatedElements.add(entry.target);

                // Stop observing after animation (optional)
                // this.observer.unobserve(entry.target);
            }
        });
    }

    /**
     * Animate element
     */
    animateElement(element) {
        const delay = parseInt(element.getAttribute('data-delay')) || 0;
        const duration = parseInt(element.getAttribute('data-duration')) || 600;

        setTimeout(() => {
            element.style.transition = `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`;
            element.style.opacity = '1';
            element.style.transform = 'translateY(0) translateX(0) scale(1)';

            // Add animated class for additional styling
            element.classList.add('animated');
        }, delay);
    }

    /**
     * Fallback for browsers without Intersection Observer
     */
    fallbackInit() {
        const elements = document.querySelectorAll('[data-animate]');
        elements.forEach(element => {
            element.style.opacity = '1';
            element.style.transform = 'none';
            element.classList.add('animated');
        });
    }

    /**
     * Refresh - observe new elements
     */
    refresh() {
        if (this.observer) {
            this.observeElements();
        }
    }

    /**
     * Destroy observer
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }
}

// Create global instance
window.scrollAnimations = new ScrollAnimations();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.scrollAnimations.init());
} else {
    window.scrollAnimations.init();
}
