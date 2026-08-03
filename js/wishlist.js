let wishlists = JSON.parse(localStorage.getItem('finzen_wishlists')) || [];
let activeEditId = null; 

function formatRp(angka) { return angka >= 1000000 ? "Rp " + (angka / 1000000).toFixed(1).replace('.0', '') + " Jt" : "Rp " + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
function formatRpFull(angka) { return "Rp " + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); }

// --- TARIK DATA CLOUD ---
async function fetchCloudWishlists() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        const { data: dbWish, error } = await supabaseClient.from('wishlists').select('*').eq('user_id', user.id);
        if (dbWish) {
            wishlists = dbWish.map(w => ({
                id: w.id,
                title: w.title,
                targetAmount: w.target_amount,
                currentAmount: w.current_amount,
                plans: typeof w.plans === 'string' ? JSON.parse(w.plans) : (w.plans || [])
            }));
            localStorage.setItem('finzen_wishlists', JSON.stringify(wishlists));
            renderWishlists();
        }
    } catch (err) { console.error("Fetch Wishlists Error:", err); }
}

window.renderWishlists = function() {
    const container = document.getElementById('wishlist-container');
    container.innerHTML = '';
    if (wishlists.length === 0) return container.innerHTML = `<div class="empty-state"><span style="font-size: 24px; display: block; margin-bottom: 10px;">✨</span>Belum ada impian.</div>`;

    wishlists.forEach(wish => {
        let percent = wish.targetAmount > 0 ? (wish.currentAmount / wish.targetAmount) * 100 : 0;
        if (percent > 100) percent = 100;
        let plansHtml = '';
        if(wish.plans && wish.plans.length > 0) {
            plansHtml = '<ul class="plan-list">';
            wish.plans.slice(0, 3).forEach(plan => plansHtml += `<li ${plan.done ? 'class="done"' : ''}>${plan.text}</li>`);
            plansHtml += '</ul>';
        }
        const barColor = percent >= 100 ? 'var(--ocean-blue)' : 'var(--matcha-green)';
        container.innerHTML += `
            <div class="box" style="border-top: 4px solid ${barColor};" onclick="openEditModal('${wish.id}')">
                <div class="box-header">
                    <h3 style="font-size: 18px;">${percent >= 100 ? '🎉' : '🎯'} ${wish.title}</h3>
                    <span class="price-badge">${formatRp(wish.targetAmount)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <p style="font-size: 13px; font-weight:600;">Progress: ${formatRp(wish.currentAmount)}</p>
                    <p style="font-size: 13px; font-weight: bold; color: ${barColor};">${Math.floor(percent)}%</p>
                </div>
                <div class="stat-bar-bg"><div class="stat-bar-fill" style="width: ${percent}%; background: ${barColor};"></div></div>
                ${plansHtml}
            </div>`;
    });
}

window.openAddModal = function() {
    document.getElementById('wish-title').value = ''; document.getElementById('wish-target').value = '';
    document.getElementById('wish-current').value = '0'; document.getElementById('wish-plans').value = '';
    openModal('addWishModal');
}

window.saveNewWish = async function() {
    const title = document.getElementById('wish-title').value;
    const targetAmount = parseInt(document.getElementById('wish-target').value);
    const currentAmount = parseInt(document.getElementById('wish-current').value) || 0;
    const plansText = document.getElementById('wish-plans').value;

    if(!title || isNaN(targetAmount)) return alert("Title dan Target wajib diisi!");

    const { data: { user } } = await supabaseClient.auth.getUser();
    let plansArray = plansText.trim() !== '' ? plansText.split('\n').filter(p => p.trim() !== '').map((text, index) => ({ id: index, text: text.trim(), done: false })) : [];

    const payload = { 
        title: title, target_amount: targetAmount, current_amount: currentAmount, 
        plans: JSON.stringify(plansArray), user_id: user ? user.id : null 
    };

    const { data: dbData, error } = await supabaseClient.from('wishlists').insert([payload]).select();
    if (error) return alert("Gagal simpan wishlist!");

    if (dbData && dbData.length > 0) {
        const w = dbData[0];
        wishlists.push({ id: w.id, title: w.title, targetAmount: w.target_amount, currentAmount: w.current_amount, plans: plansArray });
    }

    localStorage.setItem('finzen_wishlists', JSON.stringify(wishlists));
    closeModal('addWishModal'); renderWishlists();
}

window.openEditModal = function(id) {
    const wish = wishlists.find(w => w.id == id);
    if(!wish) return;
    activeEditId = id;
    document.getElementById('edit-modal-title').innerText = wish.title;
    document.getElementById('edit-wish-current').value = wish.currentAmount;
    document.getElementById('edit-wish-target-hint').innerText = `Target total: ${formatRpFull(wish.targetAmount)}`;
    
    const checklist = document.getElementById('edit-wish-plans');
    checklist.innerHTML = '';
    if(wish.plans && wish.plans.length > 0) {
        wish.plans.forEach(plan => { checklist.innerHTML += `<label class="checklist-item"><input type="checkbox" id="plan-${plan.id}" ${plan.done ? 'checked' : ''}><span>${plan.text}</span></label>`; });
    } else checklist.innerHTML = '<p style="font-size: 12px; color: var(--text-muted);">Tidak ada action plan.</p>';
    openModal('editWishModal');
}

window.saveEditWish = async function() {
    const wishIndex = wishlists.findIndex(w => w.id == activeEditId);
    if(wishIndex === -1) return;
    
    wishlists[wishIndex].currentAmount = parseInt(document.getElementById('edit-wish-current').value) || 0;
    if(wishlists[wishIndex].plans) {
        wishlists[wishIndex].plans.forEach(plan => { const cb = document.getElementById(`plan-${plan.id}`); if(cb) plan.done = cb.checked; });
    }

    // Save update ke cloud
    const payload = {
        current_amount: wishlists[wishIndex].currentAmount,
        plans: JSON.stringify(wishlists[wishIndex].plans)
    };
    await supabaseClient.from('wishlists').update(payload).eq('id', activeEditId);

    localStorage.setItem('finzen_wishlists', JSON.stringify(wishlists));
    closeModal('editWishModal'); renderWishlists();
}

let confirmAction = null; 
window.customConfirm = function(message, actionCallback) { document.getElementById('confirm-msg').innerText = message; confirmAction = actionCallback; document.getElementById('confirmModal').style.display = 'flex'; }
window.executeConfirm = function() { if(confirmAction) { confirmAction(); confirmAction = null; } closeModal('confirmModal'); }

window.triggerDeleteWish = function() {
    customConfirm(`Yakin mau menghapus wishlist ini?`, async () => {
        const { error } = await supabaseClient.from('wishlists').delete().eq('id', activeEditId);
        if(error) return alert("Gagal hapus wishlist!");

        wishlists = wishlists.filter(w => w.id != activeEditId);
        localStorage.setItem('finzen_wishlists', JSON.stringify(wishlists));
        closeModal('editWishModal'); renderWishlists();
    });
}

window.openModal = function(modalId) { document.getElementById(modalId).style.display = 'flex'; }
window.closeModal = function(modalId) { document.getElementById(modalId).style.display = 'none'; }
window.onclick = function(event) { if (event.target.classList.contains('modal-overlay')) event.target.style.display = "none"; }
window.onload = () => { if(typeof checkAuth === 'function') checkAuth(); fetchCloudWishlists(); };