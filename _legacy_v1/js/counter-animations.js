/**
 * Number Counter Animations
 * Animates numbers counting up when they enter viewport
 */

class CounterAnimations {
    constructor() {
        this.observer = null;
        this.animatedCounters = new Set();
    }

    /**
     * Initialize counter animations
     */
    init() {
        if (!('IntersectionObserver' in window)) {
            console.warn('Intersection Observer not supported');
            return;
        }

        this.observer = new IntersectionObserver(
            (entries) => this.handleIntersection(entries),
            { threshold: 0.5 }
        );

        // Find all counter elements
        const counters = document.querySelectorAll('[data-counter]');
        counters.forEach(counter => this.observer.observe(counter));
    }

    /**
     * Handle intersection
     */
    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting && !this.animatedCounters.has(entry.target)) {
                this.animateCounter(entry.target);
                this.animatedCounters.add(entry.target);
            }
        });
    }

    /**
     * Animate counter
     */
    animateCounter(element) {
        const target = parseInt(element.getAttribute('data-counter')) || 0;
        const duration = parseInt(element.getAttribute('data-duration')) || 2000;
        const isCurrency = element.hasAttribute('data-currency');
        const prefix = element.getAttribute('data-prefix') || '';
        const suffix = element.getAttribute('data-suffix') || '';

        const startTime = Date.now();
        const startValue = 0;

        const animate = () => {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.floor(startValue + (target - startValue) * easeOut);

            // Format value
            let displayValue = currentValue;
            if (isCurrency) {
                displayValue = this.formatCurrency(currentValue);
            } else {
                displayValue = this.formatNumber(currentValue);
            }

            element.textContent = prefix + displayValue + suffix;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Ensure final value is exact
                element.textContent = prefix + (isCurrency ? this.formatCurrency(target) : this.formatNumber(target)) + suffix;
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * Format number with commas
     */
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /**
     * Format as currency
     */
    formatCurrency(num) {
        return '₪' + this.formatNumber(num);
    }

    /**
     * Refresh - observe new counters
     */
    refresh() {
        if (this.observer) {
            const counters = document.querySelectorAll('[data-counter]');
            counters.forEach(counter => {
                if (!this.animatedCounters.has(counter)) {
                    this.observer.observe(counter);
                }
            });
        }
    }
}

// Create global instance
window.counterAnimations = new CounterAnimations();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.counterAnimations.init());
} else {
    window.counterAnimations.init();
}
