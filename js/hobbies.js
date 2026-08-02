let hobbies = JSON.parse(localStorage.getItem('finzen_hobbies')) || [];
let activeEditId = null;

const typeConfig = {
    'Anime': { color: '#D98C8C', bg: 'rgba(217,140,140,0.15)', icon: '🌸' },
    'Movie': { color: '#7B9095', bg: 'rgba(123,144,149,0.15)', icon: '🎬' },
    'Series': { color: '#8F9779', bg: 'rgba(143,151,121,0.15)', icon: '📺' },
    'Game': { color: '#6B7280', bg: 'rgba(107,114,128,0.15)', icon: '🎮' }
};

function getStars(num) { return '★'.repeat(num) + '☆'.repeat(5 - num); }

window.renderHobbies = function() {
    const watchContainer = document.getElementById('watchlist-container'), rateContainer = document.getElementById('ratings-container');
    watchContainer.innerHTML = ''; rateContainer.innerHTML = '';
    const watchlist = hobbies.filter(h => h.status === 'Plan to Watch'), ratedList = hobbies.filter(h => h.status === 'Completed');

    if (watchlist.length === 0) watchContainer.innerHTML = '<div class="empty-state">Kosong nih. Tambahin list baru!</div>';
    else { watchlist.forEach(item => { const cfg = typeConfig[item.type]; watchContainer.innerHTML += `<div class="watchlist-item" onclick="openEditModal(${item.id})"><div><span class="type-badge" style="background:${cfg.bg}; color:${cfg.color};">${item.type}</span><p style="font-weight: 600; font-size: 14px;">${item.title}</p></div><div style="font-size: 18px;">${cfg.icon}</div></div>`; }); }

    if (ratedList.length === 0) rateContainer.innerHTML = '<div class="empty-state">Belum ada review.</div>';
    else {
        ratedList.sort((a,b) => b.rating - a.rating).forEach(item => {
            const cfg = typeConfig[item.type];
            rateContainer.innerHTML += `<div class="rating-card" onclick="openEditModal(${item.id})"><div class="card-cover" style="background: ${cfg.bg};">${cfg.icon}</div><div class="card-body"><h4 style="font-size: 15px;">${item.title}</h4><div class="stars">${getStars(item.rating)}</div><p class="review-text">"${item.review || 'No review written.'}"</p></div></div>`;
        });
    }
}

window.toggleRatingArea = function() { document.getElementById('rating-area').style.display = document.getElementById('hobby-status').value === 'Completed' ? 'block' : 'none'; }
window.openAddModal = function() {
    activeEditId = null; document.getElementById('modal-title').innerText = "Add New Entry";
    document.getElementById('hobby-title').value = ''; document.getElementById('hobby-type').value = 'Anime';
    document.getElementById('hobby-status').value = 'Plan to Watch'; document.getElementById('hobby-rating').value = '5'; document.getElementById('hobby-review').value = '';
    document.getElementById('btn-delete-hobby').style.display = 'none'; toggleRatingArea(); openModal('hobbyModal');
}
window.openEditModal = function(id) {
    const item = hobbies.find(h => h.id === id); if(!item) return;
    activeEditId = id; document.getElementById('modal-title').innerText = "Edit Entry";
    document.getElementById('hobby-title').value = item.title; document.getElementById('hobby-type').value = item.type;
    document.getElementById('hobby-status').value = item.status; document.getElementById('hobby-rating').value = item.rating || '5'; document.getElementById('hobby-review').value = item.review || '';
    document.getElementById('btn-delete-hobby').style.display = 'block'; toggleRatingArea(); openModal('hobbyModal');
}

window.saveHobby = async function() {
    const title = document.getElementById('hobby-title').value, type = document.getElementById('hobby-type').value, status = document.getElementById('hobby-status').value, rating = parseInt(document.getElementById('hobby-rating').value), review = document.getElementById('hobby-review').value;
    if(!title) return alert("Judulnya jangan dikosongin!");
    const payload = { title, type, status, rating, review };

    if(activeEditId) { const idx = hobbies.findIndex(h => h.id === activeEditId); hobbies[idx] = { ...hobbies[idx], ...payload }; } 
    else {
        const { error } = await supabaseClient.from('hobbies').insert([payload]);
        if (error) return alert("Gagal simpan hobby!");
        payload.id = Date.now(); hobbies.push(payload);
    }
    localStorage.setItem('finzen_hobbies', JSON.stringify(hobbies)); closeModal('hobbyModal'); renderHobbies();
}

let confirmAction = null; 
window.customConfirm = function(message, actionCallback) { document.getElementById('confirm-msg').innerText = message; confirmAction = actionCallback; document.getElementById('confirmModal').style.display = 'flex'; }
window.executeConfirm = function() { if(confirmAction) { confirmAction(); confirmAction = null; } closeModal('confirmModal'); }
window.triggerDeleteHobby = function() { customConfirm(`Yakin mau menghapus ini?`, () => { hobbies = hobbies.filter(h => h.id !== activeEditId); localStorage.setItem('finzen_hobbies', JSON.stringify(hobbies)); closeModal('hobbyModal'); renderHobbies(); }); }
window.openModal = function(modalId) { document.getElementById(modalId).style.display = 'flex'; }
window.closeModal = function(modalId) { document.getElementById(modalId).style.display = 'none'; }
window.onclick = function(event) { if (event.target.classList.contains('modal-overlay')) event.target.style.display = "none"; }
window.onload = () => { if(typeof checkAuth === 'function') checkAuth(); renderHobbies(); };