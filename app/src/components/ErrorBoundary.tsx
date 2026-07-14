import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/** 한 화면에서 오류가 나도 앱 전체가 흰 화면으로 튕기지 않도록 감싸고,
 *  오류 내용을 보여줘 원인을 파악할 수 있게 합니다. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // 콘솔에도 남겨 디버깅에 도움
    console.error("[LJ-BIO] UI 오류:", error);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div
        style={{
          maxWidth: 560,
          margin: "70px auto",
          background: "#fff",
          border: "1px solid rgba(12,15,13,0.1)",
          borderRadius: 18,
          padding: "40px 32px",
          textAlign: "center",
          fontFamily: "'Pretendard Variable', Pretendard, sans-serif",
        }}
      >
        <div style={{ fontSize: 40 }}>⚠️</div>
        <h2 style={{ fontSize: 19, fontWeight: 700, marginTop: 12 }}>
          화면을 표시하는 중 문제가 발생했습니다
        </h2>
        <p style={{ fontSize: 13.5, color: "#84908A", marginTop: 10, lineHeight: 1.6 }}>
          아래 오류 내용을 캡처해 전달해 주시면 빠르게 고쳐드릴 수 있습니다.
        </p>
        <pre
          style={{
            marginTop: 16,
            textAlign: "left",
            fontSize: 12,
            color: "#C4553E",
            background: "#FDF3F1",
            border: "1px solid rgba(196,85,62,0.25)",
            borderRadius: 10,
            padding: "12px 14px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            maxHeight: 220,
            overflow: "auto",
          }}
        >
          {error.message}
          {error.stack ? "\n\n" + error.stack.split("\n").slice(0, 4).join("\n") : ""}
        </pre>
        <button
          onClick={() => this.setState({ error: null })}
          style={{
            marginTop: 18,
            padding: "11px 22px",
            border: "none",
            borderRadius: 10,
            background: "linear-gradient(110deg,#0E7B4E,#46D08A)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          다시 시도
        </button>
      </div>
    );
  }
}
