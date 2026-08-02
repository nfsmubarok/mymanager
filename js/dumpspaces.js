let dumps = JSON.parse(localStorage.getItem('finzen_dumps')) || [];
        
window.showToast = function(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg; t.style.bottom = '30px'; t.style.opacity = '1';
    setTimeout(() => { t.style.bottom = '-50px'; t.style.opacity = '0'; }, 3000);
}

window.renderDumps = function() {
    const container = document.getElementById('dumps-container'); container.innerHTML = '';
    if (dumps.length === 0) return container.innerHTML = `<div class="empty-state"><span style="font-size: 24px; display: block; margin-bottom: 10px;">📦</span>Masih kosong. Mulai buang link, ide, atau gambar lu kesini!</div>`;

    dumps.sort((a,b) => b.id - a.id).forEach(dump => {
        let badgeClass = '', contentHtml = '', titleHtml = dump.title ? `<h4 class="dump-title">${dump.title}</h4>` : '';
        if (dump.type === 'Note') { badgeClass = 'type-note'; contentHtml = `<p class="dump-text">${dump.content}</p>`; } 
        else if (dump.type === 'Link') { badgeClass = 'type-link'; contentHtml = `<a href="${dump.url}" target="_blank" class="dump-link">🔗 Visit Link ↗</a>`; if(dump.content) contentHtml = `<p class="dump-text" style="margin-bottom:8px;">${dump.content}</p>` + contentHtml; } 
        else if (dump.type === 'Image') { badgeClass = 'type-image'; }

        container.innerHTML += `
            <div class="dump-card">
                ${dump.type === 'Image' ? `<img src="${dump.url}" alt="Dumped Image" class="dump-image" onerror="this.src='https://via.placeholder.com/400x300?text=Image+Not+Found'">` : ''}
                <div class="dump-header"><span class="dump-type-badge ${badgeClass}">${dump.type}</span><button class="btn-delete-card" onclick="triggerDeleteDump(${dump.id})">🗑️</button></div>
                <div class="dump-body">${titleHtml}${contentHtml}${dump.type === 'Image' && dump.content ? `<p class="dump-text" style="margin-top:8px;">${dump.content}</p>` : ''}<p style="font-size: 10px; color: var(--border-color); margin-top: 12px; text-align: right;">${dump.date}</p></div>
            </div>`;
    });
}

window.toggleDumpFields = function() {
    const type = document.getElementById('dump-type').value;
    document.getElementById('field-note').style.display = 'none'; document.getElementById('field-link').style.display = 'none'; document.getElementById('field-image').style.display = 'none';
    document.getElementById('label-title').innerText = "Title (Optional)";
    if (type === 'Note') { document.getElementById('field-note').style.display = 'block'; } 
    else if (type === 'Link') { document.getElementById('field-link').style.display = 'block'; document.getElementById('field-note').style.display = 'block'; document.getElementById('label-title').innerText = "Link Title"; } 
    else if (type === 'Image') { document.getElementById('field-image').style.display = 'block'; document.getElementById('field-note').style.display = 'block'; document.getElementById('label-title').innerText = "Caption / Title (Optional)"; }
}

window.openDumpModal = function() {
    document.getElementById('dump-title').value = ''; document.getElementById('dump-content').value = ''; document.getElementById('dump-url').value = ''; document.getElementById('dump-file').value = ''; document.getElementById('dump-type').value = 'Note';
    toggleDumpFields(); openModal('dumpModal');
}

window.saveDump = async function() {
    const btn = document.getElementById('btn-save-dump'), type = document.getElementById('dump-type').value, title = document.getElementById('dump-title').value, content = document.getElementById('dump-content').value, dateStr = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    let finalUrl = '';
    
    if(type === 'Note' && !title && !content) return alert("Isi notesnya dong!");
    if(type === 'Link') { finalUrl = document.getElementById('dump-url').value; if(!finalUrl) return alert("URL Linknya jangan kosong!"); }

    btn.innerText = "Saving..."; btn.disabled = true;

    if(type === 'Image') {
        const fileInput = document.getElementById('dump-file');
        if(!fileInput.files || fileInput.files.length === 0) { alert("Pilih gambarnya dulu coy!"); btn.innerText = "Drop it!"; btn.disabled = false; return; }
        const file = fileInput.files[0], fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
        const { error: uploadError } = await supabaseClient.storage.from('dumps-images').upload(fileName, file);
        if(uploadError) { alert("Gagal upload gambar ke cloud!"); btn.innerText = "Drop it!"; btn.disabled = false; return; }
        finalUrl = supabaseClient.storage.from('dumps-images').getPublicUrl(fileName).data.publicUrl;
    }

    const payload = { type, title, content, url: finalUrl, date: dateStr };
    const { error: dbError } = await supabaseClient.from('dumpspaces').insert([payload]);
    if (dbError) { alert("Gagal simpan ke database!"); btn.innerText = "Drop it!"; btn.disabled = false; return; }

    payload.id = Date.now(); dumps.push(payload); localStorage.setItem('finzen_dumps', JSON.stringify(dumps));
    btn.innerText = "Drop it!"; btn.disabled = false; closeModal('dumpModal'); showToast("Dump saved!"); renderDumps();
}

let confirmAction = null; 
window.customConfirm = function(message, actionCallback) { document.getElementById('confirm-msg').innerText = message; confirmAction = actionCallback; document.getElementById('confirmModal').style.display = 'flex'; }
window.executeConfirm = function() { if(confirmAction) { confirmAction(); confirmAction = null; } closeModal('confirmModal'); }
window.triggerDeleteDump = function(id) {
    customConfirm(`Yakin mau ngebuang dump ini selamanya?`, async () => {
        const { error } = await supabaseClient.from('dumpspaces').delete().eq('id', id);
        if(error) return alert("Gagal hapus dari cloud!");
        dumps = dumps.filter(d => d.id !== id); localStorage.setItem('finzen_dumps', JSON.stringify(dumps)); renderDumps(); showToast("Dump deleted!");
    });
}

window.openModal = function(modalId) { document.getElementById(modalId).style.display = 'flex'; }
window.closeModal = function(modalId) { document.getElementById(modalId).style.display = 'none'; }
window.onclick = function(event) { if (event.target.classList.contains('modal-overlay')) event.target.style.display = "none"; }
window.onload = () => { if(typeof checkAuth === 'function') checkAuth(); renderDumps(); };