import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertCircle, LogOut, Trash2, Info } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

interface ConfirmActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'primary' | 'danger' | 'warning' | 'info';
    icon?: 'logout' | 'delete' | 'info' | 'warning';
    isLoading?: boolean;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText,
    cancelText,
    variant = 'primary',
    icon = 'info',
    isLoading = false
}) => {
    const { t } = useTranslation();

    const getIcon = () => {
        switch (icon) {
            case 'logout': return <LogOut className="w-8 h-8 text-rose-500" />;
            case 'delete': return <Trash2 className="w-8 h-8 text-rose-500" />;
            case 'warning': return <AlertCircle className="w-8 h-8 text-amber-500" />;
            default: return <Info className="w-8 h-8 text-indigo-500" />;
        }
    };

    const getButtonVariant = () => {
        switch (variant) {
            case 'danger': return 'destructive';
            case 'warning': return 'secondary';
            default: return 'primary';
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
            footer={
                <div className="flex gap-3">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="flex-1 rounded-2xl"
                        disabled={isLoading}
                    >
                        {cancelText || t('cancel')}
                    </Button>
                    <Button
                        variant={getButtonVariant()}
                        onClick={onConfirm}
                        className="flex-1 rounded-2xl"
                        isLoading={isLoading}
                    >
                        {confirmText || t('save')}
                    </Button>
                </div>
            }
        >
            <div className="flex flex-col items-center text-center space-y-4 py-4">
                <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-neutral-800 flex items-center justify-center shadow-minimal border border-slate-100 dark:border-neutral-700 mb-2">
                    {getIcon()}
                </div>
                <div className="space-y-2">
                    <p className="text-muted-foreground dark:text-neutral-400 font-medium leading-relaxed px-4">
                        {message}
                    </p>
                </div>
            </div>
        </Modal>
    );
};
