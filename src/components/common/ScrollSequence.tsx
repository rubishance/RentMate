import { useEffect, useRef, useState } from 'react';
import { useScroll, useMotionValueEvent } from 'framer-motion';

interface ScrollSequenceProps {
  frameCount: number;
  imagePathTemplate: (index: number) => string;
}

export function ScrollSequence({ frameCount, imagePathTemplate }: ScrollSequenceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { scrollYProgress } = useScroll();
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [loadedFrames, setLoadedFrames] = useState(0);
  const currentFrameRef = useRef(1);

  // Preload images
  useEffect(() => {
    const loadedImages: HTMLImageElement[] = [];
    let loadedCount = 0;

    for (let i = 1; i <= frameCount; i++) {
      const img = new Image();
      img.src = imagePathTemplate(i);
      img.onload = () => {
        loadedCount++;
        setLoadedFrames(loadedCount);
        // Draw the first frame as soon as it's ready
        if (i === 1 && canvasRef.current) {
          drawFrame(img, canvasRef.current);
        }
      };
      loadedImages.push(img);
    }
    setImages(loadedImages);
  }, [frameCount, imagePathTemplate]);

  // Function to draw a specific frame to canvas with "object-cover" behavior
  const drawFrame = (img: HTMLImageElement, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const screenRatio = canvas.width / canvas.height;
    const imgRatio = img.width / img.height;

    let renderWidth, renderHeight, x = 0, y = 0;

    // object-cover math
    if (screenRatio > imgRatio) {
        renderWidth = canvas.width;
        renderHeight = canvas.width / imgRatio;
        y = (canvas.height - renderHeight) / 2;
    } else {
        renderHeight = canvas.height;
        renderWidth = canvas.height * imgRatio;
        x = (canvas.width - renderWidth) / 2;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Apply grayscale a bit if needed like the CSS originally did, 
    // but doing it via CSS filter on canvas is faster
    ctx.drawImage(img, x, y, renderWidth, renderHeight);
  };

  // Adjust canvas size on resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        // Redraw current frame
        if (images[currentFrameRef.current - 1]) {
          drawFrame(images[currentFrameRef.current - 1], canvasRef.current);
        }
      }
    };
    
    // Initial size
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [images]);

  // Listen to scroll progress and draw mapped frame
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (images.length === 0) return;

    // Calculate frame index from 1 to frameCount
    const frameIndex = Math.min(
      frameCount,
      Math.max(1, Math.floor(latest * (frameCount - 1)) + 1)
    );

    if (frameIndex !== currentFrameRef.current) {
      currentFrameRef.current = frameIndex;
      const img = images[frameIndex - 1];
      if (img && img.complete && canvasRef.current) {
        drawFrame(img, canvasRef.current);
      }
    }
  });

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full object-cover grayscale-[0.2]"
      style={{
        width: '100%',
        height: '100%',
        display: 'block'
      }}
    />
  );
}
