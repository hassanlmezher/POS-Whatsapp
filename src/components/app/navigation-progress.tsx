"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const START_EVENT = "inchouf:progress-start";
const DONE_EVENT = "inchouf:progress-done";

export function startAppProgress() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(START_EVENT));
  }
}

export function finishAppProgress() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DONE_EVENT));
  }
}

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function isSamePageUrl(url: URL) {
  return url.pathname === window.location.pathname && url.search === window.location.search && url.hash;
}

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const [active, setActive] = useState(false);
  const activeRef = useRef(false);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    function start() {
      setActive(true);
    }

    function done() {
      window.setTimeout(() => {
        setActive(false);
      }, 180);
    }

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || isModifiedClick(event)) {
        return;
      }

      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement) || target.target || target.hasAttribute("download")) {
        return;
      }

      const url = new URL(target.href, window.location.href);
      if (url.origin !== window.location.origin || isSamePageUrl(url)) {
        return;
      }

      start();
    }

    function handleSubmit(event: SubmitEvent) {
      window.setTimeout(() => {
        if (!event.defaultPrevented) {
          start();
        }
      }, 0);
    }

    window.addEventListener(START_EVENT, start);
    window.addEventListener(DONE_EVENT, done);
    document.addEventListener("click", handleClick);
    document.addEventListener("submit", handleSubmit);

    return () => {
      window.removeEventListener(START_EVENT, start);
      window.removeEventListener(DONE_EVENT, done);
      document.removeEventListener("click", handleClick);
      document.removeEventListener("submit", handleSubmit);
    };
  }, []);

  useEffect(() => {
    if (activeRef.current) {
      finishAppProgress();
    }
  }, [pathname, search]);

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      finishAppProgress();
    }, 30000);

    return () => window.clearTimeout(timeoutId);
  }, [active]);

  if (!active) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[90] h-1 overflow-hidden bg-[#f4ecff]" role="progressbar" aria-label="Loading">
      <div className="h-full w-1/3 animate-[progress-slide_1.15s_ease-in-out_infinite] rounded-full bg-[#7c3aed] shadow-[0_0_18px_rgba(124,58,237,0.75)]" />
    </div>
  );
}
