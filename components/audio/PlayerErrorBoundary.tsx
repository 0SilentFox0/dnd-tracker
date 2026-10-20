"use client";

import { Component, type ErrorInfo, Fragment, type ReactNode } from "react";

interface Props {
  /** новий трек — нова спроба */
  resetKey: string;
  children: ReactNode;
}

interface State {
  failed: boolean;
  key: string;
  attempt: number;
}

/** Збій зовнішнього плеєра (YouTube API) лишається в доку, а не валить сторінку бою. */
export class PlayerErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, key: this.props.resetKey, attempt: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey === state.key ? null : { key: props.resetKey, failed: false };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Battle player crashed", error, info.componentStack);
  }

  render() {
    const { failed, attempt } = this.state;

    if (failed) {
      return (
        <p role="alert" className="mt-2 flex items-center gap-2 text-[var(--enemy)]">
          Плеєр збоїв
          <button type="button" aria-label="Перезапустити плеєр" onClick={() => this.setState({ failed: false, attempt: attempt + 1 })} className="underline">
            Перезапустити
          </button>
        </p>
      );
    }

    return <Fragment key={attempt}>{this.props.children}</Fragment>;
  }
}
