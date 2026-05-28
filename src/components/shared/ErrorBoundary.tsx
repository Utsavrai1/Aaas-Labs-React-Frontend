import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: "" });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-zinc-950 gap-4 p-8 text-center">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
            Something went wrong
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
            {this.state.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={this.handleReset}
            className="mt-2 px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Go to home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
