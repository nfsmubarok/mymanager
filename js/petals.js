// --- KELOPAK SAKURA INTERAKTIF ---
// Kursor/jari = angin, klik di area kosong = hembusan + kelopak rontok, scroll = kelopak kebawa.
// Canvas selalu di belakang konten (pointer-events: none) dan mati kalau gerak "hemat" atau dijeda.
(function () {
    const KEY = 'zen-petals';
    const BASE = 22, MAX = 60;
    const INTERACTIVE = 'a, button, input, select, textarea, label, summary, [role="dialog"], [role="alertdialog"], .modal-overlay, .rail, .tabbar, .mobile-bar';
    let paused = false;
    try { paused = localStorage.getItem(KEY) === 'paused'; } catch (e) { /* storage diblok */ }

    let cv, ctx, W = 0, H = 0, DPR = 1, sprites = [], petals = [], raf = 0, t = 0, scrollWind = 0, lastScroll = 0;
    const mouse = { x: -999, y: -999, vx: 0, vy: 0, t: 0 };

    const active = () => !!cv && !paused && !!(window.Motion ? Motion.full : true);

    function makeSprite(tint) {
        const s = document.createElement('canvas'), w = 44, h = 52;
        s.width = w * DPR; s.height = h * DPR;
        const g = s.getContext('2d');
        g.scale(DPR, DPR); g.translate(w / 2, h - 4);
        const grad = g.createLinearGradient(0, 0, 0, -44);
        grad.addColorStop(0, tint.base); grad.addColorStop(0.55, tint.mid); grad.addColorStop(1, tint.tip);
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(0, 0);
        g.bezierCurveTo(-16, -8, -20, -30, -9, -44);
        g.quadraticCurveTo(-4, -41, 0, -35); // belahan di ujung kelopak
        g.quadraticCurveTo(4, -41, 9, -44);
        g.bezierCurveTo(20, -30, 16, -8, 0, 0);
        g.fill();
        g.strokeStyle = tint.vein; g.lineWidth = 0.8;
        g.beginPath(); g.moveTo(0, -2); g.quadraticCurveTo(-1, -18, 0, -32); g.stroke();
        return { img: s, w, h };
    }

    function spawn(x, y, burst) {
        return {
            x: x ?? Math.random() * W, y: y ?? -20 - Math.random() * H,
            vx: burst ? (Math.random() - 0.5) * 4 : 0, vy: burst ? -1 - Math.random() * 2 : 0.4 + Math.random() * 0.5,
            size: 0.5 + Math.random() * 0.45, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.04,
            flip: Math.random() * 6.28, vflip: 0.02 + Math.random() * 0.04, sway: Math.random() * 6.28,
            sprite: sprites[(Math.random() * sprites.length) | 0], life: burst ? 1 : -1
        };
    }

    function resize() {
        W = innerWidth; H = innerHeight;
        cv.width = W * DPR; cv.height = H * DPR;
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function frame() {
        raf = 0;
        if (!active() || document.hidden) return;
        ctx.clearRect(0, 0, W, H);
        t += 1;
        const breeze = Math.sin(t * 0.004) * 0.35 + 0.15;
        scrollWind *= 0.92;

        for (let i = petals.length - 1; i >= 0; i--) {
            const p = petals[i];
            const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
            if (d2 < 120 * 120) {
                const f = 1 - Math.sqrt(d2) / 120;
                p.vx += mouse.vx * 0.06 * f + dx * 0.002 * f;
                p.vy += mouse.vy * 0.06 * f + dy * 0.002 * f;
                p.vr += mouse.vx * 0.002 * f;
            }
            p.sway += 0.02;
            p.vx += (breeze + Math.sin(p.sway) * 0.25 - p.vx) * 0.02 + scrollWind * 0.02;
            p.vy += ((0.45 + p.size * 0.6) - p.vy) * 0.02 + scrollWind * 0.01;
            p.vr *= 0.985;
            p.x += p.vx; p.y += p.vy; p.rot += p.vr + 0.003; p.flip += p.vflip;
            if (p.life > 0) p.life -= 0.002;

            const gone = p.y > H + 30 || p.x < -60 || p.x > W + 60 || (p.life !== -1 && p.life <= 0);
            if (gone) {
                if (petals.length > BASE) { petals.splice(i, 1); continue; }
                Object.assign(p, spawn(Math.random() * W, -30));
            }
            const sx = Math.cos(p.flip), sp = p.sprite;
            ctx.save();
            ctx.translate(p.x, p.y); ctx.rotate(p.rot);
            ctx.scale(p.size * (0.25 + 0.75 * Math.abs(sx)), p.size);
            ctx.globalAlpha = (p.life > 0 ? Math.min(1, p.life * 3) : 1) * (0.8 + 0.2 * Math.abs(sx));
            ctx.drawImage(sp.img, -sp.w / 2, -sp.h + 4, sp.w, sp.h);
            ctx.restore();
        }
        raf = requestAnimationFrame(frame);
    }

    function sync() {
        if (!cv) return;
        const on = active();
        cv.style.display = on ? 'block' : 'none';
        if (on && !raf && !document.hidden) raf = requestAnimationFrame(frame);
        if (!on && raf) { cancelAnimationFrame(raf); raf = 0; }
    }

    function init() {
        cv = document.querySelector('canvas.petals');
        if (!cv) return;
        ctx = cv.getContext('2d');
        DPR = Math.min(2, window.devicePixelRatio || 1);
        sprites = [
            { base: '#FFF6F7', mid: '#F8C9D2', tip: '#EE9DB0', vein: 'rgba(214,120,145,.35)' },
            { base: '#FFFFFF', mid: '#FAD7DE', tip: '#F2AFC0', vein: 'rgba(214,120,145,.3)' },
            { base: '#FDEFF2', mid: '#F4BACA', tip: '#E68AA3', vein: 'rgba(200,100,130,.35)' }
        ].map(makeSprite);
        resize();
        for (let i = 0; i < BASE; i++) petals.push(spawn(Math.random() * W, Math.random() * H));
        lastScroll = scrollY;

        addEventListener('resize', resize);
        addEventListener('pointermove', e => {
            const now = performance.now(), dt = Math.max(16, now - mouse.t);
            mouse.vx = (e.clientX - mouse.x) / dt * 16; mouse.vy = (e.clientY - mouse.y) / dt * 16;
            if (Math.abs(mouse.vx) > 60) mouse.vx = 0;
            if (Math.abs(mouse.vy) > 60) mouse.vy = 0;
            mouse.x = e.clientX; mouse.y = e.clientY; mouse.t = now;
        }, { passive: true });
        document.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
        addEventListener('pointerdown', e => {
            if (!active() || (e.target.closest && e.target.closest(INTERACTIVE))) return;
            const x = e.clientX, y = e.clientY;
            petals.forEach(p => {
                const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1;
                if (d < 260) { const f = (1 - d / 260) * 7; p.vx += dx / d * f; p.vy += dy / d * f - 1; p.vr += (Math.random() - 0.5) * 0.2; }
            });
            for (let i = 0; i < 7 && petals.length < MAX; i++) petals.push(spawn(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30, true));
        }, { passive: true });
        addEventListener('scroll', () => { scrollWind += (scrollY - lastScroll) * 0.05; lastScroll = scrollY; }, { passive: true });
        document.addEventListener('visibilitychange', sync);
        if (window.Motion) Motion.onChange(sync);
        sync();
    }

    window.Petals = {
        get paused() { return paused; },
        setPaused(on) {
            paused = !!on;
            try { localStorage.setItem(KEY, paused ? 'paused' : 'playing'); } catch (e) { /* abaikan */ }
            sync();
            document.dispatchEvent(new CustomEvent('petals:change'));
        }
    };

    document.addEventListener('DOMContentLoaded', init);
})();
