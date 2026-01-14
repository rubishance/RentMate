import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check, X, Shield, Undo } from 'lucide-react';

interface RedactionRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface PageRedactions {
    [pageIndex: number]: RedactionRect[];
}

interface RedactionStudioProps {
    images: File[];
    onConfirm: (redactedImages: File[]) => void;
    onCancel: () => void;
}

export function RedactionStudio({ images, onConfirm, onCancel }: RedactionStudioProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [redactions, setRedactions] = useState<PageRedactions>({});
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [currentRect, setCurrentRect] = useState<RedactionRect | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Canvas refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Load current image and setup canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container || !images[currentIndex]) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        const url = URL.createObjectURL(images[currentIndex]);
        img.src = url;

        img.onload = () => {
            // Calculate scale to fit container height/width while maintaining aspect ratio
            const maxWidth = container.clientWidth;
            const maxHeight = window.innerHeight * 0.65; // 65vh max height

            let displayWidth = img.width;
            let displayHeight = img.height;

            // Scale down if too big
            if (displayWidth > maxWidth || displayHeight > maxHeight) {
                const ratio = Math.min(maxWidth / displayWidth, maxHeight / displayHeight);
                displayWidth = displayWidth * ratio;
                displayHeight = displayHeight * ratio;
            }

            canvas.width = displayWidth;
            canvas.height = displayHeight;

            // Store scale factor to map visual coords back to original image
            // scale state removed, using local calculation in handleConfirm if needed

            // Draw image
            ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

            // Draw existing redactions
            const pageRedactions = redactions[currentIndex] || [];
            ctx.fillStyle = 'black';
            pageRedactions.forEach(rect => {
                ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
            });
        };

        return () => URL.revokeObjectURL(url);
    }, [currentIndex, images, redactions]);

    // Handle mouse interactions for drawing
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !images[currentIndex]) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Re-draw on every frame of drag would be expensive if we reload image. 
        // Optimization: We only redraw the rect interaction on top if possible, 
        // or just re-render everything simply since 2D canvas is fast.

        const img = new Image();
        img.src = URL.createObjectURL(images[currentIndex]);
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Draw saved redactions
            const pageRedactions = redactions[currentIndex] || [];
            ctx.fillStyle = 'black';
            pageRedactions.forEach(rect => {
                ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
            });

            // Draw current dragging rect
            if (currentRect) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.fillRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
                ctx.strokeStyle = '#ef4444'; // red-500
                ctx.lineWidth = 2;
                ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
            }
        };
    }, [currentRect]); // Only re-run when dragging rect changes

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') {
                setCurrentIndex(prev => Math.min(images.length - 1, prev + 1));
            } else if (e.key === 'ArrowLeft') {
                setCurrentIndex(prev => Math.max(0, prev - 1));
            } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
                handleUndo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [images.length, currentIndex]); // Add dependencies

    const handleMouseDown = (e: React.MouseEvent) => {

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setIsDrawing(true);
        setStartPos({ x, y });
        setCurrentRect({ x, y, width: 0, height: 0 });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const width = x - startPos.x;
        const height = y - startPos.y;

        setCurrentRect({
            x: width > 0 ? startPos.x : x,
            y: height > 0 ? startPos.y : y,
            width: Math.abs(width),
            height: Math.abs(height)
        });
    };

    const handleMouseUp = () => {
        if (!isDrawing || !currentRect) return;

        // Only add if bigger than 5x5 pixels
        if (currentRect.width > 5 && currentRect.height > 5) {
            setRedactions(prev => ({
                ...prev,
                [currentIndex]: [...(prev[currentIndex] || []), currentRect]
            }));
        }

        setIsDrawing(false);
        setCurrentRect(null);
    };

    const handleUndo = () => {
        setRedactions(prev => {
            const current = prev[currentIndex] || [];
            if (current.length === 0) return prev;
            return {
                ...prev,
                [currentIndex]: current.slice(0, -1)
            };
        });
    };

    const handleConfirm = async () => {
        setIsProcessing(true);
        try {
            const processedImages: File[] = [];

            for (let i = 0; i < images.length; i++) {
                const file = images[i];
                const pageRedactions = redactions[i] || [];

                if (pageRedactions.length === 0) {
                    processedImages.push(file);
                    continue;
                }

                // Burn redactions into image at FULL resolution
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) continue;

                const img = new Image();
                img.src = URL.createObjectURL(file);
                await new Promise(resolve => { img.onload = resolve; });

                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                // We need to recreate the scale because 'scale' state is only for current page
                // But we can approximate efficiently:
                // We know the rects were drawn on a canvas of size X, Y
                // But we don't know X,Y for historical pages if window resized.
                // RISK: If user resized window between pages, burn alignment crashes.
                // FIX: Re-calculate the layout logic exactly as the effect does.

                // Layout Logic:
                const containerWidth = containerRef.current?.clientWidth || 800;
                const containerHeight = window.innerHeight * 0.65;
                let displayWidth = img.width;
                let displayHeight = img.height;

                if (displayWidth > containerWidth || displayHeight > containerHeight) {
                    const ratio = Math.min(containerWidth / displayWidth, containerHeight / displayHeight);
                    displayWidth = displayWidth * ratio;
                    displayHeight = displayHeight * ratio;
                }

                const scaleX = img.width / displayWidth;
                const scaleY = img.height / displayHeight;

                ctx.fillStyle = 'black';
                pageRedactions.forEach(rect => {
                    ctx.fillRect(
                        rect.x * scaleX,
                        rect.y * scaleY,
                        rect.width * scaleX,
                        rect.height * scaleY
                    );
                });

                const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.95));
                if (blob) {
                    processedImages.push(new File([blob], file.name, { type: 'image/jpeg' }));
                } else {
                    processedImages.push(file);
                }
            }

            onConfirm(processedImages);
        } catch (err) {
            console.error("Redaction error:", err);
            alert("Failed to process redactions. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col text-white backdrop-blur-sm" ref={containerRef} dir="rtl">

            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-white/10 bg-black/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-full">
                        <Shield className="text-green-400" size={24} />
                    </div>
                    <div>
                        <h2 className="font-bold text-xl">סטודיו להשחרת פרטים</h2>
                        <p className="text-sm text-gray-400">סמן בתיבות שחורות מידע רגיש (ת.ז, שמות, טלפונים)</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <span className="font-mono bg-white/10 px-3 py-1 rounded text-sm">
                        עמוד {currentIndex + 1} מתוך {images.length}
                    </span>
                    <button
                        onClick={handleUndo}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 text-sm"
                        title="בטל פעולה אחרונה (Ctrl+Z)"
                    >
                        <Undo size={18} /> ביטול אחרון
                    </button>
                </div>

                <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X size={24} />
                </button>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 overflow-hidden flex items-center justify-center p-8 bg-neutral-900/50 relative">
                {/* Hint Overlay */}
                {(!redactions[currentIndex] || redactions[currentIndex].length === 0) && !isDrawing && (
                    <div className="absolute top-10 pointer-events-none bg-black/80 px-4 py-2 rounded-full text-sm text-white/70 animate-pulse border border-white/10">
                        לחץ וגרור כדי להשחיר מידע
                    </div>
                )}

                <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className="cursor-crosshair shadow-2xl border border-white/10 bg-white"
                />
            </div>

            {/* Footer */}
            <div className="p-4 lg:p-6 border-t border-white/10 bg-neutral-900/90 flex flex-col lg:flex-row justify-between items-center gap-4 shrink-0 z-50 safe-area-bottom">

                {/* Navigation - Bottom on Mobile, Left on Desktop */}
                <div className="flex gap-4 w-full lg:w-auto justify-center order-2 lg:order-1">
                    <button
                        onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                        disabled={currentIndex === 0}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-3 lg:py-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all text-sm"
                    >
                        <ArrowRight size={16} /> הקודם
                    </button>
                    <button
                        onClick={() => setCurrentIndex(Math.min(images.length - 1, currentIndex + 1))}
                        disabled={currentIndex === images.length - 1}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-3 lg:py-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all text-sm"
                    >
                        הבא <ArrowLeft size={16} />
                    </button>
                </div>

                {/* Actions - Top on Mobile, Right on Desktop */}
                <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 items-center w-full lg:w-auto order-1 lg:order-2">
                    <button
                        onClick={() => setRedactions(prev => ({ ...prev, [currentIndex]: [] }))}
                        className="w-full lg:w-auto px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-sm text-center"
                    >
                        נקה עמוד
                    </button>

                    <div className="hidden lg:block h-8 w-px bg-white/10 mx-2"></div>

                    <button
                        onClick={handleConfirm}
                        disabled={isProcessing}
                        className="w-full lg:w-auto flex items-center justify-center gap-2 px-6 lg:px-8 py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 rounded-lg font-bold text-white shadow-lg shadow-green-900/20 transform hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-wait text-sm lg:text-base"
                    >
                        {isProcessing ? 'מעבד...' : (
                            <>
                                <Check size={20} /> אישור ושליחה מאובטחת
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

