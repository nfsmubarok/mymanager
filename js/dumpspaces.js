let dumps = [];
let dumpsLoaded = false;

const dumpTypes = {
    Note: { label: 'Catatan', badge: 'type-note' },
    Link: { label: 'Link', badge: 'type-link' },
    Image: { label: 'Gambar', badge: 'type-image' }
};

// --- TARIK DATA ---
async function fetchCloudDumps() {
    const container = document.getElementById('dumps-container');
    showLoading(container);
    try {
        const user = await getCurrentUser();
        if (!user) return;
        const { data, error } = await supabaseClient.from('dumpspaces').select('*').eq('user_id', user.id);
        if (error) throw error;
        const first = !dumpsLoaded;
        dumpsLoaded = true;
        dumps = data || [];
        renderDumps();
        if (first && window.Motion) Motion.stagger(document.querySelectorAll('#dumps-container .dump-card'));
    } catch (err) {
        console.error('Fetch dumps error:', err);
        showError(container, 'Dumpspace ga kebaca. Cek koneksi lu, terus coba lagi.', fetchCloudDumps);
    }
}

function renderDumps() {
    const container = document.getElementById('dumps-container');
    if (!container) return;
    clearBusy(container);
    if (dumps.length === 0) {
        container.innerHTML = '<div class="empty-state">Masih kosong. Buang link, ide, atau gambar pertama lu ke sini.</div>';
        return;
    }

    dumps.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    container.innerHTML = dumps.map(dump => {
        const type = dumpTypes[dump.type] ? dump.type : 'Note';
        const cfg = dumpTypes[type];
        const url = safeUrl(dump.url);
        const label = dump.title || cfg.label;
        let media = '';
        let body = '';

        if (type === 'Image' && url) {
            media = `<img src="${esc(url)}" alt="${esc(dump.title || dump.content || 'Gambar yang di-dump')}" class="dump-image" width="400" height="300" loading="lazy">`;
        }
        if (type === 'Link' && url) body += `<p class="dump-host num">${esc(new URL(url).hostname)}</p>`;
        if (dump.title) body += `<h2 class="dump-title">${esc(dump.title)}</h2>`;
        if (dump.content) body += `<p class="dump-text${type === 'Note' && dump.content.length > 140 ? ' long' : ''}">${esc(dump.content)}</p>`;
        if (type === 'Link') {
            body += url
                ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="dump-link">Buka link <span class="visually-hidden">(tab baru)</span></a>`
                : '<p class="dump-text">Link-nya ga valid.</p>';
        }

        return `
        <article class="paper dump-card">
            ${media}
            <div class="dump-header">
                <span class="dump-type-badge ${cfg.badge}">${cfg.label}</span>
                ${dump.date ? `<span class="dump-date">${esc(dump.date)}</span>` : ''}
                <button type="button" class="btn-text danger" data-action="dump-delete" data-id="${esc(dump.id)}" aria-label="Hapus ${esc(label)}">Hapus</button>
            </div>
            <div class="dump-body">${body}</div>
        </article>`;
    }).join('');

    // Gambar gagal dimuat: ganti jadi teks (tanpa handler inline)
    container.querySelectorAll('img.dump-image').forEach(img => img.addEventListener('error', () => {
        const p = document.createElement('p');
        p.className = 'state';
        p.textContent = 'Gambar ga bisa dimuat.';
        img.replaceWith(p);
    }, { once: true }));
}

function toggleDumpFields() {
    const type = document.getElementById('dump-type').value;
    document.getElementById('field-link').hidden = type !== 'Link';
    document.getElementById('field-image').hidden = type !== 'Image';
    document.getElementById('label-title').textContent = type === 'Link' ? 'Judul link' : (type === 'Image' ? 'Judul gambar (opsional)' : 'Judul (opsional)');
    document.getElementById('label-content').textContent = type === 'Note' ? 'Isi catatan' : 'Keterangan (opsional)';
}

function openDumpModal() {
    ['dump-title', 'dump-content', 'dump-url', 'dump-file'].forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('dump-type').value = 'Note';
    toggleDumpFields();
    openModal('dumpModal');
}

function setDumpSaving(saving) {
    const btn = document.getElementById('btn-save-dump');
    btn.disabled = saving;
    btn.textContent = saving ? 'Menyimpan...' : 'Simpan';
}

async function saveDump() {
    const type = document.getElementById('dump-type').value;
    const title = document.getElementById('dump-title').value.trim();
    const content = document.getElementById('dump-content').value.trim();
    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    let finalUrl = '';

    if (type === 'Note' && !title && !content) { showToast('Isi catatannya dulu.', true); return; }
    if (type === 'Link') {
        // Input user wajib URL absolut. Tanpa skema, safeUrl bakal nganggep itu path di domain app ini.
        const raw = document.getElementById('dump-url').value.trim();
        finalUrl = /^https?:\/\//i.test(raw) ? safeUrl(raw) : '';
        if (!finalUrl) { showToast('URL-nya harus diawali http:// atau https://.', true); return; }
    }
    const fileInput = document.getElementById('dump-file');
    if (type === 'Image' && (!fileInput.files || fileInput.files.length === 0)) { showToast('Pilih gambarnya dulu.', true); return; }

    setDumpSaving(true);
    const user = await getCurrentUser();

    if (type === 'Image') {
        const file = fileInput.files[0];
        const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
        const { error: uploadError } = await supabaseClient.storage.from('dumps-images').upload(fileName, file);
        if (uploadError) { showToast('Gagal upload gambar.', true); setDumpSaving(false); return; }
        finalUrl = supabaseClient.storage.from('dumps-images').getPublicUrl(fileName).data.publicUrl;
    }

    const payload = { type, title, content, url: finalUrl, date: dateStr, user_id: user ? user.id : null };
    const { data, error } = await supabaseClient.from('dumpspaces').insert([payload]).select();
    setDumpSaving(false);

    if (error) { console.error(error); showToast('Gagal nyimpen ke database.', true); return; }
    if (data && data.length > 0) dumps.push(data[0]);

    closeModal('dumpModal');
    showToast('Tersimpan.');
    renderDumps();
}

function triggerDeleteDump(id) {
    customConfirm('Yakin mau buang dump ini?', async () => {
        const { error } = await supabaseClient.from('dumpspaces').delete().eq('id', id);
        if (error) { console.error('Delete error:', error); showToast('Gagal hapus dump.', true); return; }
        dumps = dumps.filter(d => d.id != id);
        renderDumps();
        showToast('Dump dihapus.');
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    onAction('dumps-container', { 'dump-delete': id => triggerDeleteDump(id) });
    showLoading('dumps-container');
    if (await requireAuth()) fetchCloudDumps();
});
