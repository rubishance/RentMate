import { Fragment } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { Bell, CheckIcon } from 'lucide-react';
import { CheckIcon as MsgCheckIcon } from '../icons/MessageIcons';
import { NotificationSuccessIcon, NotificationWarningIcon, NotificationErrorIcon, NotificationInfoIcon } from '../icons/NotificationIcons';
import { useNotifications } from '../../contexts/NotificationsContext';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { WhatsAppService } from '../../services/whatsapp.service';

export function NotificationCenter() {
    const { notifications, unreadCount, markAsRead, markAllAsRead, requestPermission, permission } = useNotifications();
    const { t, lang } = useTranslation();
    const navigate = useNavigate();

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <NotificationSuccessIcon className="w-5 h-5 text-green-500" />;
            case 'warning': return <NotificationWarningIcon className="w-5 h-5 text-orange-500" />;
            case 'error': return <NotificationErrorIcon className="w-5 h-5 text-red-500" />;
            default: return <NotificationInfoIcon className="w-5 h-5 text-primary" />;
        }
    };

    const handleNotificationClick = (notification: any) => {
        markAsRead(notification.id);

        // WhatsApp One-Tap Logic
        if (notification.type === 'whatsapp_trigger' && notification.metadata) {
            const { recipientPhone, messageType, context } = notification.metadata;

            // Guard: Filter out automated receipts and reminders if they bypass context filter
            if (
                messageType === 'receipt' ||
                messageType === 'rent_reminder' ||
                (context && (context.includes('receiv') || context.includes('remind')))
            ) {
                console.log('Ignored automated WhatsApp trigger:', messageType);
                return;
            }

            // Generate the deep link dynamically
            const link = WhatsAppService.generateLink(recipientPhone, context || ''); // Context as message or use specific method
            window.open(link, '_blank');
            return;
        }

        // Navigate based on metadata
        if (notification.metadata) {
            if (notification.metadata.contract_id) {
                navigate('/properties');
            } else if (notification.metadata.payment_id) {
                navigate('/payments');
            }
        }
    };

    return (
        <Popover className="relative">
            {({ open }) => (
                <>
                    <Popover.Button
                        className={`p-2 rounded-full transition-colors relative outline-none ring-0 ${open
                            ? 'bg-muted dark:bg-gray-700 text-foreground dark:text-gray-100'
                            : 'text-muted-foreground hover:text-muted-foreground dark:text-muted-foreground dark:hover:text-gray-200 hover:bg-muted dark:hover:bg-gray-800'
                            }`}
                    >
                        <Bell className="w-6 h-6" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900" />
                        )}
                    </Popover.Button>

                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 translate-y-1"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100 translate-y-0"
                        leaveTo="opacity-0 translate-y-1"
                    >
                        <Popover.Panel className={`fixed sm:absolute z-50 mt-2 top-24 sm:top-auto left-4 right-4 sm:left-auto sm:right-0 w-[calc(100vw-2rem)] sm:w-96 max-w-sm rounded-2xl bg-white dark:bg-foreground shadow-xl ring-1 ring-black/5 dark:ring-white/10 focus:outline-none overflow-hidden ${lang === 'he' ? 'sm:origin-top-left' : 'sm:origin-top-right'}`}>
                            <div className="p-4 border-b border-border dark:border-gray-800 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-foreground dark:text-white">{t('notificationsTitle')}</h3>
                                <div className="flex items-center gap-4">
                                    {permission === 'default' && (
                                        <button
                                            onClick={requestPermission}
                                            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                                        >
                                            {t('enablePush')}
                                        </button>
                                    )}
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={markAllAsRead}
                                            className="text-xs text-muted-foreground hover:text-gray-700 dark:text-muted-foreground flex items-center gap-1"
                                        >
                                            <MsgCheckIcon className="w-3 h-3" /> {t('markAllRead')}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="max-h-[60vh] overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground dark:text-muted-foreground">
                                        <div className="flex justify-center mb-3">
                                            <Bell className="w-8 h-8 opacity-20" />
                                        </div>
                                        <p className="text-sm">{t('noNotifications')}</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {notifications.map((notification) => (
                                            <div
                                                key={notification.id}
                                                className={`p-4 hover:bg-secondary dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${!notification.read_at ? 'bg-primary/5 dark:bg-primary/10' : ''
                                                    }`}
                                                onClick={() => handleNotificationClick(notification)}
                                            >
                                                <div className="flex gap-3">
                                                    <div className="mt-1 shrink-0">
                                                        {getIcon(notification.type)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm ${!notification.read_at
                                                            ? 'font-semibold text-foreground dark:text-white'
                                                            : 'font-medium text-gray-700 dark:text-gray-300'
                                                            }`}>
                                                            {notification.title}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1 line-clamp-2">
                                                            {notification.message}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-2">
                                                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                                        </p>
                                                    </div>
                                                    {!notification.read_at && (
                                                        <div className="shrink-0 self-center">
                                                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Popover.Panel>
                    </Transition>
                </>
            )}
        </Popover>
    );
}
