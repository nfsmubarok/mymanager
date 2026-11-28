// --- TEMA: washi (siang) / sumi (malam) ---
// <head> tiap halaman udah set data-theme sebelum render (biar ga kedip).
(function () {
    const KEY = 'zen-theme';
    const listeners = [];
    let inkRun = 0;

    // Transisi antar halaman (@view-transition) bisa dibatalin browser kalau pindah halaman cepat.
    // Tangkap promise-nya biar ga jadi error "Page already revealed" di console.
    window.addEventListener('pagereveal', e => {
        const vt = e.viewTransition;
        if (vt) [vt.ready, vt.finished, vt.updateCallbackDone].forEach(p => p && p.catch(() => {}));
    });

    function store(name) {
        try { localStorage.setItem(KEY, name); } catch (e) { /* storage diblok: tetap jalan buat sesi ini */ }
    }

    function apply(name) {
        document.documentElement.dataset.theme = name;
        listeners.forEach(fn => { try { fn(name); } catch (e) { console.error(e); } });
    }

    window.Theme = {
        get() { return document.documentElement.dataset.theme === 'sumi' ? 'sumi' : 'washi'; },
        set(name, originEl) {
            const next = name === 'sumi' ? 'sumi' : 'washi';
            store(next);
            if (next === this.get()) return Promise.resolve();
            return Theme._transition(next, originEl);
        },
        toggle(originEl) { return this.set(this.get() === 'sumi' ? 'washi' : 'sumi', originEl); },
        onChange(fn) { listeners.push(fn); },
        // Tinta menyebar dari tombol: lingkaran clip-path lewat View Transitions API.
        // Tanpa API atau pas gerak "hemat": ganti langsung.
        _transition(next, originEl) {
            const full = window.Motion ? Motion.full : false;
            if (!full || typeof document.startViewTransition !== 'function') { apply(next); return Promise.resolve(); }

            const r = originEl && originEl.getBoundingClientRect ? originEl.getBoundingClientRect() : null;
            const x = r ? r.left + r.width / 2 : innerWidth - 40;
            const y = r ? r.top + r.height / 2 : 40;
            const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
            const toDark = next === 'sumi';
            document.documentElement.dataset.inking = toDark ? 'in' : 'out';
            const mine = ++inkRun; // cuma transisi terakhir yang boleh beresin flag tinta

            const vt = document.startViewTransition(() => apply(next));
            vt.updateCallbackDone.catch(() => {}); // transisi bisa dibatalin browser (misal pindah halaman), jangan jadi error
            vt.ready.then(() => {
                const small = `circle(0px at ${x}px ${y}px)`, big = `circle(${R}px at ${x}px ${y}px)`;
                document.documentElement.animate(
                    { clipPath: toDark ? [small, big] : [big, small] },
                    { duration: 700, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'both', pseudoElement: toDark ? '::view-transition-new(root)' : '::view-transition-old(root)' }
                );
            }).catch(() => {});
            return vt.finished.catch(() => {}).finally(() => { if (mine === inkRun) delete document.documentElement.dataset.inking; });
        },
        _apply: apply
    };
})();
