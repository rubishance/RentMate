import { toast } from 'sonner';

/**
 * useToast Hook
 * Centralized notification system for RentMate.
 * Replaces browser alerts with professional toast notifications.
 */
export function useToast() {
    return {
        success: (message: string, options?: any) => {
            const toastOptions = typeof options === 'string' ? { description: options } : options;
            toast.success(message, toastOptions);
        },
        error: (message: string, options?: any) => {
            const toastOptions = typeof options === 'string' ? { description: options } : options;
            toast.error(message, toastOptions);
        },
        info: (message: string, options?: any) => {
            const toastOptions = typeof options === 'string' ? { description: options } : options;
            toast(message, toastOptions);
        },
        warning: (message: string, options?: any) => {
            const toastOptions = typeof options === 'string' ? { description: options } : options;
            toast.warning(message, toastOptions);
        },
        loading: (message: string) => {
            return toast.loading(message);
        },
        dismiss: (id?: string | number) => {
            toast.dismiss(id);
        },
    };
}
