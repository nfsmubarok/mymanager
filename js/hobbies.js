let hobbies = [];
let activeEditId = null;

// Nilai type di database tetap (Anime, Movie, Series, Game).
// Cover pakai kata Jepang sebagai motif, nyambung sama logo マネージャー.
const typeConfig = {
    Anime: { label: 'Anime', jp: 'アニメ' },
    Movie: { label: 'Film', jp: '映画' },
    Series: { label: 'Series', jp: 'ドラマ' },
    Game: { label: 'Game', jp: 'ゲーム' }
};
function typeOf(t) { return typeConfig[t] ? t : 'Anime'; }

function getStars(num) {
    const n = Math.max(0, Math.min(5, parseInt(num) || 0));
    return '★'.repeat(n) + '☆'.repeat(5 - n);
}

// --- TARIK DATA ---
async function fetchCloudHobbies() {
    showLoading('watchlist-container');
    showLoading('ratings-container');
    try {
        const user = await getCurrentUser();
        if (!user) return;
        const { data, error } = await supabaseClient.from('hobbies').select('*').eq('user_id', user.id);
        if (error) throw error;
        hobbies = data || [];
        renderHobbies();
    } catch (err) {
        console.error('Fetch hobbies error:', err);
        const msg = 'Daftar hobi ga kebaca. Cek koneksi lu, terus coba lagi.';
        showError('watchlist-container', msg, fetchCloudHobbies);
        showError('ratings-container', msg, fetchCloudHobbies);
    }
}

function renderHobbies() {
    const watchContainer = document.getElementById('watchlist-container');
    const rateContainer = document.getElementById('ratings-container');
    if (!watchContainer || !rateContainer) return;
    clearBusy(watchContainer);
    clearBusy(rateContainer);

    const watchlist = hobbies.filter(h => h.status === 'Plan to Watch');
    const ratedList = hobbies.filter(h => h.status === 'Completed').sort((a, b) => (b.rating || 0) - (a.rating || 0));

    watchContainer.innerHTML = watchlist.length === 0
        ? '<div class="empty-state">Antrian kosong. Tambahin judul yang pengen lu tonton.</div>'
        : watchlist.map(item => {
            const t = typeOf(item.type);
            return `
            <button type="button" class="list-btn" onclick="openEditModal('${esc(item.id)}')">
                <span>
                    <span class="type-badge type-${t}">${typeConfig[t].label}</span><br>
                    <span class="title">${esc(item.title)}</span>
                </span>
                <span class="btn-text" aria-hidden="true">Edit</span>
            </button>`;
        }).join('');

    rateContainer.innerHTML = ratedList.length === 0
        ? '<div class="empty-state">Belum ada review. Selesain satu, terus kasih nilai.</div>'
        : ratedList.map(item => {
            const t = typeOf(item.type);
            return `
            <article class="rating-card">
                <div class="card-cover type-${t}" lang="ja" aria-hidden="true">${typeConfig[t].jp}</div>
                <div class="card-body">
                    <h3><button type="button" class="card-link" onclick="openEditModal('${esc(item.id)}')">${esc(item.title)}</button></h3>
                    <p class="stars" aria-label="Nilai ${parseInt(item.rating) || 0} dari 5">${getStars(item.rating)}</p>
                    <p class="review-text">${item.review ? esc(item.review) : 'Belum ada review.'}</p>
                </div>
            </article>`;
        }).join('');
}

function toggleRatingArea() {
    document.getElementById('rating-area').hidden = document.getElementById('hobby-status').value !== 'Completed';
}

function openAddModal() {
    activeEditId = null;
    document.getElementById('modal-title').textContent = 'Tambah judul';
    document.getElementById('hobby-title').value = '';
    document.getElementById('hobby-type').value = 'Anime';
    document.getElementById('hobby-status').value = 'Plan to Watch';
    document.getElementById('hobby-rating').value = '5';
    document.getElementById('hobby-review').value = '';
    document.getElementById('btn-delete-hobby').hidden = true;
    toggleRatingArea();
    openModal('hobbyModal');
}

function openEditModal(id) {
    const item = hobbies.find(h => h.id == id);
    if (!item) return;
    activeEditId = item.id;
    document.getElementById('modal-title').textContent = 'Edit judul';
    document.getElementById('hobby-title').value = item.title;
    document.getElementById('hobby-type').value = typeOf(item.type);
    document.getElementById('hobby-status').value = item.status;
    document.getElementById('hobby-rating').value = item.rating || '5';
    document.getElementById('hobby-review').value = item.review || '';
    document.getElementById('btn-delete-hobby').hidden = false;
    toggleRatingArea();
    openModal('hobbyModal');
}

async function saveHobby() {
    const title = document.getElementById('hobby-title').value.trim();
    const type = document.getElementById('hobby-type').value;
    const status = document.getElementById('hobby-status').value;
    const rating = parseInt(document.getElementById('hobby-rating').value);
    const review = document.getElementById('hobby-review').value.trim();

    if (!title) { showToast('Judulnya jangan dikosongin.', true); return; }

    const btn = document.getElementById('btn-save-hobby');
    btn.disabled = true;
    const user = await getCurrentUser();
    const payload = { title, type, status, rating, review, user_id: user ? user.id : null };

    if (activeEditId) {
        const { error } = await supabaseClient.from('hobbies').update(payload).eq('id', activeEditId);
        btn.disabled = false;
        if (error) { showToast('Gagal update judul.', true); return; }
        const idx = hobbies.findIndex(h => h.id == activeEditId);
        if (idx > -1) hobbies[idx] = { ...hobbies[idx], ...payload };
    } else {
        const { data, error } = await supabaseClient.from('hobbies').insert([payload]).select();
        btn.disabled = false;
        if (error) { showToast('Gagal nyimpen judul.', true); return; }
        if (data && data.length > 0) hobbies.push(data[0]);
    }

    showToast('Tersimpan.');
    closeModal('hobbyModal');
    renderHobbies();
}

function triggerDeleteHobby() {
    customConfirm('Yakin mau hapus judul ini?', async () => {
        const { error } = await supabaseClient.from('hobbies').delete().eq('id', activeEditId);
        if (error) { showToast('Gagal hapus judul.', true); return; }
        hobbies = hobbies.filter(h => h.id != activeEditId);
        showToast('Judul dihapus.');
        closeModal('hobbyModal');
        renderHobbies();
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    showLoading('watchlist-container');
    showLoading('ratings-container');
    if (await requireAuth()) fetchCloudHobbies();
});
