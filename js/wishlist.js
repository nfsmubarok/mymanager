let wishlists = [];
let activeEditId = null;

// Format pendek buat kartu: 15000000 jadi "Rp 15 jt"
function formatRpShort(angka) {
    const n = Number(angka) || 0;
    if (n >= 1000000) return 'Rp ' + (n / 1000000).toFixed(1).replace('.0', '').replace('.', ',') + ' jt';
    return formatRp(n);
}

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
        renderWishlists();
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

    container.innerHTML = wishlists.map(wish => {
        let percent = wish.targetAmount > 0 ? (wish.currentAmount / wish.targetAmount) * 100 : 0;
        if (percent > 100) percent = 100;
        const done = percent >= 100;
        const plansHtml = wish.plans.length
            ? '<ul class="plan-list">' + wish.plans.slice(0, 3).map(plan => `<li${plan.done ? ' class="done"' : ''}>${esc(plan.text)}</li>`).join('') + '</ul>'
            : '';
        return `
        <article class="wish-card${done ? ' done' : ''}">
            <div class="box-header">
                <h2><button type="button" class="card-link" onclick="openEditModal('${esc(wish.id)}')">${esc(wish.title)}</button></h2>
                <span class="price-badge">${formatRpShort(wish.targetAmount)}</span>
            </div>
            <div class="wish-progress">
                <span>${formatRpShort(wish.currentAmount)} terkumpul</span>
                <span class="${done ? 'done-tag' : 'text-green'}">${done ? 'Tercapai' : Math.floor(percent) + '%'}</span>
            </div>
            <div class="stat-bar-bg"><div class="stat-bar-fill${done ? ' done' : ''}" style="width: ${percent}%;"></div></div>
            ${plansHtml}
        </article>`;
    }).join('');
}

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
    wish.currentAmount = newAmount;
    wish.plans = newPlans;
    showToast('Progres diupdate.');
    closeModal('editWishModal');
    renderWishlists();
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
    showLoading('wishlist-container');
    if (await requireAuth()) fetchCloudWishlists();
});
