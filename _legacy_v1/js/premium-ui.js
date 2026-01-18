// Premium UI Enhancements - Animated Counters and Effects

// Animated Counter Function
function animateCounter(element, target, duration = 1000, prefix = '', suffix = '') {
    if (!element) return;

    const start = 0;
    const increment = target / (duration / 16); // 60fps
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = prefix + Math.floor(current).toLocaleString() + suffix;
    }, 16);
}

// Animate all stat counters on page load
function animateAllStats() {
    // Total Properties
    const propEl = document.getElementById('statTotalProperties');
    if (propEl && propEl.textContent !== '-') {
        const value = parseInt(propEl.textContent);
        if (!isNaN(value)) {
            propEl.textContent = '0';
            setTimeout(() => animateCounter(propEl, value, 800), 200);
        }
    }

    // Total Income
    const incomeEl = document.getElementById('statTotalIncome');
    if (incomeEl) {
        const text = incomeEl.textContent.replace(/[₪,]/g, '');
        const value = parseInt(text);
        if (!isNaN(value)) {
            incomeEl.textContent = '₪0';
            setTimeout(() => animateCounter(incomeEl, value, 1000, '₪'), 300);
        }
    }

    // Active Contracts
    const contractsEl = document.getElementById('statActiveContracts');
    if (contractsEl && contractsEl.textContent !== '-') {
        const value = parseInt(contractsEl.textContent);
        if (!isNaN(value)) {
            contractsEl.textContent = '0';
            setTimeout(() => animateCounter(contractsEl, value, 800), 400);
        }
    }
}

// Ripple Effect for Buttons
function createRipple(event) {
    const button = event.currentTarget;

    // Don't add ripple if button already has one
    if (!button.classList.contains('ripple-container')) {
        button.classList.add('ripple-container');
    }

    const ripple = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    ripple.style.width = ripple.style.height = `${diameter}px`;
    ripple.style.left = `${event.clientX - button.offsetLeft - radius}px`;
    ripple.style.top = `${event.clientY - button.offsetTop - radius}px`;
    ripple.classList.add('ripple');

    const existingRipple = button.querySelector('.ripple');
    if (existingRipple) {
        existingRipple.remove();
    }

    button.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
}

// Add ripple to all buttons
function initRippleEffects() {
    const buttons = document.querySelectorAll('.btn-primary, .btn-outline');
    buttons.forEach(button => {
        button.addEventListener('click', createRipple);
    });
}

// Stagger animation for lists
function staggerAnimation(selector, animationClass = 'slide-up') {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el, index) => {
        el.classList.add(animationClass);
        el.style.animationDelay = `${index * 0.05}s`;
    });
}

// Initialize all premium UI enhancements
document.addEventListener('DOMContentLoaded', () => {
    // Wait for data to load, then animate counters
    setTimeout(() => {
        animateAllStats();
    }, 500);

    // Initialize ripple effects
    initRippleEffects();

    // Stagger animations for property cards
    if (document.querySelector('.property-card')) {
        setTimeout(() => staggerAnimation('.property-card'), 100);
    }

    // Stagger animations for tenant items
    if (document.querySelector('.tenant-item')) {
        setTimeout(() => staggerAnimation('.tenant-item'), 100);
    }

    // Stagger animations for contract rows
    if (document.querySelector('.contracts-table tbody tr')) {
        setTimeout(() => staggerAnimation('.contracts-table tbody tr', 'fade-in'), 100);
    }
});

// Re-animate stats when data changes
window.refreshStatAnimations = function () {
    setTimeout(() => animateAllStats(), 100);
};

// Export for use in other scripts
window.animateCounter = animateCounter;
window.createRipple = createRipple;
window.staggerAnimation = staggerAnimation;
