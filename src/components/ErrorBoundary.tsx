import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", fontFamily: "sans-serif", color: "#333", background: "#fefefe", minHeight: "100vh" }}>
          <h1 style={{ color: "#e53e3e", fontSize: "24px" }}>Something went wrong.</h1>
          <p style={{ marginTop: "10px", fontSize: "16px" }}>The application crashed due to a runtime error.</p>
          <div style={{ marginTop: "20px", padding: "15px", background: "#f7fafc", borderRadius: "8px", border: "1px solid #e2e8f0", overflowX: "auto" }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "18px" }}>Error Message:</h3>
            <pre style={{ color: "#e53e3e", margin: 0, fontWeight: "bold", whiteSpace: "pre-wrap" }}>
              {this.state.error?.toString()}
            </pre>
          </div>
          {this.state.errorInfo && (
            <div style={{ marginTop: "20px", padding: "15px", background: "#f7fafc", borderRadius: "8px", border: "1px solid #e2e8f0", overflowX: "auto" }}>
               <h3 style={{ margin: "0 0 10px 0", fontSize: "18px" }}>Component Stack:</h3>
               <pre style={{ color: "#718096", margin: 0, fontSize: "14px", whiteSpace: "pre-wrap" }}>
                 {this.state.errorInfo.componentStack}
               </pre>
            </div>
          )}
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: "20px", padding: "10px 20px", background: "#3182ce", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "16px" }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
