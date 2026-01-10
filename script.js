(() => {
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i
        .test(navigator.userAgent.toLowerCase());

    let initialized = false;

    function init() {
        if (initialized) return;
        initialized = true;

        const canvas = document.getElementById('heart');
        const ctx = canvas.getContext('2d');

        const DPR = window.devicePixelRatio || 1;
        const scale = isMobile ? 0.5 : 1;

        window.addEventListener('click', e => {
            spawnClickHearts(e.clientX, e.clientY);
        });

        window.addEventListener('touchstart', e => {
            const t = e.touches[0];
            spawnClickHearts(t.clientX, t.clientY);
        }, { passive: true });

        let width, height;

        function resize() {
            width = window.innerWidth;
            height = window.innerHeight;

            canvas.width = width * DPR;
            canvas.height = height * DPR;

            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';

            ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        }

        resize();
        window.addEventListener('resize', resize);

        const heart = rad => [
            Math.sin(rad) ** 3,
            -(15 * Math.cos(rad) - 5 * Math.cos(2 * rad) -
              2 * Math.cos(3 * rad) - Math.cos(4 * rad))
        ];

        const scalePoint = (p, sx, sy) => [p[0] * sx, p[1] * sy];

        const points = [];
        const step = isMobile ? 0.3 : 0.1;

        for (let r = 0; r < Math.PI * 2; r += step) {
            points.push(scalePoint(heart(r), 210, 13));
            points.push(scalePoint(heart(r), 150, 9));
            points.push(scalePoint(heart(r), 90, 5));
        }

        const totalPoints = points.length;
        const targets = [];

        function pulse(kx, ky) {
            const heartScale = isMobile ? 0.75 : 1;

            for (let i = 0; i < totalPoints; i++) {
                targets[i] = [
                    points[i][0] * kx * heartScale + width / 2,
                    points[i][1] * ky * heartScale + height / 2
                ];
            }
        }


        const traceLength = isMobile ? 20 : 50;
        const particles = Array.from({ length: totalPoints }, () => {
            const x = Math.random() * width;
            const y = Math.random() * height;

            return {
                vx: 0,
                vy: 0,
                speed: Math.random() + 5,
                q: Math.floor(Math.random() * totalPoints),
                dir: Math.random() > 0.5 ? 1 : -1,
                force: 0.7 + Math.random() * 0.2,
                color: `hsla(0, ${60 + Math.random() * 40}%, ${20 + Math.random() * 60}%, .35)`,
                trace: Array.from({ length: traceLength }, () => ({ x, y }))
            };
        });

        const clickHearts = [];

        function spawnClickHearts(x, y) {
            const count = isMobile ? 8 : 14;

            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 0.6 + Math.random() * 1.2;

                clickHearts.push({
                    x,
                    y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 0.8, // upward bias
                    size: 6 + Math.random() * 6,
                    life: 1,
                    decay: 1 / 300, // ~5 seconds @ 60fps
                    hue: 330 + Math.random() * 20,
                    rotation: Math.random() * Math.PI,
                    vr: (Math.random() - 0.5) * 0.01,
                    floatPhase: Math.random() * Math.PI * 2
                });
            }
        }

        const config = {
            traceK: 0.4,
            timeDelta: 0.01
        };

        let time = 0;

        function animate() {
            const n = -Math.cos(time);
            pulse((1 + n) * 0.5, (1 + n) * 0.5);

            time += ((Math.sin(time) < 0) ? 9 : (n > 0.8 ? 0.2 : 1)) * config.timeDelta;

            ctx.clearRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'lighter';

            for (const p of particles) {
                const target = targets[p.q];
                let dx = p.trace[0].x - target[0];
                let dy = p.trace[0].y - target[1];
                let dist = Math.hypot(dx, dy) || 0.001;

                if (dist < 10) {
                    if (Math.random() > 0.95) {
                        p.q = Math.floor(Math.random() * totalPoints);
                    } else {
                        if (Math.random() > 0.99) p.dir *= -1;
                        p.q = (p.q + p.dir + totalPoints) % totalPoints;
                    }
                }

                p.vx += -dx / dist * p.speed;
                p.vy += -dy / dist * p.speed;

                p.trace[0].x += p.vx;
                p.trace[0].y += p.vy;

                p.vx *= p.force;
                p.vy *= p.force;

                for (let i = p.trace.length - 1; i > 0; i--) {
                    p.trace[i].x -= config.traceK * (p.trace[i].x - p.trace[i - 1].x);
                    p.trace[i].y -= config.traceK * (p.trace[i].y - p.trace[i - 1].y);
                }

                ctx.fillStyle = p.color;
                for (const t of p.trace) {
                    ctx.fillRect(t.x, t.y, 1, 1);
                }
            }

            requestAnimationFrame(animate);

            for (let i = clickHearts.length - 1; i >= 0; i--) {
                const h = clickHearts[i];

                // Gentle floating physics
                h.floatPhase += 0.02;
                h.vx *= 0.995;
                h.vy *= 0.995;

                h.x += h.vx + Math.sin(h.floatPhase) * 0.15;
                h.y += h.vy - 0.15; // slow upward float
                h.rotation += h.vr;
                h.life -= h.decay;

                ctx.save();
                ctx.translate(h.x, h.y);
                ctx.rotate(h.rotation);
                ctx.globalAlpha = Math.max(h.life, 0);
                ctx.fillStyle = `hsla(${h.hue}, 85%, 65%, ${h.life})`;

                ctx.beginPath();
                ctx.moveTo(0, -h.size / 2);
                ctx.bezierCurveTo(
                    -h.size, -h.size,
                    -h.size * 1.5, h.size / 2,
                    0, h.size
                );
                ctx.bezierCurveTo(
                    h.size * 1.5, h.size / 2,
                    h.size, -h.size,
                    0, -h.size / 2
                );
                ctx.fill();
                ctx.restore();

                if (h.life <= 0) clickHearts.splice(i, 1);
            }
        }

        animate();
    }

    if (document.readyState !== 'loading') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
})();
