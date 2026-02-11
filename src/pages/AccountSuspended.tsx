import React from 'react';
import { ShieldAlert, Mail, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function AccountSuspended() {
    const { profile } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-neutral-950 p-4">
            <div className="max-w-md w-full glass-premium p-8 rounded-[2.5rem] shadow-premium text-center space-y-6 border border-red-500/20">
                <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto">
                    <ShieldAlert className="w-10 h-10 text-red-500" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-black tracking-tighter text-foreground uppercase">
                        {profile?.security_status === 'banned' ? 'חשבון חסום' : 'חשבון מושהה'}
                    </h1>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        הגישה לחשבון שלך הוגבלה עקב הפרה של תנאי השימוש או פעילות חריגה.
                        אם לדעתך חלה טעות, אנא צור קשר עם התמיכה.
                    </p>
                </div>

                <div className="pt-4 space-y-3">
                    <a
                        href="mailto:support@rentmate.co.il"
                        className="w-full h-14 bg-foreground text-background font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-premium-dark"
                    >
                        <Mail className="w-4 h-4" />
                        צור קשר עם התמיכה
                    </a>

                    <button
                        onClick={handleLogout}
                        className="w-full h-14 bg-slate-100 dark:bg-neutral-900 text-foreground font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-neutral-800 transition-all border border-slate-200 dark:border-neutral-800"
                    >
                        <LogOut className="w-4 h-4" />
                        יציאה מהחשבון
                    </button>
                </div>

                <p className="text-[10px] text-muted-foreground uppercase tracking-widest pt-4 opacity-40">
                    RENTMATE SECURITY CENTER
                </p>
            </div>
        </div>
    );
}
