import logoHeader from '../../assets/rentmate-logo-header.png';

export function TopBar() {
    return (
        <header className="fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-sm border-b border-border z-[60] flex items-center justify-center shadow-sm">
            <div className="flex items-center gap-2">
                <img
                    src={logoHeader}
                    alt="RentMate Logo"
                    className="h-10 w-auto object-contain"
                />
                <span className="text-xl tracking-tighter text-black dark:text-white leading-none font-sans">
                    <span className="font-black">Rent</span>
                    <span className="font-normal">Mate</span>
                </span>
            </div>
        </header>
    );
}
