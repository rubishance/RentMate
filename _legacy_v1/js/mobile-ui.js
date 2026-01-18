class MobileUI {
    constructor() {
        this.init();
    }

    init() {
        console.log('MobileUI Initialized');
        this.initCalculator();
        this.initMobileCarousel();
    }

    // --- Linkage Calculator Logic ---
    initCalculator() {
        const baseIndexInput = document.getElementById('calcBaseIndex');
        const currentIndexInput = document.getElementById('calcCurrentIndex');
        const baseRentInput = document.getElementById('calcBaseRent');
        const resultDisplay = document.getElementById('calcResult');

        if (!baseIndexInput || !currentIndexInput || !baseRentInput || !resultDisplay) return;

        const calculate = () => {
            const baseIndex = parseFloat(baseIndexInput.value);
            const currentIndex = parseFloat(currentIndexInput.value);
            const baseRent = parseFloat(baseRentInput.value);

            if (baseIndex > 0 && currentIndex > 0 && baseRent > 0) {
                const ratio = currentIndex / baseIndex;
                const newRent = Math.round(baseRent * ratio);
                resultDisplay.textContent = `₪${newRent.toLocaleString()}`;

                // Visual feedback
                resultDisplay.style.color = newRent > baseRent ? 'var(--color-success)' : 'var(--color-primary)';
            } else {
                resultDisplay.textContent = '₪0';
            }
        };

        [baseIndexInput, currentIndexInput, baseRentInput].forEach(input => {
            input.addEventListener('input', calculate);
        });
    }

    // --- Mobile Dashboard Carousel ---
    async initMobileCarousel() {
        const carousel = document.getElementById('mobileAssetCarousel');
        if (!carousel) return;

        // Wait for DB
        if (!window.rentMateDB) {
            console.warn('RentMateDB not loaded yet');
            return;
        }

        try {
            const properties = await window.rentMateDB.getAll('properties');

            if (properties && properties.length > 0) {
                carousel.innerHTML = properties.map(prop => {
                    const isRented = prop.status === 'rented' || prop.status === 'occupied';
                    const badgeClass = isRented ? 'rented' : 'vacant';
                    const badgeText = isRented ? 'מושכר' : 'פנוי';
                    // Fallback image if none
                    const bgImage = prop.image || 'https://images.unsplash.com/photo-1512918760383-eda7d23a3076?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';

                    return `
                        <div class="asset-card-mobile" onclick="window.location.href='properties.html'">
                            <img src="${bgImage}" class="asset-card-img" alt="${prop.address}">
                            <span class="asset-status-badge ${badgeClass}">${badgeText}</span>
                            <div class="asset-card-overlay">
                                <h3 style="font-size: 1.4rem;">${prop.address}</h3>
                                <p style="font-size: 1.1rem; opacity: 0.9;">₪${prop.price?.toLocaleString()} / חודש</p>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                carousel.innerHTML = '<div style="padding:20px; text-align:center; width:100%;">אין נכסים להצגה</div>';
            }

        } catch (err) {
            console.error('Error populating mobile carousel:', err);
        }
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    window.mobileUI = new MobileUI();
});
