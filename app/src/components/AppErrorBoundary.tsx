import { Component, type ErrorInfo, type ReactNode } from "react";
import { analytics } from "../analytics";

type Props = { children: ReactNode };
type State = { failed: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    analytics.captureException(error, "root");
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="app-error" role="alert">
          <h1>Peluutin kohtasi virheen</h1>
          <p>Paikalliset joukkue- ja ottelutietosi ovat edelleen tässä selaimessa.</p>
          <button type="button" onClick={() => window.location.reload()}>Lataa Peluutin uudelleen</button>
        </main>
      );
    }

    return this.props.children;
  }
}
