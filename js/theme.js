// --- TEMA: washi (siang) / sumi (malam) ---
// <head> tiap halaman udah set data-theme sebelum render (biar ga kedip).
(function () {
    const KEY = 'zen-theme';
    const listeners = [];

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
        // Diganti di Task 7 dengan efek tinta menyebar
        _transition(next) { apply(next); return Promise.resolve(); },
        _apply: apply
    };
})();
