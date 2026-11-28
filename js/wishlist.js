let wishlists = [];
let activeEditId = null;

// Format pendek buat kartu: 15000000 jadi "Rp 15 jt"
function formatRpShort(angka) {
    const n = Number(angka) || 0;
    if (n >= 1000000) return 'Rp ' + (n / 1000000).toFixed(1).replace('.0', '').replace('.', ',') + ' jt';
    return formatRp(n);
}

let wishLoaded = false;

function parsePlans(plans) {
    if (!plans) return [];
    if (typeof plans === 'string') {
        try { return JSON.parse(plans) || []; } catch (e) { return []; }
    }
    return plans;
}

// --- TARIK DATA ---
async function fetchCloudWishlists() {
    const container = document.getElementById('wishlist-container');
    showLoading(container);
    try {
        const user = await getCurrentUser();
        if (!user) return;

        const { data, error } = await supabaseClient.from('wishlists').select('*').eq('user_id', user.id);
        if (error) throw error;
        wishlists = (data || []).map(w => ({
            id: w.id,
            title: w.title,
            targetAmount: Number(w.target_amount) || 0,
            currentAmount: Number(w.current_amount) || 0,
            plans: parsePlans(w.plans)
        }));
        const first = !wishLoaded;
        wishLoaded = true;
        renderWishlists();
        if (first && window.Motion) Motion.stagger(document.querySelectorAll('#wishlist-container .wish-card'));
    } catch (err) {
        console.error('Fetch wishlists error:', err);
        showError(container, 'Wishlist ga kebaca. Cek koneksi lu, terus coba lagi.', fetchCloudWishlists);
    }
}

function renderWishlists() {
    const container = document.getElementById('wishlist-container');
    clearBusy(container);
    if (wishlists.length === 0) {
        container.innerHTML = '<div class="empty-state">Belum ada wishlist. Tulis satu barang yang lagi lu incer.</div>';
        return;
    }

    // Wish yang paling deket target (tapi belum tercapai) jadi kartu unggulan di depan
    const pct = w => w.targetAmount > 0 ? (w.currentAmount / w.targetAmount) * 100 : 0;
    const open = wishlists.filter(w => pct(w) < 100).sort((a, b) => pct(b) - pct(a));
    const featuredId = wishlists.length >= 3 && open.length ? open[0].id : null;
    const ordered = featuredId ? [open[0], ...wishlists.filter(w => w.id !== featuredId)] : wishlists;

    container.innerHTML = ordered.map(wish => {
        const percent = Math.min(100, pct(wish));
        const done = percent >= 100;
        const plansHtml = wish.plans.length
            ? '<ul class="plan-list">' + wish.plans.slice(0, 3).map(plan => `<li${plan.done ? ' class="done"' : ''}>${esc(plan.text)}</li>`).join('') + '</ul>'
            : '';
        return `
        <article class="paper wish-card${done ? ' done' : ''}${wish.id === featuredId ? ' featured' : ''}">
            <div class="wish-head">
                <h2><button type="button" class="card-link" data-action="wish-open" data-id="${esc(wish.id)}">${esc(wish.title)}</button></h2>
                <span class="wish-target num">${formatRpShort(wish.targetAmount)}</span>
            </div>
            <div class="wish-progress">
                <span class="num">${formatRpShort(wish.currentAmount)} terkumpul</span>
                <span class="${done ? 'done-tag' : 'wish-pct'} num">${done ? 'Tercapai' : Math.floor(percent) + '%'}</span>
            </div>
            <div class="ink-bar" role="progressbar" aria-label="Progres ${esc(wish.title)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.floor(percent)}"><span style="width: ${percent}%;"></span></div>
            ${plansHtml}
        </article>`;
    }).join('');
}

function wishPercent(w) { return w && w.targetAmount > 0 ? (w.currentAmount / w.targetAmount) * 100 : 0; }

function openAddModal() {
    document.getElementById('wish-title').value = '';
    document.getElementById('wish-target').value = '';
    document.getElementById('wish-current').value = '0';
    document.getElementById('wish-plans').value = '';
    openModal('addWishModal');
}

