import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { supabase } from '../../lib/supabase';

const AdminGuard = () => {
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;

            if (!user) {
                setIsAdmin(false);
                return;
            }

            // Check role in user_profiles
            const { data } = await supabase
                .from('user_profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (data?.role === 'admin') {
                setIsAdmin(true);
            } else {
                setIsAdmin(false);
            }
        };

        checkAdmin();
    }, []);

    if (isAdmin === false) {
        // If not admin (logged in but not admin, OR not logged in), redirect.
        // If they are not logged in at all, checking 'isAdmin' might be insufficient if we want to distinguish.
        // But for security:
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export default AdminGuard;
