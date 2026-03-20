import React, { Component, ErrorInfo, ReactNode } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { Button } from "../ui/Button";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-red-600 text-2xl font-bold">!</span>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            Something went wrong
          </h2>
          <p className="text-muted-foreground mb-6 max-w-sm">
            We apologize for the inconvenience. Please try refreshing the page.
          </p>
          <Button
            onClick={() => window.location.reload()}
            variant="primary"
          >
            Refresh Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
