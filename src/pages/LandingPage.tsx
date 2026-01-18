import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import '../styles/marketing-glass.css';
import { HeroSection } from '../components/marketing/HeroSection';
import { BentoGrid } from '../components/marketing/BentoGrid';

export function LandingPage() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user || null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <div className="min-h-screen bg-[#0f172a] text-white font-sans text-right" dir="rtl">
            {/* Nav */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#0f172a]/80 backdrop-blur-md">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <i className="ph ph-house-line text-2xl text-blue-500"></i>
                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">RentMate</span>
                    </div>

                    <div className="hidden md:flex gap-8 text-sm font-medium text-gray-300">
                        <a href="#" className="hover:text-white transition">פיצ'רים</a>
                        <a href="#" className="hover:text-white transition">מחירים</a>
                        <a href="#" className="hover:text-white transition">אודות</a>
                    </div>

                    <div>
                        {user ? (
                            <Link to="/dashboard" className="px-5 py-2 bg-white/10 hover:bg-white/20 rounded-full text-sm transition-all border border-white/10">
                                למערכת
                            </Link>
                        ) : (
                            <Link to="/login" className="px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full text-sm font-bold shadow-lg hover:shadow-blue-500/25 transition-all">
                                כניסה
                            </Link>
                        )}
                    </div>
                </div>
            </nav>

            <HeroSection />

            <BentoGrid />

            {/* Footer */}
            <footer className="border-t border-white/5 py-12 mt-12 bg-[#0b1120]">
                <div className="container mx-auto px-4 text-center text-gray-500">
                    <div className="text-2xl font-bold text-white mb-6 inline-block">RentMate</div>
                    <div className="flex justify-center gap-8 mb-8 text-sm">
                        <a href="#" className="hover:text-blue-400">תנאי שימוש</a>
                        <a href="#" className="hover:text-blue-400">מדיניות פרטיות</a>
                        <a href="#" className="hover:text-blue-400">צור קשר</a>
                    </div>
                    <p className="text-xs">&copy; {new Date().getFullYear()} RentMate. כל הזכויות שמורות.</p>
                </div>
            </footer>
        </div>
    );
}
