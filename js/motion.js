// --- GERAK: preferensi + koreografi (GSAP opsional) ---
// Default ngikutin setting sistem (prefers-reduced-motion). Tombol di rail bisa override, dan pilihannya diinget.
(function () {
    const KEY = 'zen-motion';
    const listeners = [];
    let full;

    try {
        const saved = localStorage.getItem(KEY);
        if (saved === 'full' || saved === 'calm') full = saved === 'full';
    } catch (e) { /* storage diblok */ }
    if (full === undefined) full = !matchMedia('(prefers-reduced-motion: reduce)').matches;

    function mark() { document.documentElement.dataset.motion = full ? 'full' : 'calm'; }
    mark();

    const gs = () => (full && window.gsap) ? window.gsap : null;

    function ensureSeal(cardEl) {
        let seal = cardEl.querySelector(':scope > .hanko-seal');
        if (!seal) {
            seal = document.createElement('span');
            seal.className = 'hanko-seal';
            seal.setAttribute('aria-hidden', 'true');
            seal.setAttribute('lang', 'ja');
            seal.textContent = '済';
            if (getComputedStyle(cardEl).position === 'static') cardEl.style.position = 'relative';
            cardEl.appendChild(seal);
        }
        return seal;
    }

    function blotFor(overlay) {
        let blot = overlay.querySelector(':scope > .ink-blot');
        if (!blot) {
            blot = document.createElement('span');
            blot.className = 'ink-blot';
            blot.setAttribute('aria-hidden', 'true');
            overlay.prepend(blot);
        }
        return blot;
    }

    window.Motion = {
        get full() { return full; },
        setFull(on) {
            full = !!on;
            try { localStorage.setItem(KEY, full ? 'full' : 'calm'); } catch (e) { /* abaikan */ }
            mark();
            listeners.forEach(fn => { try { fn(full); } catch (e) { console.error(e); } });
        },
        onChange(fn) { listeners.push(fn); },

        // Angka naik dari 0 ke value
        countUp(el, value, format) {
            if (!el) return;
            const g = gs();
            if (!g) { el.textContent = format(value); return; }
            const o = { v: 0 };
            g.to(o, { v: value, duration: 1.4, ease: 'power3.out', onUpdate: () => { el.textContent = format(Math.round(o.v)); }, onComplete: () => { el.textContent = format(value); } });
        },

        // Baris/kartu muncul berurutan
        stagger(els) {
            const g = gs();
            const list = Array.from(els || []);
            if (!g || !list.length) return;
            g.fromTo(list, { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out', clearProps: 'opacity,transform' });
        },

        // Stempel 済 buat momen "beres"
        stampHanko(cardEl) {
            if (!cardEl) return;
            const seal = ensureSeal(cardEl);
            const g = gs();
            if (!g) { seal.style.opacity = '1'; seal.style.transform = 'rotate(-8deg)'; return; }
            g.timeline()
                .fromTo(seal, { opacity: 0, scale: 2.2, rotate: -25 }, { opacity: 1, scale: 1, rotate: -8, duration: 0.28, ease: 'back.out(3)' })
                .to(cardEl, { x: 3, duration: 0.05, yoyo: true, repeat: 5, clearProps: 'x' }, '<0.2');
        },

        // Modal: noda tinta melebar dari tombol pemicu, lalu kertas form muncul
        modalIn(overlay, originEl) {
            const g = gs();
            const sheet = overlay.querySelector('.modal-content, .modal-sheet');
            if (!g) return;
            const blot = blotFor(overlay);
            const r = originEl && originEl.getBoundingClientRect ? originEl.getBoundingClientRect() : null;
            const x = r ? r.left + r.width / 2 : innerWidth / 2;
            const y = r ? r.top + r.height / 2 : innerHeight / 2;
            const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
            g.set(blot, { left: x, top: y, width: R * 2, height: R * 2, xPercent: -50, yPercent: -50, scale: 0, opacity: 1 });
            g.timeline()
                .to(blot, { scale: 1, duration: 0.45, ease: 'power2.out' })
                .fromTo(sheet, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out', clearProps: 'transform' }, '-=0.15');
        },

        modalOut(overlay) {
            const g = gs();
            if (!g) return Promise.resolve();
            const sheet = overlay.querySelector('.modal-content, .modal-sheet');
            const blot = overlay.querySelector(':scope > .ink-blot');
            return new Promise(resolve => {
                // Fallback: tab di background bikin rAF berhenti, modal tetap harus nutup
                setTimeout(resolve, 400);
                const tl = g.timeline({ onComplete: resolve });
                if (sheet) tl.to(sheet, { autoAlpha: 0, y: 8, duration: 0.12 });
                if (blot) tl.to(blot, { scale: 0, duration: 0.12 }, '<0.05');
                if (sheet) tl.set(sheet, { clearProps: 'all' });
                if (!sheet && !blot) resolve();
            });
        }
    };
})();
