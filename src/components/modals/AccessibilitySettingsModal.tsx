import { X, Type, Eye, Accessibility, Type as TypeIcon, ZoomIn } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { Switch } from '../ui/Switch';

interface AccessibilitySettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AccessibilitySettingsModal({ isOpen, onClose }: AccessibilitySettingsModalProps) {
    const { t } = useTranslation();
    const { preferences, setAccessibility } = useUserPreferences();

    // Default to false if accessibility object is not yet defined
    const options = preferences.accessibility || {
        highContrast: false,
        largeText: false,
        reducedMotion: false,
        dyslexiaFont: false
    };

    if (!isOpen) return null;

    const toggleOption = (key: keyof typeof options) => {
        setAccessibility({
            [key]: !options[key]
        });
    };

    const accessibilityFeatures = [
        {
            id: 'largeText',
            icon: ZoomIn,
            title: t('accessibility_large_text_title') || 'Large Text',
            description: t('accessibility_large_text_desc') || 'Increases the size of text throughout the app',
            active: options.largeText
        },
        {
            id: 'highContrast',
            icon: Eye,
            title: t('accessibility_high_contrast_title') || 'High Contrast',
            description: t('accessibility_high_contrast_desc') || 'Increases contrast between text and backgrounds',
            active: options.highContrast
        },
        {
            id: 'reducedMotion',
            icon: Accessibility,
            title: t('accessibility_reduced_motion_title') || 'Reduced Motion',
            description: t('accessibility_reduced_motion_desc') || 'Minimizes animations and transitions',
            active: options.reducedMotion
        },
        {
            id: 'dyslexiaFont',
            icon: TypeIcon,
            title: t('accessibility_dyslexia_font_title') || 'Dyslexia Friendly Font',
            description: t('accessibility_dyslexia_font_desc') || 'Uses a specialized font reading mode',
            active: options.dyslexiaFont
        }
    ];

    return (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-jewel animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="sticky top-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-neutral-800 px-8 py-6 flex items-center justify-between z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <Accessibility className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-foreground tracking-tighter lowercase">
                                {t('accessibilityStatement') || 'Accessibility'}
                            </h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                                {t('accessibility_subtitle') || 'Customize your experience'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-neutral-800 flex items-center justify-center hover:scale-110 hover:bg-slate-200 dark:hover:bg-neutral-700 transition-all text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-4 relative">
                    {accessibilityFeatures.map((feature) => (
                        <div
                            key={feature.id}
                            className="bg-slate-50 dark:bg-neutral-800/50 border border-slate-100 dark:border-neutral-800 rounded-[2rem] p-6 flex items-center justify-between gap-6 hover:border-primary/20 transition-colors"
                        >
                            <div className="flex items-start gap-4 flex-1">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${feature.active
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-white dark:bg-neutral-800 text-muted-foreground border border-slate-200 dark:border-neutral-700'
                                    }`}>
                                    <feature.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base text-foreground mb-1 leading-tight">
                                        {feature.title}
                                    </h3>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                            </div>

                            <Switch
                                checked={feature.active}
                                onChange={() => toggleOption(feature.id as any)}
                            />
                        </div>
                    ))}

                    <div className="pt-6 mt-6 border-t border-slate-100 dark:border-neutral-800">
                        <p className="text-xs text-center text-muted-foreground font-medium uppercase tracking-widest px-8">
                            {t('accessibility_law_note') || 'These options provide native accessibility support in compliance with the Equal Rights for Persons with Disabilities Law.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
