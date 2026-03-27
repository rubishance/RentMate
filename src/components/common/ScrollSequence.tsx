import { useEffect, useRef, useState } from 'react';
import { useScroll, useMotionValueEvent } from 'framer-motion';

interface ScrollSequenceProps {
  frameCount: number;
  imagePathTemplate: (index: number) => string;
}

export function ScrollSequence({ frameCount, imagePathTemplate }: ScrollSequenceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { scrollYProgress } = useScroll();
  const imagesRef = useRef<HTMLImageElement[]>(new Array(frameCount).fill(null));
  const currentFrameRef = useRef(1);

  // Preload images asynchronously in batches
  useEffect(() => {
    let isCancelled = false;
    const loadedImages: HTMLImageElement[] = new Array(frameCount).fill(null);

    const loadBatch = async (startIdx: number, batchSize: number) => {
      const promises: Promise<void>[] = [];
      const endIdx = Math.min(startIdx + batchSize, frameCount);

      for (let i = startIdx; i <= endIdx; i++) {
        if (isCancelled) break;
        promises.push(new Promise((resolve) => {
          const img = new Image();
          img.src = imagePathTemplate(i);
          img.onload = () => {
            if (isCancelled) return;
            loadedImages[i - 1] = img;
            imagesRef.current[i - 1] = img;
            
            // Draw immediately if this is the exact frame the user is currently looking at
            if (i === currentFrameRef.current && canvasRef.current) {
               drawFrame(img, canvasRef.current);
            }
            resolve();
          };
          img.onerror = () => resolve(); // continue even if one fails
        }));
      }
      
      await Promise.all(promises);
      
      // Load next batch on next idle frame
      if (!isCancelled && endIdx < frameCount) {
         requestAnimationFrame(() => {
             setTimeout(() => loadBatch(endIdx + 1, batchSize), 10);
         });
      }
    };

    // Start loading batches of 30
    loadBatch(1, 30);

    return () => {
      isCancelled = true;
    };
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
        const currentImg = imagesRef.current[currentFrameRef.current - 1];
        if (currentImg && currentImg.complete) {
          drawFrame(currentImg, canvasRef.current);
        }
      }
    };
    
    // Initial size
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Listen to scroll progress and draw mapped frame
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    // Calculate frame index from 1 to frameCount
    const frameIndex = Math.min(
      frameCount,
      Math.max(1, Math.floor(latest * (frameCount - 1)) + 1)
    );

    if (frameIndex !== currentFrameRef.current) {
      currentFrameRef.current = frameIndex;
      const img = imagesRef.current[frameIndex - 1];
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
