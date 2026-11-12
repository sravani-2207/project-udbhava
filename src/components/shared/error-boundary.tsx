import { Component, type ReactNode } from "react";
import { ErrorState } from "./state-views";

type Props = { children: ReactNode };
type State = { hasError: boolean };

/** Keeps a failed screen from blanking the whole preview; Retry reloads. */
export class PageErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[Udbhava] Screen error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          title="This screen hit a snag"
          description="The data behind this page couldn't be rendered. Reload to try again; your work is saved on the server."
        />
      );
    }
    return this.props.children;
  }
}
