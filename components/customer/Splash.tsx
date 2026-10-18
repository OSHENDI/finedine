"use client";

import { useEffect, useRef, useState } from "react";

// The brand animation is the first thing on screen. It is plain HTML in the server response, so
// the browser starts the video before any script has loaded, and it keeps playing while the menu,
// fonts and photos load underneath. It leaves only when all three are done: the video ended, the
// fonts are ready, and the first photo is in (the rest of the page keeps loading underneath).
// It plays once per browser tab; moving around the app never replays it.
const markup = `<video autoplay muted playsinline preload="auto" poster="/intro-poster.jpg" src="/intro.mp4" aria-hidden="true"></video>`;

export default function Splash() {
  const root = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    if (document.documentElement.dataset.intro === "seen") return setGone(true);
    const video = element.querySelector("video");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const loaded = new Promise<void>((resolve) => {
      const photo = document.querySelector<HTMLImageElement>("img.fd-photo[fetchpriority='high']") ?? document.querySelector<HTMLImageElement>("img.fd-photo");
      if (!photo || photo.complete) return resolve();
      photo.addEventListener("load", () => resolve(), { once: true });
      photo.addEventListener("error", () => resolve(), { once: true });
      window.setTimeout(resolve, 3000);
    });
    const fonts = document.fonts?.ready.then(() => undefined) ?? Promise.resolve();
    const played = new Promise<void>((resolve) => {
      if (!video || reduceMotion) {
        video?.pause();
        return void window.setTimeout(resolve, 900);
      }
      // The video starts before hydration and can already be over by now.
      if (video.ended || video.error) return resolve();
      video.addEventListener("ended", () => resolve(), { once: true });
      video.addEventListener("error", () => resolve(), { once: true });
      void video.play().catch(() => window.setTimeout(resolve, 1500));
      // Never trap a visitor behind the animation.
      window.setTimeout(resolve, 7000);
    });

    let cancelled = false;
    void Promise.all([loaded, fonts, played]).then(() => {
      if (cancelled) return;
      // "leaving": the app rises while the intro fades; only afterwards is the intro removed.
      document.documentElement.dataset.intro = "leaving";
      element.classList.add("is-out");
      try {
        window.sessionStorage.setItem("fd_intro", "1");
      } catch {
        // storage blocked: the animation simply plays again on the next load
      }
      window.setTimeout(() => {
        document.documentElement.dataset.intro = "seen";
        setGone(true);
      }, 700);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (gone) return null;
  return <div className="fd-splash" dangerouslySetInnerHTML={{ __html: markup }} ref={root} />;
}
