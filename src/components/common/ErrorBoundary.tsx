import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorDisplay } from './ErrorDisplay';
import { RefreshCw, MessageSquare } from 'lucide-react';
import * as Sentry from "@sentry/react";

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
    eventId?: string;
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
        const eventId = Sentry.captureException(error, {
            extra: {
                componentStack: errorInfo.componentStack
            }
        });
        this.setState({ eventId });
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return <ErrorDisplay
                description="An unexpected error occurred. Please try reloading the page."
                onRetry={() => window.location.reload()}
            />;
        }

        return this.props.children;
    }
}
