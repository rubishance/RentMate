import { toast } from 'sonner';

/**
 * useToast Hook
 * Centralized notification system for RentMate.
 * Replaces browser alerts with professional toast notifications.
 */
export function useToast() {
    return {
        success: (message: string, options?: any) => {
            toast.success(message, options);
        },
        error: (message: string, options?: any) => {
            toast.error(message, options);
        },
        info: (message: string, options?: any) => {
            toast(message, options);
        },
        warning: (message: string, options?: any) => {
            toast.warning(message, options);
        },
        loading: (message: string) => {
            return toast.loading(message);
        },
        dismiss: (id?: string | number) => {
            toast.dismiss(id);
        },
    };
}
