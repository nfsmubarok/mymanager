// --- UTILITIES ---
function showToast(msg, isError = false) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.style.backgroundColor = isError ? 'var(--sakura-pink)' : 'var(--matcha-green)';
    t.style.bottom = '30px';
    setTimeout(() => { t.style.bottom = '-100px'; }, 3000);
}
function formatRp(angka) { return "Rp " + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
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
    
    let currentMainVal = mainSelect.value;
    mainSelect.innerHTML = ''; txWallet.innerHTML = ''; tfFrom.innerHTML = ''; tfTo.innerHTML = '';
    wallets.forEach(w => {
        let opt = `<option value="${w.id}">${w.name}</option>`;
        mainSelect.innerHTML += opt; txWallet.innerHTML += opt; tfFrom.innerHTML += opt; tfTo.innerHTML += opt;
    });
    if (currentMainVal && wallets.find(w => w.id === currentMainVal)) mainSelect.value = currentMainVal;

    const now = new Date(); const currentMonth = now.getMonth(); const currentYear = now.getFullYear();
    let totalIncome = 0; let totalExpense = 0; let totalSavings = 0; let expensesByCategory = {};

    wallets.forEach(w => totalSavings += parseInt(w.balance));
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    transactions.forEach(tx => {
        let txDate = new Date(tx.date);
        if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
            if (tx.type === 'income') totalIncome += parseInt(tx.amount);
            if (tx.type === 'expense') {
                totalExpense += parseInt(tx.amount);
                if (!expensesByCategory[tx.category]) expensesByCategory[tx.category] = 0;
                expensesByCategory[tx.category] += parseInt(tx.amount);
            }
        }
    });

    updateCurrentBalanceDisplay();
    document.getElementById('display-total-income').innerText = formatRp(totalIncome);
    document.getElementById('display-total-expense').innerText = formatRp(totalExpense);
    document.getElementById('display-total-savings').innerText = formatRp(totalSavings);

    // Render Wallets
    const walletsListDiv = document.getElementById('wallets-list');
    walletsListDiv.innerHTML = '';
    wallets.forEach(w => {
        walletsListDiv.innerHTML += `
            <div class="wallet-sub-box">
                <div>
                    <p style="font-size: 12px; color: var(--text-muted); text-transform: uppercase;">${w.name}</p>
                    <p style="font-weight: bold; font-size: 16px;">${formatRp(w.balance)}</p>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--matcha-green); color: var(--matcha-green); opacity: 0.15; display: flex; align-items:center; justify-content:center;">💳</div>
                </div>
            </div>`;
    });

    // Render Recent Tx
    const recentDiv = document.getElementById('recent-tx-list');
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

    renderAllTransactions();
}

function updateCurrentBalanceDisplay() {
    let selectedId = document.getElementById('main-wallet-select').value;
    let w = wallets.find(w => w.id === selectedId);
    document.getElementById('display-current-balance').innerText = w ? formatRp(w.balance) : 'Rp 0';
}

function renderAllTransactions() {
    const listDiv = document.getElementById('all-tx-list');
    const monthFilter = document.getElementById('filter-month').value;
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
            document.getElementById(tx.type === 'expense' ? 'type-expense' : 'type-income').checked = true;
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

// --- MODAL & EVENTS ---
let confirmAction = null; 
function customConfirm(message, actionCallback) {
    document.getElementById('confirm-msg').innerText = message;
    confirmAction = actionCallback; 
    document.getElementById('confirmModal').style.display = 'flex';
}
function executeConfirm() { if(confirmAction) { confirmAction(); confirmAction = null; } closeModal('confirmModal'); }

function openModal(modalId) { 
    document.getElementById(modalId).style.display = 'flex'; 
    if(modalId === 'transactionModal' && !editingTxId) {
        document.getElementById('tx-modal-title').innerText = "Add Transaction";
        document.getElementById('tx-desc').value = ''; document.getElementById('tx-amount').value = '';
        document.getElementById('tx-date').valueAsDate = new Date(); document.getElementById('tx-note').value = '';
    } else if (modalId === 'transferModal' && !editingTransferId) {
        document.getElementById('transfer-modal-title').innerText = "Transfer Balance";
        document.getElementById('transfer-date').valueAsDate = new Date(); document.getElementById('transfer-amount').value = '';
        document.getElementById('transfer-note').value = '';
    }
}
function closeModal(modalId) { 
    document.getElementById(modalId).style.display = 'none'; 
    if(modalId === 'transactionModal') editingTxId = null;
    if(modalId === 'transferModal') editingTransferId = null;
}
window.onclick = function(event) { 
    if (event.target.classList.contains('modal-overlay')) { event.target.style.display = "none"; editingTxId = null; editingTransferId = null; } 
}

// --- INITIALIZE START ---
window.onload = () => { 
    document.getElementById('filter-month').value = new Date().getMonth();
    checkAuth(); 
};