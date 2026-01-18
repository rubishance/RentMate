// Property Form - Google Places Autocomplete Handler
// This script handles intelligent street name autocomplete based on selected city

let autocompleteInstance = null;
let selectedCity = '';

// Initialize autocomplete when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const cityInput = document.getElementById('propCity');
    const addressInput = document.getElementById('propAddress');

    if (!cityInput || !addressInput) return;

    // Check if Google Places API is loaded
    if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
        console.warn('Google Places API not loaded. Street autocomplete disabled.');
        return;
    }

    // Listen for city selection
    cityInput.addEventListener('change', () => {
        selectedCity = cityInput.value.trim();
        console.log('City selected:', selectedCity);

        // Reinitialize autocomplete with new city filter
        if (selectedCity) {
            initializeAutocomplete();
        }
    });

    // Also listen for input to catch datalist selections
    cityInput.addEventListener('input', () => {
        const newCity = cityInput.value.trim();
        if (newCity !== selectedCity && newCity.length > 2) {
            selectedCity = newCity;
            if (autocompleteInstance) {
                initializeAutocomplete();
            }
        }
    });
});

function initializeAutocomplete() {
    const addressInput = document.getElementById('propAddress');
    if (!addressInput) return;

    // Clear previous instance
    if (autocompleteInstance) {
        google.maps.event.clearInstanceListeners(addressInput);
    }

    // Create autocomplete options with city filter
    const options = {
        ...GOOGLE_PLACES_CONFIG.autocompleteOptions,
        // Add city-specific bounds if city is selected
        ...(selectedCity && {
            bounds: getCityBounds(selectedCity),
            strictBounds: false // Allow results outside bounds but prioritize within
        })
    };

    // Initialize autocomplete
    autocompleteInstance = new google.maps.places.Autocomplete(addressInput, options);

    // Handle place selection
    autocompleteInstance.addListener('place_changed', () => {
        const place = autocompleteInstance.getPlace();

        if (!place.address_components) {
            console.log('No address details available');
            return;
        }

        // Extract street name and number
        let streetName = '';
        let streetNumber = '';
        let city = '';

        place.address_components.forEach(component => {
            const types = component.types;

            if (types.includes('route')) {
                streetName = component.long_name;
            }
            if (types.includes('street_number')) {
                streetNumber = component.long_name;
            }
            if (types.includes('locality')) {
                city = component.long_name;
            }
        });

        // Populate address field
        const fullAddress = streetNumber ? `${streetName} ${streetNumber}` : streetName;
        addressInput.value = fullAddress;

        // Auto-fill city if not already selected
        const cityInput = document.getElementById('propCity');
        if (city && !selectedCity && cityInput) {
            cityInput.value = city;
            selectedCity = city;
        }

        console.log('Address selected:', fullAddress, 'City:', city);
    });
}

// Get approximate bounds for major Israeli cities
function getCityBounds(cityName) {
    const cityBounds = {
        'תל אביב': {
            north: 32.1500,
            south: 32.0000,
            east: 34.8500,
            west: 34.7500
        },
        'ירושלים': {
            north: 31.8500,
            south: 31.7000,
            east: 35.2800,
            west: 35.1500
        },
        'חיפה': {
            north: 32.8500,
            south: 32.7500,
            east: 35.0500,
            west: 34.9500
        },
        'באר שבע': {
            north: 31.2800,
            south: 31.2200,
            east: 34.8200,
            west: 34.7500
        },
        'ראשון לציון': {
            north: 31.9900,
            south: 31.9300,
            east: 34.8200,
            west: 34.7500
        },
        'פתח תקווה': {
            north: 32.1200,
            south: 32.0500,
            east: 34.9200,
            west: 34.8500
        },
        'נתניה': {
            north: 32.3500,
            south: 32.2800,
            east: 34.8800,
            west: 34.8200
        },
        'אשדוד': {
            north: 31.8300,
            south: 31.7500,
            east: 34.6800,
            west: 34.6000
        }
    };

    // Return bounds for the city, or null if not found
    const bounds = cityBounds[cityName];
    if (bounds) {
        return new google.maps.LatLngBounds(
            new google.maps.LatLng(bounds.south, bounds.west),
            new google.maps.LatLng(bounds.north, bounds.east)
        );
    }

    return null;
}