async function saveNewWish() {
    const title = document.getElementById('wish-title').value.trim();
    const targetAmount = parseInt(document.getElementById('wish-target').value);
    const currentAmount = parseInt(document.getElementById('wish-current').value) || 0;
    const plansText = document.getElementById('wish-plans').value;

    if (!title || isNaN(targetAmount)) { showToast('Nama barang dan target dana wajib diisi.', true); return; }

    const plansArray = plansText.split('\n').map(p => p.trim()).filter(Boolean).map((text, index) => ({ id: index, text, done: false }));

    const btn = document.getElementById('btn-save-wish');
    btn.disabled = true;
    const user = await getCurrentUser();
    const payload = {
        title, target_amount: targetAmount, current_amount: currentAmount,
        plans: JSON.stringify(plansArray), user_id: user ? user.id : null
    };
    const { data, error } = await supabaseClient.from('wishlists').insert([payload]).select();
    btn.disabled = false;

    if (error) { showToast('Gagal nyimpen wishlist.', true); return; }
    if (data && data.length > 0) {
        const w = data[0];
        wishlists.push({ id: w.id, title: w.title, targetAmount: Number(w.target_amount) || 0, currentAmount: Number(w.current_amount) || 0, plans: plansArray });
    }
    showToast('Wishlist ditambahin.');
    closeModal('addWishModal');
    renderWishlists();
}

function openEditModal(id) {
    const wish = wishlists.find(w => w.id == id);
    if (!wish) return;
    activeEditId = wish.id;
    document.getElementById('edit-modal-title').textContent = wish.title;
    document.getElementById('edit-wish-current').value = wish.currentAmount;
    document.getElementById('edit-wish-target-hint').textContent = 'Target total: ' + formatRp(wish.targetAmount);

    const checklist = document.getElementById('edit-wish-plans');
    checklist.innerHTML = wish.plans.length
        ? wish.plans.map(plan => `<label class="checklist-item"><input type="checkbox" id="plan-${esc(plan.id)}" ${plan.done ? 'checked' : ''}><span>${esc(plan.text)}</span></label>`).join('')
        : '<p class="form-hint">Belum ada rencana.</p>';
    openModal('editWishModal');
}

async function saveEditWish() {
    const wish = wishlists.find(w => w.id == activeEditId);
    if (!wish) return;

    const newAmount = parseInt(document.getElementById('edit-wish-current').value) || 0;
    const newPlans = wish.plans.map(plan => {
        const cb = document.getElementById('plan-' + plan.id);
        return { ...plan, done: cb ? cb.checked : plan.done };
    });

    const btn = document.getElementById('btn-update-wish');
    btn.disabled = true;
    const { error } = await supabaseClient.from('wishlists')
        .update({ current_amount: newAmount, plans: JSON.stringify(newPlans) })
        .eq('id', wish.id);
    btn.disabled = false;

    if (error) { showToast('Gagal update wishlist.', true); return; }
    const before = wishPercent(wish);
    wish.currentAmount = newAmount;
    wish.plans = newPlans;
    const reached = before < 100 && wishPercent(wish) >= 100;
    showToast(reached ? 'Tercapai! Selamat.' : 'Progres diupdate.');
    closeModal('editWishModal');
    renderWishlists();
    // Stempel 済 cuma pas wish baru aja nyampe target
    if (reached && window.Motion) {
        const link = document.querySelector(`[data-action="wish-open"][data-id="${CSS.escape(String(wish.id))}"]`);
        if (link) Motion.stampHanko(link.closest('.wish-card'));
    }
}

function triggerDeleteWish() {
    customConfirm('Yakin mau hapus wishlist ini?', async () => {
        const { error } = await supabaseClient.from('wishlists').delete().eq('id', activeEditId);
        if (error) { showToast('Gagal hapus wishlist.', true); return; }
        wishlists = wishlists.filter(w => w.id != activeEditId);
        showToast('Wishlist dihapus.');
        closeModal('editWishModal');
        renderWishlists();
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    onAction('wishlist-container', { 'wish-open': id => openEditModal(id) });
    showLoading('wishlist-container');
    if (await requireAuth()) fetchCloudWishlists();
});
