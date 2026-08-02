// --- STATE GLOBAL ---
var wallets = JSON.parse(localStorage.getItem('finzen_wallets')) || [];
var transactions = JSON.parse(localStorage.getItem('finzen_tx')) || [];
var editingTxId = null;
var editingTransferId = null;

// --- FUNGSI FETCH CLOUD ---
async function fetchCloudData() {
    try {
        const { data: dbWallets, error: errW } = await supabaseClient.from('wallets').select('*');
        if (dbWallets) {
            wallets = dbWallets.map(w => ({
                id: w.id,
                name: w.nama || w.name || 'Wallet',
                balance: parseInt(w.balance) || 0,
                user_id: w.user_id
            }));
            localStorage.setItem('finzen_wallets', JSON.stringify(wallets));
        }

        const { data: dbTx, error: errT } = await supabaseClient.from('transactions').select('*');
        if (dbTx) {
            transactions = dbTx.map(t => ({
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
            localStorage.setItem('finzen_tx', JSON.stringify(transactions));
        }

        if (typeof updateDashboard === 'function') {
            updateDashboard();
        }
    } catch (err) {
        console.error("Fetch Error:", err);
    }
}

// --- FUNGSI SAVE & DELETE TRANSAKSI ---
async function saveTransaction() {
    let typeEl = document.querySelector('input[name="tx-type"]:checked');
    let type = typeEl ? typeEl.value : 'expense';
    let desc = document.getElementById('tx-desc').value;
    let amount = parseInt(document.getElementById('tx-amount').value);
    let date = document.getElementById('tx-date').value;
    let category = document.getElementById('tx-category').value;
    let walletId = document.getElementById('tx-wallet').value;
    let note = document.getElementById('tx-note').value;

    if(!desc || isNaN(amount) || !date) { showToast("Tolong isi Description, Amount, dan Date!", true); return; }

    const { data: { user } } = await supabaseClient.auth.getUser();
    let payload = { type, description: desc, amount, date, category, wallet_id: walletId, note, user_id: user ? user.id : null };

    if(editingTxId) {
        const { error } = await supabaseClient.from('transactions').update(payload).eq('id', editingTxId);
        if (error) { showToast("Gagal update cloud!", true); return; }
        showToast("Transaksi berhasil diupdate!");
    } else {
        const { error } = await supabaseClient.from('transactions').insert([payload]);
        if (error) { showToast("Gagal simpan ke cloud!", true); return; }
        showToast("Transaksi tersimpan!");
    }

    editingTxId = null;
    closeModal('transactionModal');
    fetchCloudData();
}

function triggerDeleteTx(id) {
    customConfirm(`Yakin mau menghapus transaksi ini?`, async () => {
        const { error } = await supabaseClient.from('transactions').delete().eq('id', id);
        if (error) { showToast("Gagal hapus dari cloud!", true); return; }
        showToast("Transaksi berhasil dihapus!");
        fetchCloudData();
    });
}

async function saveTransfer() {
    let fromId = document.getElementById('transfer-from').value;
    let toId = document.getElementById('transfer-to').value;
    let amount = parseInt(document.getElementById('transfer-amount').value);
    let date = document.getElementById('transfer-date').value;
    let note = document.getElementById('transfer-note').value;

    if(fromId === toId) { showToast("Masa transfer ke dompet yang sama wkwk", true); return; }
    if(isNaN(amount) || !date) { showToast("Isi jumlah dan tanggalnya cuy!", true); return; }

    const { data: { user } } = await supabaseClient.auth.getUser();
    let payload = { 
        type: 'transfer', description: `Transfer`, amount: amount, date: date, 
        category: 'Transfer', wallet_id: fromId, to_wallet_id: toId, note: note,
        user_id: user ? user.id : null
    };

    if(editingTransferId) {
        const { error } = await supabaseClient.from('transactions').update(payload).eq('id', editingTransferId);
        if (error) { showToast("Gagal update transfer!", true); return; }
        showToast("Transfer berhasil diupdate!");
    } else {
        const { error } = await supabaseClient.from('transactions').insert([payload]);
        if (error) { showToast("Gagal simpan transfer!", true); return; }
        showToast("Transfer berhasil!");
    }

    editingTransferId = null;
    closeModal('transferModal');
    fetchCloudData();
}

async function saveWallet() {
    let name = document.getElementById('wallet-name').value;
    let balance = parseInt(document.getElementById('wallet-balance').value);
    if(!name || isNaN(balance)) { showToast("Isi nama dan saldo awalnya!", true); return; }

    const { data: { user } } = await supabaseClient.auth.getUser();
    const payload = { nama: name, balance: balance, user_id: user ? user.id : null };

    const { error } = await supabaseClient.from('wallets').insert([payload]);
    if (error) { showToast("Gagal simpan wallet!", true); return; }

    showToast("Wallet berhasil ditambahkan!");
    closeModal('walletModal');
    fetchCloudData();
}

function deleteWallet(id) {
    customConfirm("Yakin mau hapus dompet ini?", async () => {
        const { error } = await supabaseClient.from('wallets').delete().eq('id', id);
        if (error) { showToast("Gagal hapus wallet!", true); return; }
        showToast("Wallet dihapus!");
        fetchCloudData();
    });
}