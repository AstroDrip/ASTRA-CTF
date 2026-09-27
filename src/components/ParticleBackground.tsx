import React, { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

export const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { motionEnabled } = useApp();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Generate technical dust particles
    const count = 45;
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: -0.15 - Math.random() * 0.35,
      size: Math.random() * 1.8 + 0.6,
      alpha: Math.random() * 0.4 + 0.1,
      color: Math.random() > 0.8 ? '#00f0ff' : '#ccff00',
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        if (motionEnabled) {
          p.x += p.vx;
          p.y += p.vy;

          if (p.y < 0) {
            p.y = height;
            p.x = Math.random() * width;
          }
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
        }

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });

      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [motionEnabled]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Background canvas for procedural particles */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-60" />

      {/* Perspective grid floor on bottom half */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-[40vh] opacity-25"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(204, 255, 0, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(204, 255, 0, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          transform: 'perspective(500px) rotateX(60deg)',
          transformOrigin: 'bottom center',
          maskImage: 'linear-gradient(to top, black 20%, transparent 95%)',
          WebkitMaskImage: 'linear-gradient(to top, black 20%, transparent 95%)',
        }}
      />
    </div>
  );
};
