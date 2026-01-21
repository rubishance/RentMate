import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

const SuperAdminGuard = () => {
    const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);

    useEffect(() => {
        const checkSuperAdmin = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;

            if (!user) {
                setIsSuperAdmin(false);
                return;
            }

            // Check is_super_admin in user_profiles
            const { data, error } = await supabase
                .from('user_profiles')
                .select('is_super_admin')
                .eq('id', user.id)
                .single();

            if (error || !data) {
                setIsSuperAdmin(false);
                return;
            }

            setIsSuperAdmin(data.is_super_admin === true);
        };

        checkSuperAdmin();
    }, []);

    if (isSuperAdmin === null) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
        );
    }

    if (isSuperAdmin === false) {
        return <Navigate to="/admin" replace />;
    }

    return <Outlet />;
};

export default SuperAdminGuard;
