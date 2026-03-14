"use client";

import { cn } from "@/lib/utils";
import React from "react";
// @ts-ignore
import { ReactTyped } from "react-typed";

class n {
  phase: number = 0;
  offset: number = 0;
  frequency: number = 0;
  amplitude: number = 0;

  constructor(e: any = {}) {
    this.phase = e.phase || 0;
    this.offset = e.offset || 0;
    this.frequency = e.frequency || 0.001;
    this.amplitude = e.amplitude || 1;
  }

  update() {
    this.phase += this.frequency;
    return this.offset + Math.sin(this.phase) * this.amplitude;
  }

  value() {
    return this.offset + Math.sin(this.phase) * this.amplitude;
  }
}

class Line {
  spring: number = 0;
  friction: number = 0;
  nodes: any[] = [];

  constructor(e: any = {}) {
    this.spring = e.spring + 0.1 * Math.random() - 0.05;
    this.friction = E.friction + 0.01 * Math.random() - 0.005;
    this.nodes = [];
    for (var t, i = 0; i < E.size; i++) {
      t = new Node();
      t.x = (pos as any).x;
      t.y = (pos as any).y;
      this.nodes.push(t);
    }
  }

  update() {
    let e = this.spring,
      t = this.nodes[0];
    t.vx += ((pos as any).x - t.x) * e;
    t.vy += ((pos as any).y - t.y) * e;
    for (var n, i = 0, a = this.nodes.length; i < a; i++) {
      t = this.nodes[i];
      if (0 < i) {
        n = this.nodes[i - 1];
        t.vx += (n.x - t.x) * e;
        t.vy += (n.y - t.y) * e;
        t.vx += n.vx * E.dampening;
        t.vy += n.vy * E.dampening;
      }
      t.vx *= this.friction;
      t.vy *= this.friction;
      t.x += t.vx;
      t.y += t.vy;
      e *= E.tension;
    }
  }

  draw() {
    let e,
      t,
      n = this.nodes[0].x,
      i = this.nodes[0].y;
    (ctx as any).beginPath();
    (ctx as any).moveTo(n, i);
    for (var a = 1, o = this.nodes.length - 2; a < o; a++) {
      e = this.nodes[a];
      t = this.nodes[a + 1];
      n = 0.5 * (e.x + t.x);
      i = 0.5 * (e.y + t.y);
      (ctx as any).quadraticCurveTo(e.x, e.y, n, i);
    }
    e = this.nodes[a];
    t = this.nodes[a + 1];
    (ctx as any).quadraticCurveTo(e.x, e.y, t.x, t.y);
    (ctx as any).stroke();
    (ctx as any).closePath();
  }
}

// @ts-ignore
function onMousemove(e) {
  function o() {
    // @ts-ignore
    lines = [];
    for (let e = 0; e < E.trails; e++)
      // @ts-ignore
      lines.push(new Line({ spring: 0.45 + (e / E.trails) * 0.025 }));
  }
  // @ts-ignore
  function c(e) {
    if (e.touches) {
        // @ts-ignore
        pos.x = e.touches[0].pageX;
        // @ts-ignore
        pos.y = e.touches[0].pageY;
    } else {
        // @ts-ignore
        pos.x = e.clientX;
        // @ts-ignore
        pos.y = e.clientY;
    }
    e.preventDefault();
  }
  // @ts-ignore
  function l(e) {
    // @ts-ignore
    if (1 == e.touches.length) {
      // @ts-ignore
      pos.x = e.touches[0].pageX;
      // @ts-ignore
      pos.y = e.touches[0].pageY;
    }
  }
  document.removeEventListener("mousemove", onMousemove);
  document.removeEventListener("touchstart", onMousemove);
  document.addEventListener("mousemove", c);
  document.addEventListener("touchmove", c);
  document.addEventListener("touchstart", l);
  c(e);
  o();
  render();
}

