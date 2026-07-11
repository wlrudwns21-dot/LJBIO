import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  type ReactNode,
  type CSSProperties,
} from "react";

/* ------------------------------------------------------------------ Toast */
const ToastContext = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const flash = useCallback((m: string) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(""), 2200);
  }, []);
  return (
    <ToastContext.Provider value={flash}>
      {children}
      {msg && (
        <div
          className="modalbox"
          style={{
            position: "fixed",
            bottom: 28,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 500,
            padding: "13px 22px",
            background: "#0C0F0D",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 12,
            boxShadow: "0 20px 45px -18px rgba(0,0,0,.5)",
            maxWidth: "90vw",
          }}
        >
          {msg}
        </div>
      )}
    </ToastContext.Provider>
  );
}

/** Returns a `flash(message)` function — the portal's toast, mirroring the
 *  prototype's `this.flash(...)`. */
export function useToast() {
  return useContext(ToastContext);
}

/* ------------------------------------------------------------------ Modal */
export function Modal({
  open,
  onClose,
  children,
  width = 560,
  padded = true,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  padded?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="modalwrap"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(6,10,8,0.5)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        overflowY: "auto",
      }}
    >
      <div
        className="modalbox"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: width,
          maxHeight: "92vh",
          overflowY: "auto",
          background: "#fff",
          borderRadius: 20,
          padding: padded ? 28 : 0,
          boxShadow: "0 40px 80px -30px rgba(0,0,0,.5)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Field kit */
export const fieldStyle: CSSProperties = {
  marginTop: 6,
  width: "100%",
  padding: "11px 13px",
  border: "1.5px solid rgba(12,15,13,0.12)",
  borderRadius: 10,
  fontSize: 14,
};

export const labelStyle: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 600,
  color: "#4A4C55",
};

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

/** Primary gradient button. */
export function PBtn({
  children,
  onClick,
  style,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  style?: CSSProperties;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      className="pbtn"
      onClick={onClick}
      style={{
        padding: "12px 18px",
        border: "none",
        borderRadius: 10,
        background: "linear-gradient(110deg,#0E7B4E,#46D08A)",
        color: "#fff",
        fontSize: 14.5,
        fontWeight: 600,
        cursor: "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/** Card container used across sections. */
export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(12,15,13,0.07)",
        borderRadius: 18,
        padding: 24,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Section heading with a "+ 등록" style action button on the right. */
export function SectionBar({
  filters,
  action,
}: {
  filters?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 18,
      }}
    >
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{filters}</div>
      <div style={{ flex: 1 }} />
      {action}
    </div>
  );
}
