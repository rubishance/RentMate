import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore - worker import
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Initialize PDF.js worker
// Using local worker file via Vite ?url import to ensure version match and avoid CDN issues
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;


export interface CompressedImage {
    file: File;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    blobUrl: string;
}

export const ScannerUtils = {
    config: {
        maxWidth: 1600,
        maxHeight: 1600,
        jpegQuality: 0.75,
        minSizeToCompress: 300 * 1024, // 300KB
    },

    async processFile(file: File): Promise<File[]> {
        if (file.type === 'application/pdf') {
            return this.convertPdfToImages(file);
        } else if (file.type.startsWith('image/')) {
            // Compress the image before processing
            const compressed = await this.compressImage(file);
            return [compressed.file];
        }
        throw new Error('Unsupported file type');
    },

    async convertPdfToImages(file: File): Promise<File[]> {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        const images: File[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 }); // High quality for OCR/Redaction
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (!context) continue;

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport } as any).promise;


            const blob = await new Promise<Blob | null>(resolve =>
                canvas.toBlob(resolve, 'image/jpeg', 0.8)
            );

            if (blob) {
                images.push(new File([blob], `${file.name}_p${i}.jpg`, { type: 'image/jpeg' }));
            }
        }

        return images;
    },

    async compressImage(file: File): Promise<CompressedImage> {
        if (file.size < this.config.minSizeToCompress) {
            return {
                file,
                originalSize: file.size,
                compressedSize: file.size,
                compressionRatio: 0,
                blobUrl: URL.createObjectURL(file)
            };
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);

            img.onload = () => {
                let { width, height } = img;
                const { maxWidth, maxHeight } = this.config;

                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.floor(width * ratio);
                    height = Math.floor(height * ratio);
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('Canvas context failed'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Compression failed'));
                        return;
                    }

                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });

                    resolve({
                        file: compressedFile,
                        originalSize: file.size,
                        compressedSize: compressedFile.size,
                        compressionRatio: parseFloat(((1 - compressedFile.size / file.size) * 100).toFixed(1)),
                        blobUrl: URL.createObjectURL(compressedFile)
                    });
                }, 'image/jpeg', this.config.jpegQuality);
            };

            img.onerror = reject;
        });
    },

    async generatePdfFromImages(images: File[], fileName: string = 'contract.pdf'): Promise<File> {
        // Dynamically import jspdf to avoid load-time issues if not yet installed
        const { jsPDF } = await import('jspdf');

        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        // A4 dimensions in mm
        const pageWidth = 210;
        const pageHeight = 297;

        for (let i = 0; i < images.length; i++) {
            if (i > 0) doc.addPage();

            const imgFile = images[i];
            const imgData = await this.fileToDataUrl(imgFile);

            // Get image dimensions
            const imgProps = doc.getImageProperties(imgData);

            const imgRatio = imgProps.width / imgProps.height;

            let w = pageWidth;
            let h = pageWidth / imgRatio;

            if (h > pageHeight) {
                h = pageHeight;
                w = pageHeight * imgRatio;
            }

            // Center image
            const x = (pageWidth - w) / 2;
            const y = (pageHeight - h) / 2;

            doc.addImage(imgData, 'JPEG', x, y, w, h);
        }

        const blob = doc.output('blob');
        return new File([blob], fileName, { type: 'application/pdf' });
    },

    fileToDataUrl(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
};
