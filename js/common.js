// --- UTILITAS BERSAMA (dipakai semua halaman) ---

// Escape semua data dari user sebelum masuk ke innerHTML (cegah XSS)
function esc(value) {
    if (value === undefined || value === null) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Cuma izinin URL http/https buat href dan src
function safeUrl(url) {
    try {
        const u = new URL(url, window.location.href);
        return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : '';
    } catch (e) {
        return '';
    }
}

function formatRp(angka) {
    const n = Number(angka);
    if (!Number.isFinite(n)) return 'Rp 0';
    const sign = n < 0 ? '-' : '';
    return sign + 'Rp ' + Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Tanggal hari ini (zona waktu lokal) format YYYY-MM-DD buat <input type="date">.
// valueAsDate = new Date() pakai UTC, jadi sebelum jam 7 pagi WIB tanggalnya mundur sehari.
function localDateStr(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return esc(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// --- TOAST ---
let toastTimer = null;
function showToast(msg, isError = false) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'show ' + (isError ? 'error' : 'success');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = ''; }, 3200);
}

// --- STATE LIST (loading / kosong / error) ---
function renderState(el, type, message, retryFn) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return;
    el.setAttribute('aria-busy', type === 'loading' ? 'true' : 'false');
    el.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'state state-' + type;
    if (type === 'error') box.setAttribute('role', 'alert');
    const p = document.createElement('p');
    p.textContent = message;
    box.appendChild(p);
    if (type === 'error' && typeof retryFn === 'function') {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-small';
        btn.textContent = 'Coba lagi';
        btn.addEventListener('click', retryFn);
        box.appendChild(btn);
    }
    el.appendChild(box);
}
function showLoading(el, message = 'Lagi ngambil data...') { renderState(el, 'loading', message); }
function showError(el, message, retryFn) { renderState(el, 'error', message, retryFn); }
function clearBusy(el) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (el) el.setAttribute('aria-busy', 'false');
}

// --- MODAL ---
// Halaman boleh definisiin window.onModalOpen(id) / window.onModalClose(id) buat reset form.
const modalReturnFocus = {};

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (typeof window.onModalOpen === 'function') window.onModalOpen(modalId);
    modalReturnFocus[modalId] = document.activeElement;
    modal.classList.add('open');
    if (window.Motion) Motion.modalIn(modal, modalReturnFocus[modalId]);
    const target = modal.querySelector('[autofocus], input:not([type="hidden"]):not([disabled]), select, textarea, button:not(.close-btn)') || modal.querySelector('button');
    if (target) setTimeout(() => target.focus(), 0);
}

async function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal || !modal.classList.contains('open') || modal.dataset.closing) return;
    if (window.Motion) {
        modal.dataset.closing = '1';
        await Motion.modalOut(modal);
        delete modal.dataset.closing;
    }
    modal.classList.remove('open');
    if (typeof window.onModalClose === 'function') window.onModalClose(modalId);
    const back = modalReturnFocus[modalId];
    if (back && document.contains(back) && typeof back.focus === 'function') back.focus();
    delete modalReturnFocus[modalId];
}

function topOpenModal() {
    const open = Array.from(document.querySelectorAll('.modal-overlay.open'));
    if (!open.length) return null;
    return open.sort((a, b) => (parseInt(getComputedStyle(a).zIndex) || 0) - (parseInt(getComputedStyle(b).zIndex) || 0)).pop();
}

document.addEventListener('keydown', (e) => {
    const modal = topOpenModal();
    if (!modal) return;
    if (e.key === 'Escape') {
        e.preventDefault();
        closeModal(modal.id);
        return;
    }
    // Jaga focus tetap di dalam modal
    if (e.key === 'Tab') {
        const items = Array.from(modal.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])'))
            .filter(el => el.offsetParent !== null || el.type === 'radio');
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
});

// Klik area gelap di luar modal = tutup
document.addEventListener('click', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('modal-overlay')) closeModal(e.target.id);
});

// --- KONFIRMASI HAPUS (modal dibikin sekali dari sini) ---
let confirmAction = null;

function ensureConfirmModal() {
    if (document.getElementById('confirmModal')) return;
    const wrap = document.createElement('div');
    wrap.id = 'confirmModal';
    wrap.className = 'modal-overlay';
    wrap.style.zIndex = '1001';
    wrap.innerHTML = `
        <div class="modal-content modal-small" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-msg">
            <h2 id="confirm-title">Hapus ini?</h2>
            <p id="confirm-msg"></p>
            <div class="modal-actions">
                <button type="button" class="btn-cancel" data-confirm="cancel">Batal</button>
                <button type="button" class="btn-submit btn-danger" data-confirm="ok">Ya, hapus</button>
            </div>
        </div>`;
    document.body.appendChild(wrap);
    wrap.querySelector('[data-confirm="cancel"]').addEventListener('click', () => closeModal('confirmModal'));
    wrap.querySelector('[data-confirm="ok"]').addEventListener('click', executeConfirm);
}

function customConfirm(message, actionCallback) {
    ensureConfirmModal();
    document.getElementById('confirm-msg').textContent = message + ' Data yang udah dihapus ga bisa balik lagi.';
    confirmAction = actionCallback;
    openModal('confirmModal');
}

function executeConfirm() {
    const action = confirmAction;
    confirmAction = null;
    closeModal('confirmModal');
    if (action) action();
}
