import { Menu, MenuButton, MenuItem, MenuItems, Transition, Portal } from '@headlessui/react';
import { Plus } from 'lucide-react';
import { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { useStack } from '../../contexts/StackContext';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { AssetsIcon, ContractsIcon, PaymentsIcon } from '../icons/NavIcons';

interface QuickActionsProps {
    onPropertyAdded?: () => void;
    onPaymentTrigger?: () => void;
}

export function QuickActions({ onPropertyAdded, onPaymentTrigger }: QuickActionsProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { push } = useStack();

    const actions = [
        {
            id: 'asset',
            label: t('asset'),
            icon: AssetsIcon,
            color: 'text-blue-500',
            onClick: () => {
                push('wizard', {
                    onSuccess: () => {
                        if (onPropertyAdded) onPropertyAdded();
                    }
                }, { isExpanded: true, title: t('addProperty') });
            }
        },
        {
            id: 'contract',
            label: t('contract'),
            icon: ContractsIcon,
            color: 'text-emerald-500',
            onClick: () => navigate('/contracts/new')
        },
        {
            id: 'payment',
            label: t('payment'),
            icon: PaymentsIcon,
            color: 'text-amber-500',
            onClick: () => {
                if (onPaymentTrigger) onPaymentTrigger();
            }
        }
    ];

    return (
        <Menu as="div" className="relative inline-block text-left">
            <div>
                <MenuButton as={Fragment}>
                    <Button
                        className="w-12 h-12 rounded-[1.2rem] shadow-jewel p-0 flex items-center justify-center shrink-0"
                    >
                        <Plus className="w-6 h-6" />
                    </Button>
                </MenuButton>
            </div>

            <Portal>
                <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                >
                    <MenuItems
                        anchor="bottom end"
                        className={cn(
                            "z-[100] min-w-[200px] mt-2 origin-top-right bg-window/80 backdrop-blur-xl rounded-[2.5rem] shadow-premium border border-white/20 p-2 focus:outline-none",
                            "animate-in fade-in zoom-in-95 duration-100"
                        )}
                    >
                        <div className="py-1">
                            {actions.map((action) => (
                                <MenuItem key={action.id}>
                                    {({ focus }) => (
                                        <button
                                            onClick={action.onClick}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-2xl transition-all",
                                                focus ? "bg-white/50 dark:bg-white/10 text-foreground scale-[1.02]" : "text-muted-foreground"
                                            )}
                                        >
                                            <div className={cn("p-2 rounded-xl bg-white dark:bg-black/20 shadow-sm", action.color)}>
                                                <action.icon className="w-4 h-4" />
                                            </div>
                                            {action.label}
                                        </button>
                                    )}
                                </MenuItem>
                            ))}
                        </div>
                    </MenuItems>
                </Transition>
            </Portal>
        </Menu>
    );
}
