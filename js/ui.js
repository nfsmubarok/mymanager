let expenseChartInstance = null;

// Nilai kategori di database tetap bahasa Inggris, yang ditampilin bahasa Indonesia
const categoryLabels = {
    'Food & Drinks': 'Makan & minum',
    'Transport': 'Transport',
    'Salary': 'Gaji',
    'Entertainment': 'Hiburan',
    'Shopping': 'Belanja',
    'Transfer': 'Transfer',
    'Other': 'Lainnya'
};
function categoryLabel(cat) { return categoryLabels[cat] || cat || 'Lainnya'; }

// Warna chart diturunin dari palet zen (matcha, sakura, ocean + versi muda)
const chartColors = ['#5E6B45', '#A64B52', '#506870', '#8F9779', '#D98C8C', '#7B9095', '#C9CDB8'];

const LIST_IDS = ['recent-tx-list', 'wallets-list', 'all-tx-list'];
const AMOUNT_IDS = ['display-current-balance', 'display-total-savings', 'display-total-income', 'display-total-expense', 'display-net'];

function showDashboardLoading() {
    LIST_IDS.forEach(id => showLoading(id));
    AMOUNT_IDS.forEach(id => { const el = document.getElementById(id); if (el) { el.textContent = 'Memuat...'; el.classList.add('is-loading'); } });
    setChartState('loading', 'Lagi ngambil data...');
}

function showDashboardError() {
    LIST_IDS.forEach(id => showError(id, 'Data ga kebaca. Cek koneksi lu, terus coba lagi.', fetchCloudData));
    AMOUNT_IDS.forEach(id => { const el = document.getElementById(id); if (el) { el.textContent = '-'; el.classList.remove('is-loading'); } });
    setChartState('error', 'Diagram belum bisa ditampilin.');
}

function setChartState(type, message) {
    const canvas = document.getElementById('expenseChart');
    const state = document.getElementById('chart-state');
    if (!canvas || !state) return;
    if (!type) { state.hidden = true; canvas.style.display = 'block'; return; }
    canvas.style.display = 'none';
    state.hidden = false;
    state.className = 'state state-' + type;
    state.textContent = message;
}

function txSign(type) { return type === 'expense' ? '-' : (type === 'income' ? '+' : ''); }
function txColorClass(type) { return type === 'expense' ? 'text-red' : (type === 'income' ? 'text-green' : 'text-blue'); }
function walletName(id) { const w = wallets.find(w => w.id === id); return w ? w.name : 'Dompet terhapus'; }

// --- RENDER DASHBOARD ---
function updateDashboard() {
    const selects = ['main-wallet-select', 'tx-wallet', 'transfer-from', 'transfer-to'].map(id => document.getElementById(id));
    const prevMain = selects[0] ? selects[0].value : '';
    const optionsHtml = wallets.map(w => `<option value="${esc(w.id)}">${esc(w.name)}</option>`).join('');
    selects.forEach(sel => { if (sel) sel.innerHTML = optionsHtml || '<option value="">Belum ada dompet</option>'; });
    if (prevMain && wallets.find(w => w.id === prevMain)) selects[0].value = prevMain;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let totalIncome = 0, totalExpense = 0, totalSavings = 0;
    const expensesByCategory = {};

    // Saldo awal dari database, lalu dihitung ulang dari semua transaksi
    wallets.forEach(w => { w.realBalance = parseInt(w.balance) || 0; });
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    transactions.forEach(tx => {
        const amt = parseInt(tx.amount) || 0;
        const txDate = new Date(tx.date);
        const wFrom = wallets.find(w => w.id === tx.walletId);
        const wTo = wallets.find(w => w.id === tx.to_wallet_id);

        if (tx.type === 'expense' && wFrom) wFrom.realBalance -= amt;
        if (tx.type === 'income' && wFrom) wFrom.realBalance += amt;
        if (tx.type === 'transfer') {
            if (wFrom) wFrom.realBalance -= amt;
            if (wTo) wTo.realBalance += amt;
        }

        if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
            if (tx.type === 'income') totalIncome += amt;
            if (tx.type === 'expense') {
                totalExpense += amt;
                const label = categoryLabel(tx.category);
                expensesByCategory[label] = (expensesByCategory[label] || 0) + amt;
            }
        }
    });

    wallets.forEach(w => totalSavings += w.realBalance);

    const monthHeading = document.getElementById('month-heading');
    if (monthHeading) monthHeading.textContent = 'Bulan ini, ' + now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    updateCurrentBalanceDisplay();
    setAmount('display-total-savings', formatRp(totalSavings));
    setAmount('display-total-income', formatRp(totalIncome));
    setAmount('display-total-expense', formatRp(totalExpense));
    const net = totalIncome - totalExpense;
    setAmount('display-net', (net > 0 ? '+' : '') + formatRp(net));
    const netEl = document.getElementById('display-net');
    if (netEl) netEl.className = net < 0 ? 'text-red' : 'text-green';

    renderChart(expensesByCategory, totalExpense);
    renderWallets();
    renderRecent();
    renderAllTransactions();
}

