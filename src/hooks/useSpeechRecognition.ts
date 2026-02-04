import { useState, useEffect, useRef, useCallback } from 'react';

export function useSpeechRecognition(lang: string = 'he-IL') {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef<any>(null);
    const [hasSupport, setHasSupport] = useState(false);
    const isStartedRef = useRef(false);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setHasSupport(false);
            return;
        }

        setHasSupport(true);
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        recognition.continuous = true; // Use continuous for better experience
        recognition.interimResults = true;
        recognition.lang = lang;

        recognition.onstart = () => {
            console.log('Speech recognition started');
            setIsListening(true);
            isStartedRef.current = true;
        };

        recognition.onend = () => {
            console.log('Speech recognition ended');
            setIsListening(false);
            isStartedRef.current = false;
        };

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalTranscript += result[0].transcript;
                } else {
                    interimTranscript += result[0].transcript;
                }
            }

            if (finalTranscript || interimTranscript) {
                setTranscript(finalTranscript || interimTranscript);
            }
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                alert('Microphone access denied. Please enable it in browser settings.');
            }
            setIsListening(false);
            isStartedRef.current = false;
        };

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) {
                    // Ignore
                }
            }
        };
    }, []);

    const startListening = useCallback(() => {
        if (!recognitionRef.current || isStartedRef.current) return;

        setTranscript('');
        try {
            recognitionRef.current.start();
        } catch (e) {
            console.error('Failed to start speech recognition:', e);
        }
    }, []);

    const stopListening = useCallback(() => {
        if (!recognitionRef.current || !isStartedRef.current) return;
        try {
            recognitionRef.current.stop();
            isStartedRef.current = false;
            setIsListening(false);
        } catch (e) {
            console.error('Failed to stop speech recognition:', e);
        }
    }, []);

    return {
        isListening,
        transcript,
        startListening,
        stopListening,
        hasSupport
    };
}
