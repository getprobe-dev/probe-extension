import { useEffect, useRef } from "react";
import { subscribeMutation } from "../utils/domObserver";
import { getIconUrl } from "../utils/iconUtils";

export interface InjectedButtonStyles {
  width: string;
  height: string;
  borderRadius: string;
  borderBottom: string;
  hoverBorderBottom: string;
  marginLeft?: string;
}

interface UseInjectButtonOptions {
  /** CSS selector for containers to scan */
  containerSelector: string;
  /** CSS class added to each injected button (used for dedup + cleanup) */
  buttonClass: string;
  /** Extra styles on the button element */
  styles: InjectedButtonStyles;
  /** Given a container element, return the file path or null if none */
  extractFilePath: (container: Element) => string | null;
  /** Return the element inside the container that the button should be inserted before/after */
  getInsertionTarget?: (container: Element) => Element | null;
  /** Whether to insert before or append */
  insertMode: "prepend" | "append";
  /** Called when the button is clicked */
  onClick: (container: Element, filePath: string) => void;
  /** Set a descriptive title for the button */
  buildTitle?: (filePath: string) => string;
}

const BASE_BUTTON_STYLES = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  cursor: "pointer",
  padding: "0",
  transition: "all 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
  boxSizing: "border-box",
} as const;

function createProbeButton(
  options: UseInjectButtonOptions,
  container: Element,
  filePath: string,
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = options.buttonClass;
  btn.type = "button";
  if (options.buildTitle) btn.title = options.buildTitle(filePath);

  const img = document.createElement("img");
  img.src = getIconUrl(48);
  img.width = 20;
  img.height = 20;
  img.style.borderRadius = "4px";
  img.style.display = "block";
  btn.appendChild(img);

  const { styles } = options;
  Object.assign(btn.style, {
    ...BASE_BUTTON_STYLES,
    width: styles.width,
    height: styles.height,
    borderRadius: styles.borderRadius,
    borderTop: "1px solid rgba(255,255,255,0.1)",
    borderLeft: "1px solid rgba(0,0,0,0.05)",
    borderRight: "1px solid rgba(0,0,0,0.05)",
    borderBottom: styles.borderBottom,
    ...(styles.marginLeft ? { marginLeft: styles.marginLeft } : {}),
  });

  btn.addEventListener("mouseenter", () => {
    btn.style.borderBottom = styles.hoverBorderBottom;
    if (options.insertMode === "append") btn.style.transform = "scale(1.06)";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.borderBottom = styles.borderBottom;
    btn.style.transform = "";
    btn.style.boxShadow = "none";
  });
  btn.addEventListener("mousedown", () => {
    btn.style.transform = "translateY(2px)";
    btn.style.borderBottom = "1px solid rgba(0,0,0,0.1)";
    btn.style.boxShadow = "inset 0 1px 3px rgba(0,0,0,0.15)";
  });
  btn.addEventListener("mouseup", () => {
    btn.style.transform = "";
    btn.style.borderBottom = styles.hoverBorderBottom;
    btn.style.boxShadow = "none";
  });
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    options.onClick(container, filePath);
  });

  return btn;
}

/**
 * Injects a PRobe button into host-page DOM elements that match a given
 * selector, handles MutationObserver-based re-injection, and cleans up on unmount.
 */
export function useInjectButton(options: UseInjectButtonOptions): void {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    function injectIntoContainer(container: Element) {
      const opts = optionsRef.current;
      if (container.querySelector(`.${opts.buttonClass}`)) return;

      const filePath = opts.extractFilePath(container);
      if (!filePath) return;

      const btn = createProbeButton(opts, container, filePath);

      if (opts.insertMode === "prepend") {
        const target = opts.getInsertionTarget?.(container);
        if (!target) return;
        target.insertBefore(btn, target.firstChild);
      } else {
        container.appendChild(btn);
      }
    }

    function inject() {
      document
        .querySelectorAll(optionsRef.current.containerSelector)
        .forEach(injectIntoContainer);
    }

    inject();
    const unsubscribe = subscribeMutation(inject);

    return () => {
      unsubscribe();
      document
        .querySelectorAll(`.${optionsRef.current.buttonClass}`)
        .forEach((b) => b.remove());
    };
  }, []);
}
