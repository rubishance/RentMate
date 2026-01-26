import { useNavigate } from 'react-router-dom';
import logoIconOnly from '../../assets/rentmate-icon-only.png';
import logoIconDark from '../../assets/rentmate-icon-only-dark.png';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

export function TopBar() {
    const navigate = useNavigate();
    const { effectiveTheme } = useUserPreferences();

    return (
        <header className="fixed top-0 left-0 right-0 h-16 bg-white/95 dark:bg-black/95 backdrop-blur-sm border-b border-slate-100 dark:border-neutral-900 z-[60] flex items-center justify-center shadow-sm">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/dashboard')}>
                <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform duration-500">
                    <img
                        src={effectiveTheme === 'dark' ? logoIconDark : logoIconOnly}
                        alt="RentMate"
                        className="w-5 h-5 invert dark:invert-0"
                    />
                </div>
                <span className="text-2xl tracking-tighter text-black dark:text-white leading-none font-sans lowercase">
                    <span className="font-black">Rent</span>
                    <span className="font-normal opacity-40">Mate</span>
                </span>
            </div>
        </header>
    );
}
