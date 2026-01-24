import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageSquare, X, Camera, Loader2, Send } from 'lucide-react';
import html2canvas from 'html2canvas';
import { motion } from 'framer-motion';

export function FeedbackWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [type, setType] = useState<'bug' | 'feature' | 'other'>('bug');
    const [loading, setLoading] = useState(false);
    const [includeScreenshot, setIncludeScreenshot] = useState(true);
    const [manualFile, setManualFile] = useState<File | null>(null);
    const widgetRef = useRef<HTMLDivElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let screenshotUrl = null;

            // Priority: Manual file upload > Auto-capture
            if (manualFile) {
                // Upload manual file
                const fileName = `manual-${Date.now()}.${manualFile.name.split('.').pop()}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('feedback-screenshots')
                    .upload(fileName, manualFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('feedback-screenshots')
                    .getPublicUrl(fileName);

                screenshotUrl = publicUrl;

            } else if (includeScreenshot) {
                // Auto-capture screenshot
                if (widgetRef.current) widgetRef.current.style.display = 'none';

                const canvas = await html2canvas(document.body, {
                    ignoreElements: (element) => element.id === 'feedback-widget'
                });

                if (widgetRef.current) widgetRef.current.style.display = 'block';

                const blob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.7));

                const fileName = `auto-${Date.now()}.jpg`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('feedback-screenshots')
                    .upload(fileName, blob);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('feedback-screenshots')
                    .getPublicUrl(fileName);

                screenshotUrl = publicUrl;
            }

            // Get User
            const { data: { user } } = await supabase.auth.getUser();

            // Insert Feedback
            const { error: insertError } = await supabase
                .from('feedback')
                .insert({
                    user_id: user?.id || null,
                    message,
                    type,
                    screenshot_url: screenshotUrl,
                    device_info: {
                        userAgent: navigator.userAgent,
                        screen: { width: window.innerWidth, height: window.innerHeight },
                        url: window.location.href
                    }
                });

            if (insertError) throw insertError;

            // Reset & Close
            alert('Feedback sent! Thank you for helping us improve.');
            setMessage('');
            setType('bug');
            setIsOpen(false);

        } catch (error: any) {
            console.error('Feedback Error:', error);
            alert('Failed to send feedback: ' + error.message);
        } finally {
            setLoading(false);
            if (widgetRef.current) widgetRef.current.style.display = 'block'; // Ensure visibility
        }
    };

    return (
        <motion.div
            id="feedback-widget"
            ref={widgetRef}
            drag
            dragConstraints={{ left: -window.innerWidth + 80, right: 0, top: -window.innerHeight + 80, bottom: 0 }}
            dragElastic={0.1}
            className={`fixed bottom-24 right-20 z-[60] ${isOpen
                ? "w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-border dark:border-gray-700 overflow-hidden"
                : "animate-in slide-in-from-bottom-5 fade-in duration-300"
                }`}
        >
            {!isOpen ? (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-black hover:bg-gray-800 text-white p-3 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 flex items-center gap-2 group"
                >
                    <MessageSquare className="w-5 h-5" />
                    <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap opacity-0 group-hover:opacity-100 pr-1">
                        Give Feedback
                    </span>
                </button>
            ) : (
                <>
                    {/* Header */}
                    <div className="bg-black p-4 flex items-center justify-between text-white cursor-move">
                        <h3 className="font-bold flex items-center gap-2">
                            <MessageSquare className="w-5 h-5" />
                            Send Feedback
                        </h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="hover:bg-white/20 p-1 rounded-full transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-4 space-y-4">

                        {/* Type Selection */}
                        <div className="flex bg-muted dark:bg-gray-700 rounded-lg p-1">
                            {(['bug', 'feature', 'other'] as const).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setType(t)}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${type === t
                                        ? 'bg-white dark:bg-gray-600 shadow text-black dark:text-white'
                                        : 'text-muted-foreground hover:text-gray-700 dark:text-muted-foreground'
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>

                        {/* Message */}
                        <textarea
                            required
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Describe the issue or idea..."
                            className="w-full h-24 resize-none p-3 text-sm rounded-xl border border-border dark:border-gray-700 bg-secondary dark:bg-gray-900 focus:ring-2 focus:ring-black/10 outline-none transition-all text-foreground"
                        />

                        {/* Manual File Upload */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Upload Screenshot (Optional)
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setManualFile(file);
                                        setIncludeScreenshot(false); // Disable auto-capture if manual file is selected
                                    }
                                }}
                                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer"
                            />
                            {manualFile && (
                                <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
                                    <Camera className="w-4 h-4" />
                                    <span className="flex-1 truncate">{manualFile.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setManualFile(null);
                                            setIncludeScreenshot(true);
                                        }}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Screenshot Toggle */}
                        <label className="flex items-center gap-2 text-sm text-muted-foreground dark:text-gray-300 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={includeScreenshot && !manualFile}
                                disabled={!!manualFile}
                                onChange={(e) => setIncludeScreenshot(e.target.checked)}
                                className="rounded text-black focus:ring-black disabled:opacity-50"
                            />
                            <Camera className="w-4 h-4" />
                            Auto-capture Page Screenshot
                        </label>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading || !message.trim()}
                            className="w-full bg-black hover:bg-gray-800 text-white py-2.5 rounded-xl font-medium shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            Send Report
                        </button>
                    </form>
                </>
            )}
        </motion.div>
    );
}
