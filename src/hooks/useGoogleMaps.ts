import { useState, useEffect } from 'react';

let isLoading = false;
let isLoaded = false;
let loadError: Error | null = null;
const callbacks: Array<(error: Error | null) => void> = [];

export function useGoogleMaps() {
    const [status, setStatus] = useState({ loaded: isLoaded, error: loadError });

    useEffect(() => {
        if (isLoaded) {
            setStatus({ loaded: true, error: null });
            return;
        }

        if (loadError) {
            setStatus({ loaded: false, error: loadError });
            return;
        }

        const handleLoad = (error: Error | null) => {
            setStatus({ loaded: !error, error });
        };

        callbacks.push(handleLoad);

        if (!isLoading) {
            isLoading = true;
            const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

            if (!apiKey) {
                const error = new Error('Google Maps API Key is missing');
                loadError = error;
                isLoading = false;
                callbacks.forEach(cb => cb(error));
                callbacks.length = 0;
                return;
            }

            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
            script.async = true;
            script.defer = true;

            script.onload = () => {
                isLoaded = true;
                isLoading = false;
                callbacks.forEach(cb => cb(null));
                callbacks.length = 0;
            };

            script.onerror = () => {
                const error = new Error('Failed to load Google Maps script');
                loadError = error;
                isLoading = false;
                callbacks.forEach(cb => cb(error));
                callbacks.length = 0;
            };

            document.head.appendChild(script);
        }

        return () => {
            const index = callbacks.indexOf(handleLoad);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        };
    }, []);

    return status;
}
