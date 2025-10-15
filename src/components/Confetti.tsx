import React, { useEffect, useRef } from 'react';

const Confetti: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const pieces: { x: number; y: number; size: number; speedX: number; speedY: number; color: string; rotation: number, rotationSpeed: number; opacity: number; shape: 'rect' | 'circle' }[] = [];
    const numberOfPieces = 200;
    const colors = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#34d399', '#facc15', '#ec4899'];

    const launchX = width / 2;
    const launchY = 0;

    for (let i = 0; i < numberOfPieces; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 4;
      pieces.push({
        x: launchX,
        y: launchY,
        size: Math.random() * 8 + 5,
        speedX: Math.cos(angle) * speed * (Math.random() * 0.5 + 0.5),
        speedY: Math.sin(angle) * speed + (Math.random() * 4 + 2),
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 20 - 10,
        opacity: 1,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
      });
    }
    
    let animationFrameId: number;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      pieces.forEach((p, index) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.speedY += 0.1; 
        p.speedX *= 0.99;
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.005;

        if (p.opacity <= 0 || p.y > height) {
          pieces.splice(index, 1);
          return;
        }

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.translate(p.x + p.size / 2, p.y + p.size / 2);
        ctx.rotate(p.rotation * Math.PI / 180);
        
        if (p.shape === 'rect') {
             ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
      });

      if (pieces.length > 0) {
        animationFrameId = requestAnimationFrame(draw);
      }
    };

    draw();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      if (canvas) {
        canvas.width = width;
        canvas.height = height;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
      aria-hidden="true"
    />
  );
};

export default Confetti;
