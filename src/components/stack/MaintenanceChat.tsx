import { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { SendIcon, PaperclipIcon, CameraIcon, CheckCircle2Icon } from 'lucide-react';
import { Button } from '../ui/Button';

interface MaintenanceChatProps {
    ticketId?: string;
    propertyAddress?: string; // Passed if new ticket
}

export function MaintenanceChat({ ticketId, propertyAddress }: MaintenanceChatProps) {
    const { t } = useTranslation();
    const [messages, setMessages] = useState([
        { id: 1, sender: 'system', text: 'Ticket #4291 Opened. Pro assigned.', time: '2 days ago' },
        { id: 2, sender: 'tenant', text: 'The AC is making a weird rattling noise.', time: 'Yesterday 14:00', hasImage: true },
        { id: 3, sender: 'me', text: 'Thanks for reporting. I have scheduled a technician.', time: 'Yesterday 14:30' },
        { id: 4, sender: 'system', text: 'Technician Visit: Tomorrow 10:00 - 12:00', time: 'Today 09:00' },
    ]);
    const [input, setInput] = useState('');

    const handleSend = () => {
        if (!input.trim()) return;
        setMessages([...messages, {
            id: Date.now(),
            sender: 'me',
            text: input,
            time: 'Just now',
            hasImage: false
        }]);
        setInput('');
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-black">
            {/* Header */}
            <div className="h-16 border-b border-border bg-white dark:bg-neutral-900 flex items-center justify-between px-6 shrink-0">
                <div>
                    <h2 className="text-sm font-black uppercase tracking-wider">Broken AC - Apt 4</h2>
                    <span className="text-xs text-muted-foreground">{propertyAddress || 'Ben Yehuda 14'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-widest rounded-full">In Progress</span>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : msg.sender === 'system' ? 'items-center' : 'items-start'}`}>
                        {/* System Message */}
                        {msg.sender === 'system' ? (
                            <div className="bg-slate-100 dark:bg-neutral-800 px-4 py-2 rounded-full text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                {msg.text}
                            </div>
                        ) : (
                            // User Message
                            <div className={`max-w-[80%] rounded-2xl p-4 ${msg.sender === 'me'
                                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                    : 'bg-white dark:bg-neutral-800 border border-slate-100 dark:border-neutral-700 rounded-tl-sm'
                                }`}>
                                {msg.hasImage && (
                                    <div className="w-full h-32 bg-slate-200 dark:bg-neutral-700 rounded-lg mb-2 animate-pulse" />
                                )}
                                <p className="text-sm leading-relaxed font-medium">{msg.text}</p>
                                <span className="text-[9px] opacity-50 block mt-2 font-mono uppercase">{msg.time}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-neutral-900 border-t border-border shrink-0 pb-10">
                <div className="flex items-center gap-4">
                    <button className="p-2 text-muted-foreground hover:text-primary transition-colors">
                        <PaperclipIcon className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-muted-foreground hover:text-primary transition-colors">
                        <CameraIcon className="w-5 h-5" />
                    </button>
                    <div className="flex-1 relative">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={t('typeMessage')}
                            className="w-full bg-slate-50 dark:bg-neutral-800 border-none rounded-2xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                        />
                    </div>
                    <Button onClick={handleSend} size="icon" className="rounded-full w-10 h-10 shrink-0">
                        <SendIcon className="w-4 h-4 ml-0.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
