let nav = 0;
let editingScheduleId = null;
let selectedDateForNew = null;
let schedules = [];
let tasks = [];
let scheduleLoaded = false;

const priorityLabels = { High: 'Tinggi', Medium: 'Sedang', Low: 'Rendah' };
function prio(p) { return priorityLabels[p] ? p : 'Medium'; }

// "12:20:00" jadi "12:20"
function formatTime(t) {
    if (!t) return '';
    return String(t).split(':').slice(0, 2).join(':');
}

function toDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// --- TARIK DATA (KHUSUS USER LOGIN) ---
async function fetchCloudSchedule() {
    showLoading('upcoming-list');
    showLoading('task-list');
    try {
        const user = await getCurrentUser();
        if (!user) return;

        const [schRes, taskRes] = await Promise.all([
            supabaseClient.from('schedules').select('*').eq('user_id', user.id),
            supabaseClient.from('tasks').select('*').eq('user_id', user.id)
        ]);
        if (schRes.error) throw schRes.error;
        if (taskRes.error) throw taskRes.error;

        schedules = schRes.data || [];
        tasks = taskRes.data || [];
        const first = !scheduleLoaded;
        scheduleLoaded = true;
        renderAll();
        // Load pertama aja: hari yang ada jadwalnya, terus baris hari ini dan tugas, muncul berurutan
        if (first && window.Motion) Motion.stagger(document.querySelectorAll('#calendar-days .day-cell.has-events, #upcoming-list .schedule-item, #task-list .ledger-row'));
    } catch (err) {
        console.error('Fetch schedule error:', err);
        const msg = 'Jadwal ga kebaca. Cek koneksi lu, terus coba lagi.';
        showError('upcoming-list', msg, fetchCloudSchedule);
        showError('task-list', msg, fetchCloudSchedule);
    }
}

function renderAll() { loadCalendar(); renderUpcoming(); renderTasks(); }

// --- KALENDER ---
function loadCalendar() {
    const calendarDays = document.getElementById('calendar-days');
    const monthDisplay = document.getElementById('month-display');
    const dt = new Date();
    dt.setDate(1);
    dt.setMonth(dt.getMonth() + nav);

    const month = dt.getMonth();
    const year = dt.getFullYear();
    monthDisplay.textContent = dt.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const eyebrow = document.getElementById('page-eyebrow');
    if (eyebrow) eyebrow.textContent = 'Jadwal · ' + new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    const paddingDays = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = toDateStr(new Date());

    calendarDays.innerHTML = '';
    for (let i = 0; i < paddingDays; i++) {
        const empty = document.createElement('div');
        empty.className = 'day-cell muted';
        empty.setAttribute('aria-hidden', 'true');
        calendarDays.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = toDateStr(new Date(year, month, day));
        const dayEvents = schedules.filter(sch => sch.date === dateStr);

        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'day-cell' + (dateStr === todayStr ? ' today' : '') + (dayEvents.length ? ' has-events' : '');
        const readable = new Date(year, month, day).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
        cell.setAttribute('aria-label', `${readable}, ${dayEvents.length ? dayEvents.length + ' jadwal' : 'kosong'}`);
        if (dateStr === todayStr) cell.setAttribute('aria-current', 'date');
        cell.addEventListener('click', () => openDailyModal(dateStr));

        const num = document.createElement('span');
        num.className = 'day-number';
        num.textContent = day;
        cell.appendChild(num);

        dayEvents.forEach(event => {
            const pill = document.createElement('span');
            pill.className = 'event-pill prio-' + prio(event.priority);
            pill.textContent = `${formatTime(event.time)} ${event.title}`;
            pill.setAttribute('aria-hidden', 'true');
            cell.appendChild(pill);
        });
        calendarDays.appendChild(cell);
    }
}

function changeMonth(direction) { nav += direction; loadCalendar(); }

function openDailyModal(dateStr) {
    const readable = new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('daily-modal-title').textContent = readable;
    selectedDateForNew = dateStr;
    const listDiv = document.getElementById('daily-schedule-list');

    const dayEvents = schedules.filter(sch => sch.date === dateStr).sort((a, b) => String(a.time).localeCompare(String(b.time)));
    if (dayEvents.length === 0) {
        listDiv.innerHTML = '<div class="empty-state">Kosong nih, belum ada jadwal.</div>';
    } else {
        listDiv.innerHTML = dayEvents.map(event => `
            <div class="schedule-item p-${prio(event.priority)}">
                <div>
                    <p class="schedule-title">${esc(formatTime(event.time))} ${esc(event.title)}</p>
                    <p class="schedule-meta">Prioritas ${priorityLabels[prio(event.priority)].toLowerCase()}</p>
                </div>
                <div class="row-actions">
                    <button type="button" class="btn-text" data-action="schedule-edit" data-id="${esc(event.id)}" aria-label="Edit ${esc(event.title)}">Edit</button>
                    <button type="button" class="btn-text danger" data-action="schedule-delete" data-id="${esc(event.id)}" aria-label="Hapus ${esc(event.title)}">Hapus</button>
                </div>
            </div>`).join('');
    }
    if (!document.getElementById('dailyModal').classList.contains('open')) openModal('dailyModal');
}

