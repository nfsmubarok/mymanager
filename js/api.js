// --- STATE GLOBAL ---
var wallets = [];
var transactions = [];
var editingTxId = null;
var editingTransferId = null;
// Status fetch terakhir. Kalau gagal, render ulang (misal pas ganti tema) ga boleh nimpa pesan error pakai data lama.
var lastFetchOk = false;

// --- TARIK DATA (KHUSUS USER LOGIN) ---
async function fetchCloudData() {
    showDashboardLoading();
    try {
        const user = await getCurrentUser();
        if (!user) return;

        const [walletRes, txRes] = await Promise.all([
            supabaseClient.from('wallets').select('*').eq('user_id', user.id),
            supabaseClient.from('transactions').select('*').eq('user_id', user.id)
        ]);
        if (walletRes.error) throw walletRes.error;
        if (txRes.error) throw txRes.error;

        wallets = (walletRes.data || []).map(w => ({
            id: w.id,
            name: w.name || w.nama || 'Dompet',
            balance: parseInt(w.balance) || 0,
            user_id: w.user_id
        }));
        transactions = (txRes.data || []).map(t => ({
            id: t.id,
            type: t.type,
            desc: t.description || t.desc || '',
            amount: parseInt(t.amount) || 0,
            date: t.date,
            category: t.category,
            walletId: t.wallet_id,
            to_wallet_id: t.to_wallet_id,
            note: t.note || ''
        }));

        lastFetchOk = true;
        updateDashboard();
    } catch (err) {
        console.error('Fetch error:', err);
        lastFetchOk = false;
        showDashboardError();
    }
}

function setSaving(btnId, saving, label) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = saving;
    btn.textContent = saving ? 'Menyimpan...' : label;
}

// --- SIMPAN & HAPUS TRANSAKSI ---
async function saveTransaction() {
    const typeEl = document.querySelector('input[name="tx-type"]:checked');
    const type = typeEl ? typeEl.value : 'expense';
    const desc = document.getElementById('tx-desc').value.trim();
    const amount = parseInt(document.getElementById('tx-amount').value);
    const date = document.getElementById('tx-date').value;
    const category = document.getElementById('tx-category').value;
    const walletId = document.getElementById('tx-wallet').value;
    const note = document.getElementById('tx-note').value.trim();

    if (!desc || isNaN(amount) || !date) { showToast('Keterangan, jumlah, dan tanggal wajib diisi.', true); return; }
    if (!walletId) { showToast('Bikin dompet dulu sebelum nyatet transaksi.', true); return; }

    setSaving('btn-save-tx', true, 'Simpan');
    const user = await getCurrentUser();
    const payload = { type, description: desc, amount, date, category, wallet_id: walletId, note, user_id: user ? user.id : null };

    const { error } = editingTxId
        ? await supabaseClient.from('transactions').update(payload).eq('id', editingTxId)
        : await supabaseClient.from('transactions').insert([payload]);
    setSaving('btn-save-tx', false, 'Simpan');

    if (error) { showToast(editingTxId ? 'Gagal update transaksi.' : 'Gagal nyimpen transaksi.', true); return; }
    showToast(editingTxId ? 'Transaksi udah diupdate.' : 'Transaksi tersimpan.');

    closeModal('transactionModal');
    fetchCloudData();
}

function triggerDeleteTx(id) {
    customConfirm('Yakin mau hapus transaksi ini?', async () => {
        const { error } = await supabaseClient.from('transactions').delete().eq('id', id);
        if (error) { showToast('Gagal hapus transaksi.', true); return; }
        showToast('Transaksi dihapus.');
        fetchCloudData();
    });
}

async function saveTransfer() {
    const fromId = document.getElementById('transfer-from').value;
    const toId = document.getElementById('transfer-to').value;
    const amount = parseInt(document.getElementById('transfer-amount').value);
    const date = document.getElementById('transfer-date').value;
    const note = document.getElementById('transfer-note').value.trim();

    if (!fromId || !toId) { showToast('Butuh minimal dua dompet buat transfer.', true); return; }
    if (fromId === toId) { showToast('Masa transfer ke dompet yang sama, wkwk.', true); return; }
    if (isNaN(amount) || !date) { showToast('Isi jumlah dan tanggalnya dulu.', true); return; }

    setSaving('btn-save-transfer', true, 'Simpan transfer');
    const user = await getCurrentUser();
    const payload = {
        type: 'transfer', description: 'Transfer', amount, date,
        category: 'Transfer', wallet_id: fromId, to_wallet_id: toId, note,
        user_id: user ? user.id : null
    };

    const { error } = editingTransferId
        ? await supabaseClient.from('transactions').update(payload).eq('id', editingTransferId)
        : await supabaseClient.from('transactions').insert([payload]);
    setSaving('btn-save-transfer', false, 'Simpan transfer');

    if (error) { showToast('Gagal nyimpen transfer.', true); return; }
    showToast(editingTransferId ? 'Transfer udah diupdate.' : 'Transfer tersimpan.');

    closeModal('transferModal');
    fetchCloudData();
}

// --- DOMPET ---
async function saveWallet() {
    const nameVal = document.getElementById('wallet-name').value.trim();
    const balanceVal = parseInt(document.getElementById('wallet-balance').value);

    if (!nameVal || isNaN(balanceVal)) { showToast('Isi nama dan saldo awalnya.', true); return; }

    const user = await getCurrentUser();
    if (!user) { showToast('Sesi habis, silakan masuk lagi.', true); return; }

    setSaving('btn-save-wallet', true, 'Simpan dompet');
    // Kolom di tabel wallets: id, nama, balance, user_id
    const payload = { id: crypto.randomUUID(), nama: nameVal, balance: balanceVal, user_id: user.id };
    const { error } = await supabaseClient.from('wallets').insert([payload]).select();
    setSaving('btn-save-wallet', false, 'Simpan dompet');

    if (error) {
        console.error('Supabase error:', error);
        showToast('Gagal nyimpen dompet. Coba lagi sebentar lagi.', true);
        return;
    }

    showToast('Dompet ditambahin.');
    closeModal('walletModal');
    fetchCloudData();
}

function deleteWallet(id) {
    customConfirm('Yakin mau hapus dompet ini?', async () => {
        const { error } = await supabaseClient.from('wallets').delete().eq('id', id);
        if (error) { showToast('Gagal hapus dompet.', true); return; }
        showToast('Dompet dihapus.');
        fetchCloudData();
    });
}
