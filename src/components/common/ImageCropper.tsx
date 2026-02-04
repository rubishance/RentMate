import { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';

import { X, Check, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import getCroppedImg from '../../utils/cropImage';

interface ImageCropperProps {
    imageSrc: string;
    onCropComplete: (croppedImageBlob: Blob) => void;
    onCancel: () => void;
    aspect?: number;
}

export function ImageCropper({ imageSrc, onCropComplete, onCancel, aspect = 4 / 3 }: ImageCropperProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [loading, setLoading] = useState(false);

    const onCropChange = (crop: { x: number; y: number }) => {
        setCrop(crop);
    };

    const onZoomChange = (zoom: number) => {
        setZoom(zoom);
    };

    const onRotationChange = (rotation: number) => {
        setRotation(rotation);
    };

    const onCropCompleteHandler = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        if (!croppedAreaPixels) return;
        setLoading(true);
        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
            if (croppedImage) {
                onCropComplete(croppedImage);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative flex-1 w-full h-full overflow-hidden">
                <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={aspect}
                    onCropChange={onCropChange}
                    onCropComplete={onCropCompleteHandler}
                    onZoomChange={onZoomChange}
                    onRotationChange={onRotationChange}
                    classes={{
                        containerClassName: "bg-transparent",
                        mediaClassName: "",
                        cropAreaClassName: "border-2 border-white/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] rounded-lg"
                    }}
                />
            </div>

            <div className="p-6 bg-slate-900/90 border-t border-white/10 safe-area-bottom">
                <div className="max-w-md mx-auto space-y-6">
                    <div className="space-y-4">
                        {/* Zoom Control */}
                        <div className="flex items-center gap-4">
                            <ZoomOut className="w-4 h-4 text-slate-400" />
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                aria-labelledby="Zoom"
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                            <ZoomIn className="w-4 h-4 text-slate-400" />
                        </div>

                        {/* Rotation Control */}
                        <div className="flex items-center gap-4">
                            <span className="text-xs text-slate-400 w-8 text-right">-45°</span>
                            <input
                                type="range"
                                value={rotation}
                                min={-45}
                                max={45}
                                step={1}
                                aria-labelledby="Rotation"
                                onChange={(e) => setRotation(Number(e.target.value))}
                                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <span className="text-xs text-slate-400 w-8">45°</span>
                        </div>
                    </div>

                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={onCancel}
                            disabled={loading}
                            className={cn(
                                "flex items-center gap-2 px-6 py-3 rounded-xl",
                                "bg-slate-800 text-white font-medium hover:bg-slate-700 transition-colors",
                                "border border-white/5"
                            )}
                        >
                            <X className="w-4 h-4" />
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className={cn(
                                "flex items-center gap-2 px-8 py-3 rounded-xl",
                                "bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium",
                                "hover:from-indigo-500 hover:to-violet-500 transition-all shadow-jewel",
                                "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Check className="w-4 h-4" />
                            )}
                            Apply Crop
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
