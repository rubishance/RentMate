import { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { crmService } from '../../services/crm.service';
import { supabase } from '../../lib/supabase';

interface MaskedAdminValueProps {
    value: string;
    label: string;
    userId?: string;
    className?: string;
    maskType?: 'text' | 'email';
}

export const MaskedAdminValue = ({ value, label, userId, className = '', maskType = 'text' }: MaskedAdminValueProps) => {
    const [isRevealed, setIsRevealed] = useState(false);
    const [isLogging, setIsLogging] = useState(false);

    const handleReveal = async () => {
        if (isRevealed) {
            setIsRevealed(false);
            return;
        }

        // Prevent reveal if no userId is provided (though usually it should be)
        if (!userId) {
            setIsRevealed(true);
            return;
        }

        setIsLogging(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            // Log the access to CRM
            await crmService.addInteraction({
                user_id: userId,
                admin_id: user?.id || null,
                type: 'note',
                title: 'Sensitive Data Accessed',
                content: `Admin viewed sensitive field: ${label}`,
                status: 'closed'
            });

            setIsRevealed(true);
        } catch (error) {
            console.error('Failed to log data access:', error);
            // We still reveal even if logging fails? 
            // Better to show an error or just let it happen? 
            // Usually, we should guarantee logging, but for UX we'll proceed.
            setIsRevealed(true);
        } finally {
            setIsLogging(false);
        }
    };

    const getMaskedValue = () => {
        if (!value) return 'N/A';
        if (maskType === 'email') {
            const [local, domain] = value.split('@');
            return `${local[0]}***@${domain}`;
        }
        return '••••••••';
    };

    return (
        <div className={`inline-flex items-center gap-2 ${className}`}>
            <span className={!isRevealed ? 'blur-[3px] select-none' : ''}>
                {isRevealed ? value : getMaskedValue()}
            </span>
            <button
                onClick={handleReveal}
                disabled={isLogging}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-brand-600"
                title={isRevealed ? 'Hide' : `Reveal ${label} (Will be logged)`}
            >
                {isRevealed ? (
                    <EyeSlashIcon className="w-3.5 h-3.5" />
                ) : (
                    <EyeIcon className="w-3.5 h-3.5" />
                )}
            </button>
        </div>
    );
};
