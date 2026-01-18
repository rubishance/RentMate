import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-4 text-center dark:bg-gray-900">
                    <div className="mb-4 rounded-full bg-red-100 p-3 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                        <AlertTriangle className="h-8 w-8" />
                    </div>
                    <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Something went wrong</h2>
                    <p className="mb-6 max-w-md text-gray-600 dark:text-gray-400">
                        An unexpected error occurred. Please try reloading the page.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white transition-colors hover:bg-brand-700"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Reload Page
                    </button>

                    {import.meta.env.DEV && this.state.error && (
                        <pre className="mt-8 max-h-64 max-w-2xl overflow-auto rounded bg-gray-200 p-4 text-left text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                            {this.state.error.toString()}
                        </pre>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
