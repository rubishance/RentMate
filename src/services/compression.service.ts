import imageCompression from 'browser-image-compression';

export class CompressionService {
    /**
     * Compress an image file
     */
    static async compressImage(file: File): Promise<File> {
        // Skip compression for small files
        if (file.size < 1024 * 1024) return file; // < 1MB

        const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: file.type // Preserve original type
        };

        try {
            return await imageCompression(file, options);
        } catch (error) {
            console.error('Image compression failed:', error);
            return file; // Return original if compression fails
        }
    }

    /**
     * Check if file is an image
     */
    static isImage(file: File): boolean {
        return file.type.startsWith('image/');
    }

    /**
     * Compress a video file (Placeholder / Basic logic)
     * Real video compression is heavy on client-side.
     * We will check size and warn, or use a future service.
     */
    static async validateVideo(file: File): Promise<void> {
        const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
        if (file.size > MAX_VIDEO_SIZE) {
            throw new Error(`Video file is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max size is 100MB.`);
        }
    }
}