function renderUpcoming() {
    const listDiv = document.getElementById('upcoming-list');
    clearBusy(listDiv);
    const todayStr = toDateStr(new Date());
    const todayEvents = schedules.filter(sch => sch.date === todayStr).sort((a, b) => String(a.time).localeCompare(String(b.time)));

    if (todayEvents.length === 0) {
        listDiv.innerHTML = '<div class="empty-state">Hari ini kosong. Santai dulu sambil ngeteh.</div>';
        return;
    }
    listDiv.innerHTML = todayEvents.map(event => `
        <div class="schedule-item p-${prio(event.priority)}">
            <div>
                <p class="schedule-title">${esc(event.title)}</p>
                <p class="schedule-meta">${esc(formatTime(event.time))} · prioritas ${priorityLabels[prio(event.priority)].toLowerCase()}</p>
            </div>
        </div>`).join('');
}

// Stempel 済 di kertas tugas cuma boleh ada selama semua tugas hari ini beres.
// Dipanggil tiap render, jadi nambah/hapus/centang tugas ga bisa ninggalin stempel basi.
function syncTaskSeal() {
    const paper = document.getElementById('task-paper');
    const seal = paper && paper.querySelector(':scope > .hanko-seal');
    if (!seal) return;
    const today = toDateStr(new Date());
    const dueToday = tasks.filter(t => t.deadline === today);
    if (!(dueToday.length > 0 && dueToday.every(t => t.completed))) seal.remove();
}

function renderTasks() {
    const listDiv = document.getElementById('task-list');
    clearBusy(listDiv);
    syncTaskSeal();
    if (tasks.length === 0) {
        listDiv.innerHTML = '<div class="empty-state">Ga ada tugas yang nunggu.</div>';
        return;
    }
    tasks.sort((a, b) => {
        if (a.completed === b.completed) return new Date(a.deadline) - new Date(b.deadline);
        return a.completed ? 1 : -1;
    });

    listDiv.innerHTML = tasks.map(task => {
        const id = esc(task.id);
        const p = prio(task.priority);
        return `
        <div class="ledger-row task-item${task.completed ? ' completed' : ''}">
            <input type="checkbox" class="task-check" id="task-${id}" data-action="task-toggle" data-id="${id}" ${task.completed ? 'checked' : ''}>
            <div class="ledger-main">
                <label class="ledger-title task-title" for="task-${id}">${esc(task.name)}</label>
                <p class="ledger-meta">${task.deadline === toDateStr(new Date()) ? 'Hari ini' : 'Deadline ' + formatDate(task.deadline)} · <span class="priority-tag tag-${p}">${priorityLabels[p]}</span></p>
            </div>
            <button type="button" class="btn-text danger" data-action="task-delete" data-id="${id}" aria-label="Hapus tugas ${esc(task.name)}">Hapus</button>
        </div>`;
    }).join('');
}

// Klik cepat dua kali (Edit A lalu Edit B) cuma boleh ngejalanin klik terakhir
let dailyAction = 0;

async function openAddFromDaily() {
    const mine = ++dailyAction;
    await closeModal('dailyModal');
    if (mine !== dailyAction) return;
    openModal('scheduleModal');
    if (selectedDateForNew) document.getElementById('sch-date').value = selectedDateForNew;
}

async function editSchedule(id) {
    const sch = schedules.find(s => s.id == id);
    if (!sch) return;
    const mine = ++dailyAction;
    await closeModal('dailyModal');
    if (mine !== dailyAction) return;
    editingScheduleId = sch.id;
    openModal('scheduleModal');
    document.getElementById('schedule-modal-title').textContent = 'Edit jadwal';
    document.getElementById('sch-title').value = sch.title;
    document.getElementById('sch-date').value = sch.date;
    document.getElementById('sch-time').value = formatTime(sch.time);
    document.getElementById('sch-priority').value = prio(sch.priority);
}

