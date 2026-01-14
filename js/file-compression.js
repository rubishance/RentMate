/**
 * File Compression Utility
 * Compresses images before upload to reduce file size while maintaining OCR quality
 */

const FileCompression = {
    // Configuration
    config: {
        maxWidth: 1600,
        maxHeight: 1600,
        jpegQuality: 0.75,
        pngQuality: 0.75,
        minSizeToCompress: 300 * 1024, // 300KB - don't compress smaller files
        targetSize: 400 * 1024, // 400KB target
    },

    /**
     * Determines if a file should be compressed
     * @param {File} file - The file to check
     * @returns {boolean}
     */
    shouldCompress(file) {
        // Only compress images
        if (!file.type.startsWith('image/')) {
            return false;
        }

        // Don't compress PDFs or already small images
        if (file.size < this.config.minSizeToCompress) {
            return false;
        }

        return true;
    },

    /**
     * Checks if a file is a PDF
     * @param {File} file 
     * @returns {boolean}
     */
    isPdf(file) {
        return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    },

    /**
     * Converts a PDF file to an array of image files (one per page)
     * @param {File} file - The PDF file
     * @returns {Promise<File[]>} Array of image files
     */
    async convertPdfToImages(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            const images = [];

            console.log(`Converting PDF: ${file.name}, Pages: ${pdf.numPages}`);

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 2.0 }); // 2.0 scale for better OCR quality
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context, viewport: viewport }).promise;

                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', this.config.jpegQuality));
                const imageFile = new File([blob], `${file.name.replace('.pdf', '')}_p${i}.jpg`, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                });
                images.push(imageFile);
            }

            return images;
        } catch (error) {
            console.error('PDF Conversion Error:', error);
            throw new Error('Failed to convert PDF to images: ' + error.message);
        }
    },

    /**
     * Compresses an image file
     * @param {File} file - The image file to compress
     * @param {Object} options - Optional compression settings
     * @returns {Promise<{file: File, originalSize: number, compressedSize: number, compressionRatio: number}>}
     */
    async compressImage(file, options = {}) {
        const config = { ...this.config, ...options };
        const originalSize = file.size;

        return new Promise((resolve, reject) => {
            // Create an image element
            const img = new Image();
            const reader = new FileReader();

            reader.onload = (e) => {
                img.src = e.target.result;
            };

            reader.onerror = (error) => {
                reject(new Error('Failed to read file: ' + error));
            };

            img.onload = () => {
                try {
                    // Calculate new dimensions maintaining aspect ratio
                    let width = img.width;
                    let height = img.height;

                    if (width > config.maxWidth || height > config.maxHeight) {
                        const ratio = Math.min(
                            config.maxWidth / width,
                            config.maxHeight / height
                        );
                        width = Math.floor(width * ratio);
                        height = Math.floor(height * ratio);
                    }

                    // Create canvas and draw resized image
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');

                    // Use high-quality image smoothing for better text clarity
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';

                    ctx.drawImage(img, 0, 0, width, height);

                    // Determine output format and quality
                    let outputFormat = 'image/jpeg';
                    let quality = config.jpegQuality;

                    if (file.type === 'image/png') {
                        // Try JPEG first, but keep PNG if transparency is detected
                        outputFormat = 'image/jpeg';
                        quality = config.pngQuality;
                    }

                    // Convert canvas to blob
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('Failed to compress image'));
                                return;
                            }

                            // Create new file from blob
                            const compressedFile = new File(
                                [blob],
                                file.name.replace(/\.\w+$/, '.jpg'), // Change extension to .jpg
                                {
                                    type: outputFormat,
                                    lastModified: Date.now(),
                                }
                            );

                            const compressedSize = compressedFile.size;
                            const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

                            resolve({
                                file: compressedFile,
                                originalSize,
                                compressedSize,
                                compressionRatio: parseFloat(compressionRatio),
                            });
                        },
                        outputFormat,
                        quality
                    );
                } catch (error) {
                    reject(new Error('Compression failed: ' + error.message));
                }
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };

            // Read the file
            reader.readAsDataURL(file);
        });
    },

    /**
     * Format file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string}
     */
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },
};

// Make available globally
window.FileCompression = FileCompression;
