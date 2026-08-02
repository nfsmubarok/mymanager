// --- UTILITIES (ANTI CRASH) ---
function showToast(msg, isError = false) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.innerText = msg;
    t.style.backgroundColor = isError ? 'var(--sakura-pink)' : 'var(--matcha-green)';
    t.style.bottom = '30px';
    setTimeout(() => { t.style.bottom = '-100px'; }, 3000);
}

function formatRp(angka) {
    if (angka === undefined || angka === null || isNaN(angka)) return "Rp 0";
    return "Rp " + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function getIcon(category) {
    const icons = { "Food & Drinks": "🍜", "Transport": "🚗", "Salary": "💵", "Entertainment": "🎮", "Shopping": "🛍️", "Transfer": "🔄" };
    return icons[category] || "📝";
}

// --- RENDER DASHBOARD ---
function updateDashboard() {
    const mainSelect = document.getElementById('main-wallet-select');
    const txWallet = document.getElementById('tx-wallet');
    const tfFrom = document.getElementById('transfer-from');
    const tfTo = document.getElementById('transfer-to');
    
    if (mainSelect && txWallet && tfFrom && tfTo) {
        let currentMainVal = mainSelect.value;
        mainSelect.innerHTML = ''; txWallet.innerHTML = ''; tfFrom.innerHTML = ''; tfTo.innerHTML = '';
        wallets.forEach(w => {
            let opt = `<option value="${w.id}">${w.name}</option>`;
            mainSelect.innerHTML += opt; txWallet.innerHTML += opt; tfFrom.innerHTML += opt; tfTo.innerHTML += opt;
        });
        if (currentMainVal && wallets.find(w => w.id === currentMainVal)) mainSelect.value = currentMainVal;
    }

    const now = new Date(); const currentMonth = now.getMonth(); const currentYear = now.getFullYear();
    let totalIncome = 0; let totalExpense = 0; let totalSavings = 0; let expensesByCategory = {};

    // 1. Tentukan Saldo Awal (Dari Database)
    wallets.forEach(w => { w.realBalance = parseInt(w.balance) || 0; });

    // 2. Sortir Transaksi dan Hitung Saldo Dinamis
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    transactions.forEach(tx => {
        let amt = parseInt(tx.amount) || 0;
        let txDate = new Date(tx.date);

        // Rumus Matematika Saldo Dompet
        let wFrom = wallets.find(w => w.id === tx.walletId);
        let wTo = wallets.find(w => w.id === tx.to_wallet_id);

        if (tx.type === 'expense' && wFrom) wFrom.realBalance -= amt;
        if (tx.type === 'income' && wFrom) wFrom.realBalance += amt;
        if (tx.type === 'transfer') {
            if (wFrom) wFrom.realBalance -= amt;
            if (wTo) wTo.realBalance += amt;
        }

        // Hitung Statistik Pemasukan/Pengeluaran Khusus Bulan Ini
        if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
            if (tx.type === 'income') totalIncome += amt;
            if (tx.type === 'expense') {
                totalExpense += amt;
                if (!expensesByCategory[tx.category]) expensesByCategory[tx.category] = 0;
                expensesByCategory[tx.category] += amt;
            }
        }
    });

    // 3. Hitung Ulang Total Tabungan Seluruh Dompet
    wallets.forEach(w => totalSavings += w.realBalance);

    updateCurrentBalanceDisplay();
    if(document.getElementById('display-total-income')) document.getElementById('display-total-income').innerText = formatRp(totalIncome);
    if(document.getElementById('display-total-expense')) document.getElementById('display-total-expense').innerText = formatRp(totalExpense);
    if(document.getElementById('display-total-savings')) document.getElementById('display-total-savings').innerText = formatRp(totalSavings);

    // Wallets List
    const walletsListDiv = document.getElementById('wallets-list');
    if (walletsListDiv) {
        walletsListDiv.innerHTML = '';
        wallets.forEach(w => {
            walletsListDiv.innerHTML += `
                <div class="wallet-sub-box">
                    <div>
                        <p style="font-size: 12px; color: var(--text-muted); text-transform: uppercase;">${w.name}</p>
                        <!-- Panggil realBalance di sini -->
                        <p style="font-weight: bold; font-size: 16px;">${formatRp(w.realBalance)}</p>
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <button onclick="deleteWallet('${w.id}')" style="background: none; border: none; cursor: pointer; font-size: 16px; opacity: 0.6;" title="Delete Wallet">🗑️</button>
                    </div>
                </div>`;
        });
    }

    // Recent Tx
    const recentDiv = document.getElementById('recent-tx-list');
    if (recentDiv) {
        recentDiv.innerHTML = '';
        let recentTxs = transactions.slice(0, 5);
        if (recentTxs.length === 0) recentDiv.innerHTML = '<div class="empty-state">📮 No transactions yet</div>';
        else {
            recentTxs.forEach(tx => {
                let w = wallets.find(w => w.id === tx.walletId) || {name: 'Unknown'};
                let color = tx.type === 'expense' ? 'var(--sakura-pink)' : (tx.type === 'income' ? 'var(--matcha-green)' : 'var(--ocean-blue)');
                let sign = tx.type === 'expense' ? '-' : (tx.type === 'income' ? '+' : '⇌');
                recentDiv.innerHTML += `
                    <div class="transaction-item">
                        <div>
                            <p style="font-weight: 600; font-size: 14px;">${tx.desc} ${getIcon(tx.category)}</p>
                            <p style="font-size: 12px; color: var(--text-muted);">${w.name} • ${tx.date}</p>
                        </div>
                        <p style="color: ${color}; font-weight: bold;">${sign} ${formatRp(tx.amount)}</p>
                    </div>`;
            });
        }
    }

    renderAllTransactions();
}

