import React, { useEffect, useRef, type FC } from "react";
import "./HeroCanvas.css";

const TOTAL_FRAMES = 240;
const FRAME_DIR = "/actual/";
const FRAME_PREFIX = "ezgif-frame-";

const HeroCanvas: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const scrollProgressRef = useRef(0);
  const smoothProgressRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Preload frames
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = `${FRAME_DIR}${FRAME_PREFIX}${String(i + 1).padStart(3, "0")}.jpg`;
      framesRef.current.push(img);
    }

    const draw = (index: number) => {
      const img = framesRef.current[index];
      if (!img?.complete) return;

      const cw = canvas.width;
      const ch = canvas.height;

      const scale = Math.max(cw / img.width, ch / img.height);
      const x = (cw - img.width * scale) / 2;
      const y = (ch - img.height * scale) / 2;

      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    };

    const onScroll = () => {
      const scrollTop = window.scrollY;
      const offsetTop = section.offsetTop;
      const height = section.offsetHeight;

      const progress =
        (scrollTop - offsetTop) / (height - window.innerHeight);

      scrollProgressRef.current = Math.max(0, Math.min(1, progress));
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    const animate = () => {
      smoothProgressRef.current +=
        (scrollProgressRef.current - smoothProgressRef.current) * 0.08;

      const frameIndex = Math.floor(
        smoothProgressRef.current * (TOTAL_FRAMES - 1)
      );

      draw(frameIndex);

      rafRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <section id="hero-scroll" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div className="hero-driver">
        <div className="hero-sticky">
          <canvas id="hero-canvas" ref={canvasRef} />

          {/* TEXT OVERLAY */}
          <div className="hero-overlay">

          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroCanvas;