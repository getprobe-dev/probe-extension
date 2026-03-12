import { Component, type ReactNode, type ErrorInfo } from "react";
import { getIconUrl } from "../utils/theme";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[PRobe] Uncaught render error:", error, info.componentStack);
  }

  private handleReload = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
          <img
            src={getIconUrl(48)}
            alt="PRobe"
            width={36}
            height={36}
            className="rounded-xl opacity-60"
          />
          <p className="text-sm font-medium text-foreground">Something went wrong</p>
          <p className="text-xs text-muted-foreground max-w-[240px]">
            An unexpected error occurred. Try reloading the panel.
          </p>
          <button
            onClick={this.handleReload}
            className="mt-1 px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer bg-[#1a2e2b] text-[#5eead4] border border-[#2f5550] shadow-[0_2px_0_0_#0c1816] active:translate-y-px active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] transition-all"
          >
            Reload Panel
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
