import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { ErrorDisplay } from './ErrorDisplay';

export const RouteErrorBoundary = () => {
    const error = useRouteError();
    console.error('Route error has occurred:', error);

    // Auto-recovery for Vite dynamically imported module failures (chunk loading failed)
    // This typically happens on deployments or when the dev server restarts
    const errorMessage = (error as Error)?.message || '';
    if (
        errorMessage.includes('Failed to fetch dynamically imported module') ||
        errorMessage.includes('Importing a module script failed') ||
        (error instanceof TypeError && errorMessage === 'Failed to fetch')
    ) {
        // Prevent infinite loops using a quick sessionStorage flag
        if (!sessionStorage.getItem('chunk_failed_reload')) {
            sessionStorage.setItem('chunk_failed_reload', 'true');
            window.location.reload();
            return <div className="p-8 text-center text-muted-foreground">Reloading application...</div>;
        } else {
            // If it already reloaded once and failed again, clear the flag and show error
            sessionStorage.removeItem('chunk_failed_reload');
        }
    }

    // Case 1: React Router known error (404, etc)
    if (isRouteErrorResponse(error)) {
        return (
            <ErrorDisplay
                is404={error.status === 404}
                title={error.status === 404 ? undefined : `${error.status} Error`}
                description={error.statusText || error.data?.message}
            />
        );
    }

    // Case 2: Unexpected Javascript Error
    return (
        <ErrorDisplay
            is404={false}
            description={(error as Error)?.message || 'An unexpected error occurred.'}
        />
    );
};
