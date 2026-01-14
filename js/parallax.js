/**
 * Parallax Scrolling Controller
 * Adds subtle parallax effect to hero sections and backgrounds
 * Disabled on mobile devices for performance
 */

class ParallaxController {
    constructor() {
        this.parallaxElements = [];
        this.isMobile = window.innerWidth <= 768;
        this.isEnabled = !this.isMobile && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.ticking = false;
    }

    init() {
        if (!this.isEnabled) {
            console.log('Parallax disabled (mobile or reduced motion preference)');
            return;
        }

        // Find all elements with data-parallax attribute
        this.findParallaxElements();

        // Add scroll listener
        window.addEventListener('scroll', () => this.handleScroll(), { passive: true });

        // Handle resize
        window.addEventListener('resize', () => this.handleResize());

        // Observe DOM changes for new parallax elements
        this.setupObserver();

        console.log(`Parallax initialized with ${this.parallaxElements.length} elements`);
    }

    setupObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        // Check if node itself is parallax
                        if (node.hasAttribute('data-parallax')) {
                            this.addElementFromNode(node);
                        }
                        // Check children
                        const children = node.querySelectorAll('[data-parallax]');
                        children.forEach(child => this.addElementFromNode(child));
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    addElementFromNode(element) {
        // Avoid duplicates
        if (this.parallaxElements.some(p => p.element === element)) return;

        const speed = parseFloat(element.getAttribute('data-parallax')) || 0.5;
        const direction = element.getAttribute('data-parallax-direction') || 'vertical';

        this.addElement(element, speed, direction);
    }

    findParallaxElements() {
        const elements = document.querySelectorAll('[data-parallax]');

        elements.forEach(element => {
            const speed = parseFloat(element.getAttribute('data-parallax')) || 0.5;
            const direction = element.getAttribute('data-parallax-direction') || 'vertical';

            this.parallaxElements.push({
                element,
                speed,
                direction,
                initialOffset: element.offsetTop
            });
        });
    }

    handleScroll() {
        if (!this.ticking) {
            window.requestAnimationFrame(() => {
                this.updateParallax();
                this.ticking = false;
            });
            this.ticking = true;
        }
    }

    updateParallax() {
        const scrollY = window.pageYOffset;

        this.parallaxElements.forEach(({ element, speed, direction, initialOffset }) => {
            // Calculate parallax offset
            const offset = (scrollY - initialOffset) * speed;

            // Apply transform based on direction
            if (direction === 'vertical') {
                element.style.transform = `translateY(${offset}px)`;
            } else if (direction === 'horizontal') {
                element.style.transform = `translateX(${offset}px)`;
            } else if (direction === 'scale') {
                const scale = 1 + (offset / 1000);
                element.style.transform = `scale(${Math.max(1, scale)})`;
            } else if (direction === 'rotate') {
                // Rotate based on scroll
                const deg = offset * 0.2; // 0.2 degrees per pixel
                element.style.transform = `rotate(${deg}deg)`;
            } else if (direction === 'rotate-reverse') {
                const deg = offset * -0.2;
                element.style.transform = `rotate(${deg}deg)`;
            }
        });
    }

    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;

        // If switching between mobile/desktop, reinitialize
        if (wasMobile !== this.isMobile) {
            this.isEnabled = !this.isMobile && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            if (!this.isEnabled) {
                // Reset all transforms
                this.parallaxElements.forEach(({ element }) => {
                    element.style.transform = '';
                });
            }
        }
    }

    // Public method to add parallax to element dynamically
    addElement(element, speed = 0.5, direction = 'vertical') {
        if (!this.isEnabled) return;

        this.parallaxElements.push({
            element,
            speed,
            direction,
            initialOffset: element.offsetTop
        });
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.parallaxController = new ParallaxController();
        window.parallaxController.init();
    });
} else {
    window.parallaxController = new ParallaxController();
    window.parallaxController.init();
}
