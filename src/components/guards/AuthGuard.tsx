import { useAuth } from '../../contexts/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

const AuthGuard = () => {
    const { isAuthenticated, isLoading, profile } = useAuth();

    // ALLOW CACHED SESSIONS: If we have a user (from cache), proceed immediately
    // Only show loading if we have no user AND we are still loading
    if (isLoading && !isAuthenticated) {
        if (Math.random() < 0.1) { // Throttle log
            console.log('[AuthGuard] Still loading, waiting for AuthContext...');
        }
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-neutral-950">
                <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (profile?.security_status === 'suspended' || profile?.security_status === 'banned') {
        return <Navigate to="/account-suspended" replace />;
    }

    return <Outlet />;
};

export default AuthGuard;