// --- SIMPAN / HAPUS ---
async function saveSchedule() {
    const title = document.getElementById('sch-title').value.trim();
    const date = document.getElementById('sch-date').value;
    const time = document.getElementById('sch-time').value;
    const priority = document.getElementById('sch-priority').value;

    if (!title || !date || !time) { showToast('Nama, tanggal, dan jam wajib diisi.', true); return; }

    const btn = document.getElementById('btn-save-schedule');
    btn.disabled = true;
    const user = await getCurrentUser();
    const payload = { title, date, time, priority, user_id: user ? user.id : null };

    const { error } = editingScheduleId
        ? await supabaseClient.from('schedules').update(payload).eq('id', editingScheduleId)
        : await supabaseClient.from('schedules').insert([payload]).select();
    btn.disabled = false;

    if (error) { showToast('Gagal nyimpen jadwal.', true); return; }
    showToast('Jadwal tersimpan.');
    closeModal('scheduleModal');
    fetchCloudSchedule();
}

function deleteSchedule(id) {
    const sch = schedules.find(s => s.id == id);
    customConfirm('Yakin mau hapus jadwal ini?', async () => {
        const { error } = await supabaseClient.from('schedules').delete().eq('id', id);
        if (error) { showToast('Gagal hapus jadwal.', true); return; }
        schedules = schedules.filter(s => s.id != id);
        showToast('Jadwal dihapus.');
        renderAll();
        if (sch && document.getElementById('dailyModal').classList.contains('open')) openDailyModal(sch.date);
    });
}

async function saveTask() {
    const name = document.getElementById('task-name').value.trim();
    const deadline = document.getElementById('task-deadline').value;
    const priority = document.getElementById('task-priority').value;

    if (!name || !deadline) { showToast('Nama tugas dan deadline wajib diisi.', true); return; }

    const btn = document.getElementById('btn-save-task');
    btn.disabled = true;
    const user = await getCurrentUser();
    const payload = { name, deadline, priority, completed: false, user_id: user ? user.id : null };
    const { data, error } = await supabaseClient.from('tasks').insert([payload]).select();
    btn.disabled = false;

    if (error) { showToast('Gagal nyimpen tugas.', true); return; }
    if (data && data.length > 0) tasks.push(data[0]);
    showToast('Tugas ditambahin.');
    closeModal('taskModal');
    renderTasks();
}

async function toggleTask(id) {
    const task = tasks.find(t => t.id == id);
    if (!task) return;
    task.completed = !task.completed;
    const { error } = await supabaseClient.from('tasks').update({ completed: task.completed }).eq('id', task.id);
    if (error) {
        task.completed = !task.completed;
        showToast('Gagal update tugas.', true);
    }
    renderTasks();
    const cb = document.getElementById('task-' + task.id);
    if (cb) cb.focus();

    // Stempel 済 pas tugas terakhir yang deadline-nya hari ini baru aja beres
    const today = toDateStr(new Date());
    const dueToday = tasks.filter(t => t.deadline === today);
    const paper = document.getElementById('task-paper');
    const allDone = dueToday.length > 0 && dueToday.every(t => t.completed);
    if (!error && task.completed && task.deadline === today && allDone && window.Motion) Motion.stampHanko(paper);
}

function deleteTask(id) {
    customConfirm('Yakin mau hapus tugas ini?', async () => {
        const { error } = await supabaseClient.from('tasks').delete().eq('id', id);
        if (error) { showToast('Gagal hapus tugas.', true); return; }
        tasks = tasks.filter(t => t.id != id);
        showToast('Tugas dihapus.');
        renderTasks();
    });
}

// --- RESET FORM ---
window.onModalOpen = function(modalId) {
    if (modalId === 'scheduleModal' && !editingScheduleId) {
        document.getElementById('schedule-modal-title').textContent = 'Tambah jadwal';
        document.getElementById('sch-title').value = '';
        document.getElementById('sch-date').value = localDateStr();
        document.getElementById('sch-time').value = '';
        document.getElementById('sch-priority').value = 'Medium';
    }
    if (modalId === 'taskModal') {
        document.getElementById('task-name').value = '';
        document.getElementById('task-deadline').value = localDateStr();
        document.getElementById('task-priority').value = 'Medium';
    }
};
window.onModalClose = function(modalId) {
    if (modalId === 'scheduleModal') editingScheduleId = null;
};

document.addEventListener('DOMContentLoaded', async () => {
    onAction('daily-schedule-list', {
        'schedule-edit': id => editSchedule(id),
        'schedule-delete': id => deleteSchedule(id)
    });
    onAction('task-list', {
        'task-toggle': id => toggleTask(id),
        'task-delete': id => deleteTask(id)
    });
    loadCalendar();
    showLoading('upcoming-list');
    showLoading('task-list');
    if (await requireAuth()) fetchCloudSchedule();
});
