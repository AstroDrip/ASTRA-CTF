import React, { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

export const EchoCoreVisual: React.FC<{ size?: number; interactive?: boolean }> = ({ 
  size = 440,
  interactive = true 
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { motionEnabled, team } = useApp();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angle = 0;
    let pulse = 0;

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;

      if (motionEnabled) {
        angle += 0.008;
        pulse += 0.03;
      }

      const pulseScale = 1 + Math.sin(pulse) * 0.04;
      const threatLevel = team ? team.threatLevel : 1;
      const accentColor = threatLevel >= 4 ? '#ff3344' : threatLevel >= 3 ? '#00f0ff' : '#ccff00';

      // 1. Radial Background Volumetric Glow
      const radGlow = ctx.createRadialGradient(cx, cy, 10, cx, cy, size * 0.45);
      radGlow.addColorStop(0, threatLevel >= 4 ? 'rgba(255, 51, 68, 0.22)' : 'rgba(204, 255, 0, 0.15)');
      radGlow.addColorStop(0.5, 'rgba(0, 240, 255, 0.04)');
      radGlow.addColorStop(1, 'rgba(7, 9, 11, 0)');
      ctx.fillStyle = radGlow;
      ctx.fillRect(0, 0, size, size);

      // 2. Orbital Rings (Multiple with technical notches)
      const ringRadii = [size * 0.42, size * 0.35, size * 0.28, size * 0.21];
      ringRadii.forEach((r, idx) => {
        ctx.save();
        ctx.translate(cx, cy);
        const rot = idx % 2 === 0 ? angle * (1 + idx * 0.2) : -angle * (1 + idx * 0.2);
        ctx.rotate(rot);

        ctx.strokeStyle = idx === 0 ? 'rgba(255, 255, 255, 0.1)' : `${accentColor}33`;
        ctx.lineWidth = 1;
        ctx.setLineDash(idx === 1 ? [8, 12] : idx === 2 ? [3, 6] : [24, 8, 4, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();

        // Orbital tick markers
        const ticks = 8 + idx * 4;
        for (let i = 0; i < ticks; i++) {
          const a = (i / ticks) * Math.PI * 2;
          const x1 = Math.cos(a) * (r - 3);
          const y1 = Math.sin(a) * (r - 3);
          const x2 = Math.cos(a) * (r + 3);
          const y2 = Math.sin(a) * (r + 3);
          ctx.strokeStyle = idx === 0 ? 'rgba(255, 255, 255, 0.2)' : `${accentColor}66`;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        ctx.restore();
      });

      // 3. Rotating 3D Wireframe Cube
      const cubeSize = size * 0.14 * pulseScale;
      const vertices = [
        [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
        [-1, -1, 1],  [1, -1, 1],  [1, 1, 1],  [-1, 1, 1],
      ];

      const cosY = Math.cos(angle * 1.5);
      const sinY = Math.sin(angle * 1.5);
      const cosX = Math.cos(angle * 0.8);
      const sinX = Math.sin(angle * 0.8);

      const projected = vertices.map(([vx, vy, vz]) => {
        // Rotate Y
        let x = vx * cosY - vz * sinY;
        let z = vx * sinY + vz * cosY;
        // Rotate X
        let y = vy * cosX - z * sinX;
        z = vy * sinX + z * cosX;

        // Perspective
        const fov = 3.5;
        const scale = fov / (fov + z);
        return [cx + x * cubeSize * scale, cy + y * cubeSize * scale];
      });

      const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7],
      ];

      ctx.save();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([]);
      edges.forEach(([p1, p2]) => {
        ctx.beginPath();
        ctx.moveTo(projected[p1][0], projected[p1][1]);
        ctx.lineTo(projected[p2][0], projected[p2][1]);
        ctx.stroke();
      });
      ctx.restore();

      // 4. Central Glowing Triangle (The ASTRA / ECHO Core Signature)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-angle * 0.5);

      const triR = size * 0.08 * pulseScale;
      ctx.beginPath();
      ctx.moveTo(0, -triR * 1.2);
      ctx.lineTo(triR * 1.05, triR * 0.8);
      ctx.lineTo(-triR * 1.05, triR * 0.8);
      ctx.closePath();

      ctx.fillStyle = `${accentColor}18`;
      ctx.fill();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 15;
      ctx.stroke();

      // Inner pulsating core point
      ctx.beginPath();
      ctx.arc(0, 0, 4 * pulseScale, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();

      // 5. Technical Crosshairs & Radial Telemetry Guides
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      // Horizontal crosshair
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.45, cy);
      ctx.lineTo(cx + size * 0.45, cy);
      ctx.stroke();
      // Vertical crosshair
      ctx.beginPath();
      ctx.moveTo(cx, cy - size * 0.45);
      ctx.lineTo(cx, cy + size * 0.45);
      ctx.stroke();
      ctx.restore();

      // 6. Technical Scan Sweep
      if (motionEnabled) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle * 2.2);
        const sweepGrad = ctx.createLinearGradient(0, 0, size * 0.42, 0);
        sweepGrad.addColorStop(0, 'rgba(204, 255, 0, 0.15)');
        sweepGrad.addColorStop(1, 'rgba(204, 255, 0, 0)');
        ctx.fillStyle = sweepGrad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, size * 0.42, 0, Math.PI * 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [size, motionEnabled, team]);

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="block"
      />

      {/* Holographic HUD Overlay Labels */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 font-mono text-[10px] text-[#6b7280]">
        <div className="flex justify-between">
          <div className="flex items-center space-x-1.5 text-[#ccff00]">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-[#ccff00]" />
            <span>CORE_SYNC // 100%</span>
          </div>
          <div className="text-right">
            <span>STATE: {team ? team.echoState : 'OBSERVING'}</span>
          </div>
        </div>

        <div className="flex justify-between text-[9px] text-[#4b5563]">
          <div>ENTROPY: 0x4F92A</div>
          <div>BEACON: 1420.405 MHz</div>
        </div>
      </div>
    </div>
  );
};
