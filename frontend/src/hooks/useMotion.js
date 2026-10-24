import { useEffect, useRef, useState } from "react";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const ease = (t) => 1 - Math.pow(1 - t, 3);

// Animates an array of numbers toward `target`. Starts from `from` (zeros by default) so the
// first render grows in; later changes morph from whatever is currently shown.
export function useTween(target, { ms = 800, delay = 0 } = {}) {
  const [value, setValue] = useState(() => target.map(() => 0));
  const current = useRef(value);
  const key = target.join(",");

  useEffect(() => {
    const to = key.split(",").map(Number);
    if (prefersReducedMotion()) {
      current.current = to;
      setValue(to);
      return undefined;
    }
    const from = current.current;
    let raf;
    let start = null;
    const t0 = setTimeout(() => {
      const step = (now) => {
        if (start === null) start = now;
        const p = Math.min(1, (now - start) / ms);
        const next = to.map((v, i) => (from[i] ?? 0) + (v - (from[i] ?? 0)) * ease(p));
        current.current = next;
        setValue(next);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => { clearTimeout(t0); cancelAnimationFrame(raf); };
  }, [key, ms, delay]);

  return value;
}

// Publishes scroll position as CSS variables (--sy in px, --sp as 0..1) for parallax and the
// dial bezel, with one passive listener and no React re-renders.
export function useScrollVars() {
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const root = document.documentElement;
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = Math.max(1, root.scrollHeight - window.innerHeight);
      root.style.setProperty("--sy", String(Math.round(window.scrollY)));
      root.style.setProperty("--sp", (window.scrollY / max).toFixed(4));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
}

// Returns the id of the step section currently crossing ~45% of the viewport, or "intro".
export function useActiveStep(deps = []) {
  const [active, setActive] = useState("intro");
  useEffect(() => {
    let raf = 0;
    const calc = () => {
      raf = 0;
      const line = window.innerHeight * 0.45;
      let found = "intro";
      document.querySelectorAll("[data-step]").forEach((el) => {
        if (el.getBoundingClientRect().top <= line) found = el.dataset.step;
      });
      setActive(found);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(calc); };
    calc();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return active;
}
