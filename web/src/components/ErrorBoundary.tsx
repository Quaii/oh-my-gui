import { Component, type ReactNode } from "react";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div role="alert" className="m-6 rounded-xl border bg-sidebar p-6">
        <h2 className="text-lg font-semibold">This page couldn’t load</h2>
        <p className="my-3 text-sm text-muted-foreground">
          Your saved chats and files are unchanged. Retry this view or reload
          the interface.
        </p>
        <button
          className="mr-4 underline"
          onClick={() => this.setState({ failed: false })}
        >
          Retry
        </button>
        <button className="underline" onClick={() => location.reload()}>
          Reload interface
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
