import React, { useRef, useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { RefreshCcw } from 'lucide-react';

interface SignaturePadProps {
  onSign: (signatureDataUrl: string) => void;
  width?: number | string;
  height?: number | string;
  label?: string;
  clearLabel?: string;
}

export function SignaturePad({ 
  onSign, 
  width = '100%', 
  height = 150,
  label = 'Signature',
  clearLabel = 'Clear',
  placeholder = 'X Signature'
}: SignaturePadProps & { placeholder?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && containerRef.current) {
      // Resize canvas to match container width
      const { width: cssWidth } = containerRef.current.getBoundingClientRect();
      canvas.width = cssWidth;
      // Fixed height or matching prop
      canvas.height = typeof height === 'number' ? height : 150;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [height]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    e.preventDefault();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setIsEmpty(false);
    e.preventDefault();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (!isEmpty && canvasRef.current) {
      onSign(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onSign('');
  };

  return (
    <div className="flex flex-col gap-2 w-full" ref={containerRef}>
      <div className="flex justify-between items-center px-1">
        <label className="text-sm font-black text-primary uppercase">{label}</label>
        {!isEmpty && (
          <Button variant="ghost" size="sm" onClick={clear} className="h-6 text-xs text-muted-foreground hover:text-primary">
            <RefreshCcw className="w-3 h-3 mr-1" />
            {clearLabel}
          </Button>
        )}
      </div>
      <div className="relative border-2 border-dashed border-slate-200 dark:border-neutral-800 rounded-2xl bg-white dark:bg-white overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
          className="w-full"
          style={{ width, height, touchAction: 'none' }}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <p className="text-xl font-black rotate-[-10deg] italic text-black font-serif border-b border-black w-2/3 text-center pb-2">X {placeholder}</p>
          </div>
        )}
      </div>
    </div>
  );
}