function setAmount(id, text) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.classList.remove('is-loading');
}

function renderChart(expensesByCategory, totalExpense) {
    const chartCanvas = document.getElementById('expenseChart');
    if (!chartCanvas) return;
    const labels = Object.keys(expensesByCategory);

    if (labels.length === 0) {
        setChartState('empty', 'Belum ada pengeluaran bulan ini.');
        return;
    }
    if (typeof Chart === 'undefined') {
        setChartState('error', 'Library diagram gagal dimuat.');
        return;
    }
    setChartState(null);

    if (expenseChartInstance) expenseChartInstance.destroy();
    expenseChartInstance = new Chart(chartCanvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{ data: Object.values(expensesByCategory), backgroundColor: chartColors, borderWidth: 2, borderColor: '#ffffff' }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 400 },
            plugins: {
                legend: {
                    position: 'right',
                    labels: { font: { size: 12 }, color: '#5F6B78', usePointStyle: true }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const val = context.raw || 0;
                            const pct = totalExpense ? ((val / totalExpense) * 100).toFixed(1) : '0';
                            return ` ${context.label}: ${formatRp(val)} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

function renderWallets() {
    const el = document.getElementById('wallets-list');
    if (!el) return;
    clearBusy(el);
    if (wallets.length === 0) {
        el.innerHTML = '<div class="empty-state">Belum ada dompet. Tambahin satu dulu biar bisa nyatet.</div>';
        return;
    }
    el.innerHTML = wallets.map(w => `
        <div class="wallet-sub-box">
            <div>
                <p class="wallet-name">${esc(w.name)}</p>
                <p class="wallet-balance">${formatRp(w.realBalance)}</p>
            </div>
            <button type="button" class="btn-text danger" onclick="deleteWallet('${esc(w.id)}')" aria-label="Hapus dompet ${esc(w.name)}">Hapus</button>
        </div>`).join('');
}

function renderRecent() {
    const el = document.getElementById('recent-tx-list');
    if (!el) return;
    clearBusy(el);
    const recent = transactions.slice(0, 5);
    if (recent.length === 0) {
        el.innerHTML = '<div class="empty-state">Belum ada transaksi. Catat yang pertama, misalnya jajan hari ini.</div>';
        return;
    }
    el.innerHTML = recent.map(tx => `
        <div class="transaction-item">
            <div class="tx-main">
                <p class="tx-desc">${esc(tx.desc)}</p>
                <p class="tx-meta">${esc(walletName(tx.walletId))} · ${esc(categoryLabel(tx.category))} · ${formatDate(tx.date)}</p>
            </div>
            <p class="tx-amount ${txColorClass(tx.type)}">${txSign(tx.type)}${formatRp(tx.amount)}</p>
        </div>`).join('');
}

function updateCurrentBalanceDisplay() {
    const select = document.getElementById('main-wallet-select');
    const display = document.getElementById('display-current-balance');
    if (!select || !display) return;
    const w = wallets.find(w => w.id === select.value);
    display.textContent = w ? formatRp(w.realBalance) : 'Rp 0';
    display.classList.remove('is-loading');
}

function renderAllTransactions() {
    const el = document.getElementById('all-tx-list');
    const monthFilterEl = document.getElementById('filter-month');
    if (!el || !monthFilterEl) return;
    clearBusy(el);

    const monthFilter = monthFilterEl.value;
    const filtered = monthFilter === 'all'
        ? transactions
        : transactions.filter(tx => new Date(tx.date).getMonth() == monthFilter);

    if (filtered.length === 0) {
        el.innerHTML = '<div class="empty-state">Kosong nih di bulan ini.</div>';
        return;
    }

    el.innerHTML = filtered.map(tx => {
        const meta = tx.type === 'transfer'
            ? `<span class="chip">${esc(walletName(tx.walletId))}</span> ke <span class="chip">${esc(walletName(tx.to_wallet_id))}</span> · ${formatDate(tx.date)}`
            : `<span class="chip">${esc(walletName(tx.walletId))}</span> · ${esc(categoryLabel(tx.category))} · ${formatDate(tx.date)}`;
        return `
        <div class="transaction-item">
            <div class="tx-main">
                <p class="tx-desc">${esc(tx.desc)}</p>
                <p class="tx-meta">${meta}${tx.note ? ' · ' + esc(tx.note) : ''}</p>
            </div>
            <div class="tx-side">
                <p class="tx-amount ${txColorClass(tx.type)}">${txSign(tx.type)}${formatRp(tx.amount)}</p>
                <div class="tx-actions">
                    <button type="button" class="btn-text" onclick="editTransaction('${esc(tx.id)}')" aria-label="Edit ${esc(tx.desc)}">Edit</button>
                    <button type="button" class="btn-text danger" onclick="triggerDeleteTx('${esc(tx.id)}')" aria-label="Hapus ${esc(tx.desc)}">Hapus</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function editTransaction(id) {
    const tx = transactions.find(t => t.id == id);
    if (!tx) return;
    if (tx.type === 'transfer') {
        editingTransferId = tx.id;
        openModal('transferModal');
        document.getElementById('transfer-modal-title').textContent = 'Edit transfer';
        document.getElementById('transfer-from').value = tx.walletId;
        document.getElementById('transfer-to').value = tx.to_wallet_id || '';
        document.getElementById('transfer-amount').value = tx.amount;
        document.getElementById('transfer-date').value = tx.date;
        document.getElementById('transfer-note').value = tx.note || '';
    } else {
        editingTxId = tx.id;
        openModal('transactionModal');
        document.getElementById('tx-modal-title').textContent = 'Edit transaksi';
        document.getElementById(tx.type === 'expense' ? 'type-expense' : 'type-income').checked = true;
        document.getElementById('tx-desc').value = tx.desc;
        document.getElementById('tx-amount').value = tx.amount;
        document.getElementById('tx-date').value = tx.date;
        document.getElementById('tx-category').value = tx.category;
        document.getElementById('tx-wallet').value = tx.walletId;
        document.getElementById('tx-note').value = tx.note || '';
    }
}

// --- RESET FORM PAS MODAL DIBUKA / DITUTUP ---
window.onModalOpen = function(modalId) {
    if (modalId === 'transactionModal' && !editingTxId) {
        document.getElementById('tx-modal-title').textContent = 'Catat transaksi';
        document.getElementById('type-income').checked = true;
        document.getElementById('tx-desc').value = '';
        document.getElementById('tx-amount').value = '';
        document.getElementById('tx-date').value = localDateStr();
        document.getElementById('tx-note').value = '';
    } else if (modalId === 'transferModal' && !editingTransferId) {
        document.getElementById('transfer-modal-title').textContent = 'Pindahin saldo';
        document.getElementById('transfer-date').value = localDateStr();
        document.getElementById('transfer-amount').value = '';
        document.getElementById('transfer-note').value = '';
    } else if (modalId === 'walletModal') {
        document.getElementById('wallet-name').value = '';
        document.getElementById('wallet-balance').value = '';
    }
};
window.onModalClose = function(modalId) {
    if (modalId === 'transactionModal') editingTxId = null;
    if (modalId === 'transferModal') editingTransferId = null;
};

// --- MULAI ---
document.addEventListener('DOMContentLoaded', async () => {
    const filterEl = document.getElementById('filter-month');
    if (filterEl) filterEl.value = String(new Date().getMonth());
    showDashboardLoading();
    if (await requireAuth()) fetchCloudData();
});
