import { useContext, useEffect, useRef, type RefObject } from "react";
import { UNSAFE_DataRouterContext, useBlocker } from "react-router-dom";
import { useModal } from "./modal/ModalProvider";

function RouterGuard({ dirty }: { dirty: RefObject<boolean> }) {
  const blocker = useBlocker(() => dirty.current);
  const { confirm } = useModal();
  const asking = useRef(false);
  useEffect(() => {
    if (blocker.state !== "blocked" || asking.current) return;
    asking.current = true;
    void confirm({
      title: "Discard changes?",
      message: "Your palette has unsaved changes.",
      confirmLabel: "Discard changes",
      cancelLabel: "Stay",
      danger: true,
    }).then((ok) => {
      asking.current = false;
      if (ok) blocker.proceed();
      else blocker.reset();
    });
  }, [blocker, confirm]);
  return null;
}

export function UnsavedChangesGuard({ dirty }: { dirty: RefObject<boolean> }) {
  const router = useContext(UNSAFE_DataRouterContext);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  return router ? <RouterGuard dirty={dirty} /> : null;
}
