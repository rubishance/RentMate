import { toast } from 'sonner';

/**
 * useToast Hook
 * Centralized notification system for RentMate.
 * Replaces browser alerts with professional toast notifications.
 */
export function useToast() {
    return {
        success: (message: string, description?: string) => {
            toast.success(message, { description });
        },
        error: (message: string, description?: string) => {
            toast.error(message, { description });
        },
        info: (message: string, description?: string) => {
            toast(message, { description });
        },
        warning: (message: string, description?: string) => {
            toast.warning(message, { description });
        },
        loading: (message: string) => {
            return toast.loading(message);
        },
        dismiss: (id?: string | number) => {
            toast.dismiss(id);
        },
    };
}