function updateCurrentBalanceDisplay() {
    let select = document.getElementById('main-wallet-select');
    let display = document.getElementById('display-current-balance');
    if (!select || !display) return;
    let w = wallets.find(w => w.id === select.value);
    
    // Pastikan angka besar di kartu Current Balance pakai realBalance
    display.innerText = w ? formatRp(w.realBalance) : 'Rp 0';
}

function renderAllTransactions() {
    const listDiv = document.getElementById('all-tx-list');
    const monthFilterEl = document.getElementById('filter-month');
    if (!listDiv || !monthFilterEl) return;
    
    const monthFilter = monthFilterEl.value;
    listDiv.innerHTML = '';
    
    let filteredTxs = transactions;
    if (monthFilter !== 'all') filteredTxs = transactions.filter(tx => new Date(tx.date).getMonth() == monthFilter);

    if (filteredTxs.length === 0) { listDiv.innerHTML = '<div class="empty-state">Kosong nih bulan ini.</div>'; return; }

    filteredTxs.forEach(tx => {
        let w = wallets.find(w => w.id === tx.walletId) || {name: 'Unknown'};
        let color = tx.type === 'expense' ? 'var(--sakura-pink)' : (tx.type === 'income' ? 'var(--matcha-green)' : 'var(--ocean-blue)');
        let sign = tx.type === 'expense' ? '-' : (tx.type === 'income' ? '+' : '⇌');
        listDiv.innerHTML += `
            <div class="transaction-item" style="padding: 16px 0; border-bottom: 1px solid var(--border-color);">
                <div style="flex:1;">
                    <p style="font-weight: 600; font-size: 15px; color: var(--text-dark)">${tx.desc} ${getIcon(tx.category)}</p>
                    <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
                        <span style="background: var(--bg-rice); padding: 2px 6px; border-radius: 4px;">${w.name}</span> • ${tx.category} • ${tx.date}
                    </p>
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <p style="color: ${color}; font-weight: bold; font-size: 15px;">${sign} ${formatRp(tx.amount)}</p>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="editTransaction('${tx.id}')" style="background:var(--bg-rice); border:1px solid var(--border-color); border-radius: 4px; padding: 4px 6px; cursor:pointer;" title="Edit">✏️</button>
                        <button onclick="triggerDeleteTx('${tx.id}')" style="background:var(--bg-rice); border:1px solid var(--border-color); border-radius: 4px; padding: 4px 6px; cursor:pointer;" title="Delete">🗑️</button>
                    </div>
                </div>
            </div>`;
    });
}

