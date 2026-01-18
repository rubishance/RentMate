import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Check, Star, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../hooks/useTranslation';

interface UpgradeRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    source?: string;
}

export default function UpgradeRequestModal({ isOpen, onClose, source }: UpgradeRequestModalProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleRequestUpgrade = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('admin_notifications')
                .insert({
                    user_id: user.id,
                    type: 'upgrade_request',
                    content: {
                        requested_plan: 'pro',
                        source: source || 'unknown'
                    },
                    status: 'pending'
                });

            if (error) throw error;
            setSuccess(true);
        } catch (error) {
            console.error('Error requesting upgrade:', error);
            alert(t('error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-6 text-left align-middle shadow-xl transition-all border border-white/20">

                                {success ? (
                                    <div className="text-center py-10">
                                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
                                            <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                                        </div>
                                        <Dialog.Title as="h3" className="text-2xl font-bold leading-6 text-gray-900 dark:text-white mb-2">
                                            {t('requestSent')}
                                        </Dialog.Title>
                                        <p className="text-gray-500 dark:text-gray-400 mb-8">
                                            {t('requestSentDesc')}
                                        </p>
                                        <button
                                            onClick={onClose}
                                            className="inline-flex justify-center rounded-xl border border-transparent bg-blue-600 px-8 py-3 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                                        >
                                            {t('gotItThanks')}
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <Dialog.Title as="h3" className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                    {t('upgradeToPro')} <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                                </Dialog.Title>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                    {t('unlockPotential')}
                                                </p>
                                            </div>
                                            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                                <X className="w-5 h-5 text-gray-500" />
                                            </button>
                                        </div>

                                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-200 dark:border-slate-700">
                                            <div className="grid grid-cols-3 gap-4 text-sm mb-3 font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2">
                                                <div>{t('feature')}</div>
                                                <div className="text-center">{t('free')}</div>
                                                <div className="text-center text-blue-600 dark:text-blue-400">{t('pro')}</div>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="grid grid-cols-3 gap-4 text-sm items-center">
                                                    <div className="font-medium">{t('properties')}</div>
                                                    <div className="text-center text-gray-600 dark:text-gray-300">2</div>
                                                    <div className="text-center font-bold text-blue-600 dark:text-blue-400">{t('unlimited')}</div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 text-sm items-center">
                                                    <div className="font-medium">{t('tenants')}</div>
                                                    <div className="text-center text-gray-600 dark:text-gray-300">5</div>
                                                    <div className="text-center font-bold text-blue-600 dark:text-blue-400">{t('unlimited')}</div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 text-sm items-center">
                                                    <div className="font-medium">{t('contracts')}</div>
                                                    <div className="text-center text-gray-600 dark:text-gray-300">2</div>
                                                    <div className="text-center font-bold text-blue-600 dark:text-blue-400">{t('unlimited')}</div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 text-sm items-center">
                                                    <div className="font-medium">{t('dataExport')}</div>
                                                    <div className="text-center text-gray-400"><X className="w-4 h-4 mx-auto" /></div>
                                                    <div className="text-center text-blue-600 dark:text-blue-400"><Check className="w-4 h-4 mx-auto" /></div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 text-sm items-center">
                                                    <div className="font-medium">{t('prioritySupport')}</div>
                                                    <div className="text-center text-gray-400"><X className="w-4 h-4 mx-auto" /></div>
                                                    <div className="text-center text-blue-600 dark:text-blue-400"><Check className="w-4 h-4 mx-auto" /></div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-3">
                                            <button
                                                type="button"
                                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                                onClick={onClose}
                                            >
                                                {t('maybeLater')}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={loading}
                                                className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
                                                onClick={handleRequestUpgrade}
                                            >
                                                {loading ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        {t('sending')}
                                                    </>
                                                ) : (
                                                    <>
                                                        {t('requestUpgrade')} <Star className="w-4 h-4 fill-current" />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
