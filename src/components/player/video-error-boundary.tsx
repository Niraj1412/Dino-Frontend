"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type VideoErrorBoundaryProps = {
  children: ReactNode;
  videoId: string;
  onRetry: () => void;
};

type VideoErrorBoundaryState = {
  hasError: boolean;
};

export class VideoErrorBoundary extends Component<
  VideoErrorBoundaryProps,
  VideoErrorBoundaryState
> {
  state: VideoErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Video player boundary caught error", error, errorInfo);
  }

  componentDidUpdate(prevProps: VideoErrorBoundaryProps) {
    if (prevProps.videoId !== this.props.videoId && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[rgba(4,10,16,0.92)] px-4 text-center text-slate-100"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.1em] text-rose-200">
            Playback Render Error
          </p>
          <p className="text-sm text-slate-300">
            The player hit an unexpected runtime issue.
          </p>
          <button
            type="button"
            onClick={this.props.onRetry}
            className="rounded-full border border-slate-100/25 bg-slate-100/10 px-4 py-1.5 text-sm font-semibold"
          >
            Retry Player
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