function editTransaction(id) {
    let tx = transactions.find(t => t.id == id);
    if(tx) {
        if(tx.type === 'transfer') {
            editingTransferId = id;
            document.getElementById('transfer-modal-title').innerText = "Edit Transfer";
            document.getElementById('transfer-from').value = tx.walletId;
            document.getElementById('transfer-to').value = tx.to_wallet_id || '';
            document.getElementById('transfer-amount').value = tx.amount;
            document.getElementById('transfer-date').value = tx.date;
            document.getElementById('transfer-note').value = tx.note || '';
            openModal('transferModal');
        } else {
            editingTxId = id;
            document.getElementById('tx-modal-title').innerText = "Edit Transaction";
            let radioExp = document.getElementById('type-expense');
            let radioInc = document.getElementById('type-income');
            if(tx.type === 'expense' && radioExp) radioExp.checked = true;
            if(tx.type === 'income' && radioInc) radioInc.checked = true;
            document.getElementById('tx-desc').value = tx.desc;
            document.getElementById('tx-amount').value = tx.amount;
            document.getElementById('tx-date').value = tx.date;
            document.getElementById('tx-category').value = tx.category;
            document.getElementById('tx-wallet').value = tx.walletId;
            document.getElementById('tx-note').value = tx.note || '';
            openModal('transactionModal');
        }
    }
}

// --- MODALS & CONFIRM ---
let confirmAction = null; 
function customConfirm(message, actionCallback) {
    const msgEl = document.getElementById('confirm-msg');
    const modalEl = document.getElementById('confirmModal');
    if (msgEl) msgEl.innerText = message;
    confirmAction = actionCallback; 
    if (modalEl) modalEl.style.display = 'flex';
}

function executeConfirm() { 
    if(confirmAction) { confirmAction(); confirmAction = null; } 
    closeModal('confirmModal'); 
}

function openModal(modalId) { 
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = 'flex'; 
    if(modalId === 'transactionModal' && !editingTxId) {
        document.getElementById('tx-modal-title').innerText = "Add Transaction";
        document.getElementById('tx-desc').value = ''; 
        document.getElementById('tx-amount').value = '';
        document.getElementById('tx-date').valueAsDate = new Date(); 
        document.getElementById('tx-note').value = '';
    } else if (modalId === 'transferModal' && !editingTransferId) {
        document.getElementById('transfer-modal-title').innerText = "Transfer Balance";
        document.getElementById('transfer-date').valueAsDate = new Date(); 
        document.getElementById('transfer-amount').value = '';
        document.getElementById('transfer-note').value = '';
    } else if (modalId === 'walletModal') {
        document.getElementById('wallet-name').value = '';
        document.getElementById('wallet-balance').value = '';
    }
}

function closeModal(modalId) { 
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none'; 
    if(modalId === 'transactionModal') editingTxId = null;
    if(modalId === 'transferModal') editingTransferId = null;
}

window.onclick = function(event) { 
    if (event.target && event.target.classList.contains('modal-overlay')) { 
        event.target.style.display = "none"; 
        editingTxId = null; 
        editingTransferId = null; 
    } 
}

// --- INITIALIZE START ---
window.onload = () => { 
    const filterEl = document.getElementById('filter-month');
    if (filterEl) filterEl.value = new Date().getMonth();
    checkAuth(); 
};