function render() {
  // @ts-ignore
  if (ctx.running) {
    // @ts-ignore
    ctx.globalCompositeOperation = "source-over";
    // @ts-ignore
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    // @ts-ignore
    ctx.globalCompositeOperation = "lighter";
    // @ts-ignore
    ctx.strokeStyle = "hsla(" + Math.round(f.update()) + ",100%,50%,0.025)";
    // @ts-ignore
    ctx.lineWidth = 10;
    for (var e, t = 0; t < E.trails; t++) {
      // @ts-ignore
      (e = lines[t]).update();
      e.draw();
    }
    // @ts-ignore
    ctx.frame++;
    window.requestAnimationFrame(render);
  }
}

function resizeCanvas() {
  // @ts-ignore
  if (ctx && ctx.canvas) {
    // @ts-ignore
    ctx.canvas.width = window.innerWidth - 20;
    // @ts-ignore
    ctx.canvas.height = window.innerHeight;
  }
}

// @ts-ignore
var ctx: any,
  // @ts-ignore
  f: any,
  e = 0,
  pos = {},
  // @ts-ignore
  lines: any[] = [],
  E = {
    debug: true,
    friction: 0.5,
    trails: 80,
    size: 50,
    dampening: 0.025,
    tension: 0.99,
  };

class Node {
  x: number = 0;
  y: number = 0;
  vy: number = 0;
  vx: number = 0;
}

const renderCanvas = function () {
  // @ts-ignore
  const canvas = document.getElementById("canvas");
  if (!canvas) return;
  // @ts-ignore
  ctx = canvas.getContext("2d");
  // @ts-ignore
  ctx.running = true;
  // @ts-ignore
  ctx.frame = 1;
  f = new n({
    phase: Math.random() * 2 * Math.PI,
    amplitude: 85,
    frequency: 0.0015,
    offset: 285,
  });
  document.addEventListener("mousemove", onMousemove);
  document.addEventListener("touchstart", onMousemove);
  // @ts-ignore
  window.addEventListener("orientationchange", resizeCanvas);
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("focus", () => {
    // @ts-ignore
    if (!ctx.running) {
      // @ts-ignore
      ctx.running = true;
      render();
    }
  });
  window.addEventListener("blur", () => {
    // @ts-ignore
    ctx.running = true;
  });
  resizeCanvas();
};

interface TypeWriterProps {
  strings: string[];
}


const TypeWriter = ({ strings }: TypeWriterProps) => {
  return (
    <ReactTyped
      loop
      typeSpeed={80}
      backSpeed={20}
      strings={strings}
      smartBackspace
      backDelay={1000}
      loopCount={0}
      showCursor
      cursorChar="|"
    />
  );
};

type TColorProp = string | string[];

interface ShineBorderProps {
  borderRadius?: number;
  borderWidth?: number;
  duration?: number;
  color?: TColorProp;
  className?: string;
  children: React.ReactNode;
}

function ShineBorder({
  borderRadius = 8,
  borderWidth = 1,
  duration = 14,
  color = "#000000",
  className,
  children,
}: ShineBorderProps) {
  return (
    <div
      style={
        {
          "--border-radius": `${borderRadius}px`,
        } as React.CSSProperties
      }
      className={cn(
        "relative grid h-full w-full place-items-center rounded-3xl bg-white p-3 text-black dark:bg-black dark:text-white",
        className,
      )}
    >
      <div
        style={
          {
            "--border-width": `${borderWidth}px`,
            "--border-radius": `${borderRadius}px`,
            "--shine-pulse-duration": `${duration}s`,
            "--mask-linear-gradient": `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
            "--background-radial-gradient": `radial-gradient(transparent,transparent, ${color instanceof Array ? color.join(",") : color},transparent,transparent)`,
          } as React.CSSProperties
        }
        className={`before:bg-shine-size before:absolute before:inset-0 before:aspect-square before:size-full before:rounded-3xl before:p-[--border-width] before:will-change-[background-position] before:content-[""] before:![-webkit-mask-composite:xor] before:[background-image:--background-radial-gradient] before:[background-size:300%_300%] before:![mask-composite:exclude] before:[mask:--mask-linear-gradient] motion-safe:before:animate-[shine-pulse_var(--shine-pulse-duration)_infinite_linear]`}
      ></div>
      {children}
    </div>
  );
}



export { renderCanvas, TypeWriter, ShineBorder }
