import logoFinalCleanV2 from '../../assets/logo-final-clean-v2.png';

export function TopBar() {
    return (
        <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-b border-white/20 z-[60] flex items-center justify-center shadow-sm">
            <div className="flex items-center gap-2">
                <img
                    src={logoFinalCleanV2}
                    alt="RentMate Logo - Home"
                    className="h-12 w-auto object-contain"
                />
            </div>
        </header>
    );
}
