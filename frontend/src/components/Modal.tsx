import { useEffect, useRef, type ReactNode } from "react";

export function Modal({
  title,
  onClose,
  children,
  drawer = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  drawer?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const dialog = ref.current!;
    dialog.showModal();
    (dialog.querySelector("[data-autofocus]") as HTMLElement | null)?.focus();
    return () => {
      dialog.close();
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={drawer ? "value-drawer" : ""}
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        close.current();
      }}
    >
      <div className="dialog-head">
        <h2 id="dialog-title">{title}</h2>
        <button
          aria-label={
            drawer ? "Close value details" : "Close connection dialog"
          }
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      {children}
    </dialog>
  );
}
