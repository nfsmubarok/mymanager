// --- STATE / VARIABEL GLOBAL ---
let wallets = JSON.parse(localStorage.getItem('finzen_wallets')) || [];
let transactions = JSON.parse(localStorage.getItem('finzen_tx')) || [];
let editingTxId = null;
let editingTransferId = null;

// --- FUNGSI NARIK DATA (FETCH) ---
async function fetchCloudData() {
    const { data: dbWallets } = await supabaseClient.from('wallets').select('*');
    if (dbWallets) {
        wallets = dbWallets.map(w => ({ id: w.id, name: w.nama, balance: w.balance, user_id: w.user_id }));
        localStorage.setItem('finzen_wallets', JSON.stringify(wallets));
    }

    const { data: dbTx } = await supabaseClient.from('transactions').select('*');
    if (dbTx) {
        transactions = dbTx.map(t => ({
            id: t.id, type: t.type, desc: t.description, amount: t.amount, date: t.date,
            category: t.category, walletId: t.wallet_id, to_wallet_id: t.to_wallet_id, note: t.note
        }));
        localStorage.setItem('finzen_tx', JSON.stringify(transactions));
    }
    updateDashboard();
}

// --- FUNGSI SIMPAN & HAPUS KE CLOUD ---
async function saveTransaction() {
    let type = document.querySelector('input[name="tx-type"]:checked').value;
    let desc = document.getElementById('tx-desc').value;
    let amount = parseInt(document.getElementById('tx-amount').value);
    let date = document.getElementById('tx-date').value;
    let category = document.getElementById('tx-category').value;
    let walletId = document.getElementById('tx-wallet').value;
    let note = document.getElementById('tx-note').value;

    if(!desc || !amount || !date) { showToast("Tolong isi Description, Amount, dan Date!", true); return; }
    let payload = { type, description: desc, amount, date, category, wallet_id: walletId, note };

    if(editingTxId) {
        const { error } = await supabaseClient.from('transactions').update(payload).eq('id', editingTxId);
        if (error) { showToast("Gagal update cloud!", true); return; }
        // (Logika re-kalkulasi saldo lokal disederhanakan, akan ketarik ulang via fetchCloudData biar aman)
        showToast("Transaksi berhasil diupdate!");
    } else {
        const { error } = await supabaseClient.from('transactions').insert([payload]);
        if (error) { showToast("Gagal simpan ke cloud!", true); return; }
        showToast("Transaksi tersimpan!");
    }
    editingTxId = null;
    closeModal('transactionModal');
    fetchCloudData(); // Sync ulang dari cloud biar saldo akurat
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
    if(!amount || !date) { showToast("Isi jumlah dan tanggalnya cuy!", true); return; }

    let payload = { 
        type: 'transfer', description: `Transfer`, amount: amount, date: date, 
        category: 'Transfer', wallet_id: fromId, to_wallet_id: toId, note: note 
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

function saveWallet() {
    // Saat ini belum ada ke cloud, nanti bisa ditambah kalau butuh Create Wallet via UI
    showToast("Fitur Add Wallet sedang dalam maintenance struktural!");
}

function deleteWallet(id) {
    showToast("Fitur Delete Wallet sedang dalam maintenance struktural!");
}