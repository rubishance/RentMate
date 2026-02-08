import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { ErrorDisplay } from './ErrorDisplay';

export const RouteErrorBoundary = () => {
    const error = useRouteError();
    console.error('Route error has occurred:', error);

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
