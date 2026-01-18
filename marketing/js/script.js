// Language Toggle
const langButtons = document.querySelectorAll('.lang-btn');
const html = document.documentElement;

// Initialize language
let currentLang = html.getAttribute('data-lang') || 'he';
updateLanguage(currentLang);

langButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-lang');
        updateLanguage(lang);
    });
});

function updateLanguage(lang) {
    currentLang = lang;
    html.setAttribute('data-lang', lang);
    html.setAttribute('lang', lang);
    html.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');

    // Update active button
    langButtons.forEach(btn => {
        if (btn.getAttribute('data-lang') === lang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update all translatable elements
    const elements = document.querySelectorAll('[data-he][data-en]');
    elements.forEach(el => {
        const text = el.getAttribute(`data-${lang}`);
        if (text) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = text;
            } else {
                el.textContent = text;
            }
        }
    });

    // Store preference
    localStorage.setItem('preferredLang', lang);
}

// Load saved language preference
const savedLang = localStorage.getItem('preferredLang');
if (savedLang) {
    updateLanguage(savedLang);
}

// Smooth Scroll
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// FAQ Accordion
const faqItems = document.querySelectorAll('.faq-item');

faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');

    question.addEventListener('click', () => {
        const isActive = item.classList.contains('active');

        // Close all items
        faqItems.forEach(i => i.classList.remove('active'));

        // Open clicked item if it wasn't active
        if (!isActive) {
            item.classList.add('active');
        }
    });
});

// Index Calculator
const baseDateInput = document.getElementById('baseDate');
const baseAmountInput = document.getElementById('baseAmount');
const indexedAmountDisplay = document.getElementById('indexedAmount');

// Mock index data (in real app, this would come from CBS API)
const mockIndexData = {
    '2023-01': 100.0,
    '2023-02': 100.5,
    '2023-03': 101.0,
    '2023-04': 101.5,
    '2023-05': 102.0,
    '2023-06': 102.5,
    '2023-07': 103.0,
    '2023-08': 103.5,
    '2023-09': 104.0,
    '2023-10': 104.5,
    '2023-11': 105.0,
    '2023-12': 105.5,
    '2024-01': 106.0,
    '2024-02': 106.5,
    '2024-03': 107.0,
    '2024-04': 107.5,
    '2024-05': 108.0,
    '2024-06': 108.5,
    '2024-07': 109.0,
    '2024-08': 109.5,
    '2024-09': 110.0,
    '2024-10': 110.5,
    '2024-11': 111.0,
    '2024-12': 111.5,
    '2025-01': 112.0,
    '2025-02': 112.5,
    '2025-03': 113.0,
    '2025-04': 113.5,
    '2025-05': 114.0,
    '2025-06': 114.5,
    '2025-07': 115.0,
    '2025-08': 115.5,
    '2025-09': 116.0,
    '2025-10': 116.5,
    '2025-11': 117.0,
    '2025-12': 117.5,
    '2026-01': 118.0,
};

function calculateIndex() {
    const baseDate = baseDateInput.value;
    const baseAmount = parseFloat(baseAmountInput.value);

    if (!baseDate || !baseAmount || baseAmount <= 0) {
        indexedAmountDisplay.textContent = '₪0';
        return;
    }

    // Get base index
    const baseYearMonth = baseDate.substring(0, 7); // YYYY-MM
    const baseIndex = mockIndexData[baseYearMonth] || 100;

    // Get current index (using latest available)
    const currentIndex = mockIndexData['2026-01'] || 118;

    // Calculate indexed amount
    const indexedAmount = (baseAmount * currentIndex) / baseIndex;

    // Display with animation
    animateValue(indexedAmountDisplay, 0, indexedAmount, 500);
}

function animateValue(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16); // 60fps
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = '₪' + Math.round(current).toLocaleString('he-IL');
    }, 16);
}

// Add event listeners for calculator
if (baseDateInput && baseAmountInput) {
    baseDateInput.addEventListener('change', calculateIndex);
    baseAmountInput.addEventListener('input', calculateIndex);

    // Set default date to 1 year ago
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    baseDateInput.value = oneYearAgo.toISOString().split('T')[0];
}

// Scroll Animation Observer
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animated');
        }
    });
}, observerOptions);

// Observe all feature cards
document.querySelectorAll('.feature-card').forEach(card => {
    observer.observe(card);
});

// Observe other animated elements
document.querySelectorAll('.solution-card, .step-card, .testimonial-card, .security-card').forEach(el => {
    observer.observe(el);
});

// Parallax Effect (simple version)
let ticking = false;

window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            const scrolled = window.pageYOffset;
            const parallaxElements = document.querySelectorAll('.parallax');

            parallaxElements.forEach(el => {
                const speed = el.dataset.speed || 0.5;
                el.style.transform = `translateY(${scrolled * speed}px)`;
            });

            ticking = false;
        });

        ticking = true;
    }
});

// Scroll Reveal Observer
const revealObserverOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            // Stop observing once revealed
            revealObserver.unobserve(entry.target);
        }
    });
}, revealObserverOptions);

// Observe all sections and staggered lists
document.querySelectorAll('section, .reveal-on-scroll, .reveal-stagger').forEach(el => {
    el.classList.add('reveal-on-scroll'); // Ensure base class is present
    revealObserver.observe(el);
});

// Typing Effect
function typeWriter(element, text, speed = 50) {
    let i = 0;
    element.innerHTML = '';
    element.classList.add('typing-effect');

    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        } else {
            element.classList.add('typing-done');
        }
    }

    type();
}

// Initialize Typing on Hero Title
const heroTitle = document.querySelector('.hero-title');
if (heroTitle) {
    // Determine language to pick correct text
    const lang = document.documentElement.getAttribute('data-lang') || 'he';
    const text = heroTitle.getAttribute(`data-${lang}`) || heroTitle.textContent.trim();

    // Start typing after a short delay
    setTimeout(() => {
        typeWriter(heroTitle, text, 40);
    }, 500);
}

document.querySelectorAll('.btn-primary').forEach(btn => {
    btn.addEventListener('click', (e) => {
        console.log('CTA clicked:', e.target.textContent.trim());
    });
});

// Prevent form submission on Enter in calculator
if (baseDateInput && baseAmountInput) {
    [baseDateInput, baseAmountInput].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                calculateIndex();
            }
        });
    });
}

// Add loading state to buttons
document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', function () {
        if (!this.classList.contains('loading')) {
            this.classList.add('loading');
            setTimeout(() => {
                this.classList.remove('loading');
            }, 2000);
        }
    });
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Trigger initial calculation if values are present
    if (baseDateInput && baseAmountInput && baseDateInput.value && baseAmountInput.value) {
        calculateIndex();
    }

    // Add fade-in animation to hero
    const hero = document.querySelector('.hero');
    if (hero) {
        hero.classList.add('fade-in');
    }
});
