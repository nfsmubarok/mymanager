// --- SHELL: rail, header HP, tooltip, tombol tema ---
(function () {
    let tip = null;

    function showTip(el) {
        if (!tip) {
            tip = document.createElement('div');
            tip.className = 'tooltip';
            tip.setAttribute('role', 'tooltip');
            tip.id = 'zen-tooltip';
            document.body.appendChild(tip);
        }
        tip.textContent = el.dataset.tip;
        const r = el.getBoundingClientRect();
        tip.style.left = (r.right + 10) + 'px';
        tip.style.top = (r.top + r.height / 2) + 'px';
        tip.classList.add('show');
    }
    function hideTip() { if (tip) tip.classList.remove('show'); }

    function bindTips() {
        document.querySelectorAll('[data-tip]').forEach(el => {
            el.addEventListener('mouseenter', () => showTip(el));
            el.addEventListener('focus', () => showTip(el));
            el.addEventListener('mouseleave', hideTip);
            el.addEventListener('blur', hideTip);
        });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') hideTip(); });
        window.addEventListener('scroll', hideTip, { passive: true });
    }

    // Update label + ikon sebuah tombol tool (desktop dan versi HP)
    function setTool(id, { icon, label }) {
        [id, id + '-m'].forEach(bid => {
            const b = document.getElementById(bid);
            if (!b) return;
            if (icon) b.querySelector('use').setAttribute('href', 'img/icons.svg#' + icon);
            if (label) {
                b.setAttribute('aria-label', label);
                if (b.dataset.tip !== undefined) b.dataset.tip = label;
            }
        });
    }
    function onTool(id, handler) {
        [id, id + '-m'].forEach(bid => {
            const b = document.getElementById(bid);
            if (b) b.addEventListener('click', () => handler(b));
        });
    }

    function syncTheme() {
        const dark = window.Theme && Theme.get() === 'sumi';
        setTool('btn-theme', { icon: dark ? 'sun' : 'moon', label: dark ? 'Ganti ke mode siang' : 'Ganti ke mode malam' });
    }

    window.Shell = { setTool, onTool };

    document.addEventListener('DOMContentLoaded', () => {
        bindTips();
        if (window.Theme) {
            syncTheme();
            Theme.onChange(syncTheme);
            onTool('btn-theme', b => Theme.toggle(b));
        }
        if (window.Motion) {
            const syncMotion = () => {
                setTool('btn-motion', { label: Motion.full ? 'Gerak: penuh' : 'Gerak: hemat' });
                ['btn-motion', 'btn-motion-m'].forEach(id => { const b = document.getElementById(id); if (b) b.setAttribute('aria-pressed', String(Motion.full)); });
            };
            syncMotion();
            Motion.onChange(syncMotion);
            onTool('btn-motion', () => Motion.setFull(!Motion.full));
        }
        if (window.Petals) {
            const syncPetals = () => {
                setTool('btn-petals', { label: Petals.paused ? 'Putar kelopak' : 'Jeda kelopak' });
                ['btn-petals', 'btn-petals-m'].forEach(id => { const b = document.getElementById(id); if (b) b.setAttribute('aria-pressed', String(Petals.paused)); });
            };
            syncPetals();
            document.addEventListener('petals:change', syncPetals);
            onTool('btn-petals', () => Petals.setPaused(!Petals.paused));
        }
        const m = document.getElementById('btn-logout-m');
        if (m && typeof logout === 'function') m.addEventListener('click', logout);
    });
})();
