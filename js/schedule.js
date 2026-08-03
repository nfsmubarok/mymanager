let nav = 0; 
let editingScheduleId = null;
let selectedDateForNew = null; 
let schedules = JSON.parse(localStorage.getItem('finzen_schedules')) || [];
let tasks = JSON.parse(localStorage.getItem('finzen_tasks')) || [];

const priorityColors = {
    'High': { hex: '#D98C8C', class: 'tag-high' },
    'Medium': { hex: '#7B9095', class: 'tag-medium' },
    'Low': { hex: '#8F9779', class: 'tag-low' }
};

// --- FUNGSI TARIK DATA (USER LOGIN ONLY) ---
async function fetchCloudSchedule() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        const { data: dbSch } = await supabaseClient.from('schedules').select('*').eq('user_id', user.id);
        if (dbSch) {
            schedules = dbSch;
            localStorage.setItem('finzen_schedules', JSON.stringify(schedules));
        }

        const { data: dbTasks } = await supabaseClient.from('tasks').select('*').eq('user_id', user.id);
        if (dbTasks) {
            tasks = dbTasks;
            localStorage.setItem('finzen_tasks', JSON.stringify(tasks));
        }

        loadCalendar(); 
        renderUpcoming(); 
        renderTasks();
    } catch (err) {
        console.error("Fetch Schedule Error:", err);
    }
}

// --- CALENDAR LOGIC ---
window.loadCalendar = function() {
    const calendarDays = document.getElementById('calendar-days');
    const monthDisplay = document.getElementById('month-display');
    const dt = new Date();
    if (nav !== 0) { dt.setMonth(new Date().getMonth() + nav); }
    
    const day = dt.getDate();
    const month = dt.getMonth();
    const year = dt.getFullYear();
    monthDisplay.innerText = dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dateString = firstDayOfMonth.toLocaleDateString('en-US', { weekday: 'short' });
    const paddingDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(dateString);

    calendarDays.innerHTML = '';
    for (let i = 1; i <= paddingDays + daysInMonth; i++) {
        const daySquare = document.createElement('div');
        daySquare.classList.add('day-cell');
        if (i > paddingDays) {
            const currentDay = i - paddingDays;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
            
            daySquare.innerHTML = `<div class="day-number">${currentDay}</div>`;
            daySquare.onclick = () => openDailyModal(dateStr);

            const todayDate = new Date();
            if (currentDay === todayDate.getDate() && month === todayDate.getMonth() && year === todayDate.getFullYear()) {
                daySquare.classList.add('today');
            }

            schedules.filter(sch => sch.date === dateStr).forEach(event => {
                const eventDiv = document.createElement('div');
                eventDiv.classList.add('event-pill');
                eventDiv.style.backgroundColor = priorityColors[event.priority].hex;
                // FORMAT WAKTU DI KALENDER
                eventDiv.innerText = `${event.time.substring(0, 5)} ${event.title}`;
                daySquare.appendChild(eventDiv);
            });
        } else {
            daySquare.classList.add('muted');
        }
        calendarDays.appendChild(daySquare);
    }
}

window.changeMonth = function(direction) { nav += direction; loadCalendar(); }

window.openDailyModal = function(dateStr) {
    document.getElementById('daily-modal-title').innerText = `Schedule: ${dateStr}`;
    selectedDateForNew = dateStr;
    const listDiv = document.getElementById('daily-schedule-list');
    listDiv.innerHTML = '';
    
    let dayEvents = schedules.filter(sch => sch.date === dateStr).sort((a,b) => a.time.localeCompare(b.time));
    if(dayEvents.length === 0) { listDiv.innerHTML = '<div class="empty-state">Kosong nih, gaada jadwal.</div>'; } 
    else {
        dayEvents.forEach(event => {
            const pColor = priorityColors[event.priority].hex;
            listDiv.innerHTML += `
                <div style="border-left: 3px solid ${pColor}; padding: 12px; background: #fafaf9; border-radius: 0 8px 8px 0; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <div><p style="font-weight: 600; font-size: 14px; color: var(--text-dark);">${event.time.substring(0, 5)} - ${event.title}</p></div>
                    <div style="display:flex; gap:10px;">
                        <button onclick="editSchedule('${event.id}')" style="background:none; border:1px solid var(--border-color); border-radius: 4px; padding: 4px; cursor:pointer;">✏️</button>
                        <button onclick="deleteSchedule('${event.id}', '${dateStr}')" style="background:none; border:1px solid var(--border-color); border-radius: 4px; padding: 4px; cursor:pointer;">🗑️</button>
                    </div>
                </div>`;
        });
    }
    document.getElementById('dailyModal').style.display = 'flex';
}

window.renderUpcoming = function() {
    const listDiv = document.getElementById('upcoming-list');
    listDiv.innerHTML = '';
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    let todayEvents = schedules.filter(sch => sch.date === todayStr).sort((a, b) => a.time.localeCompare(b.time));

    if (todayEvents.length === 0) { listDiv.innerHTML = '<div class="empty-state">No schedule for today. Relax! 🍵</div>'; } 
    else {
        todayEvents.forEach(event => {
            const pColor = priorityColors[event.priority].hex;
            // FORMAT WAKTU DI DAFTAR UPCOMING
            listDiv.innerHTML += `<div class="schedule-item" style="border-color: ${pColor};"><div style="display: flex; justify-content: space-between;"><div><p style="font-weight: 700; font-size: 14px;">${event.title}</p><p style="font-size: 12px; color: ${pColor};">${event.priority} Priority • ${event.time.substring(0, 5)}</p></div></div></div>`;
        });
    }
}

window.renderTasks = function() {
    const listDiv = document.getElementById('task-list');
    listDiv.innerHTML = '';
    if (tasks.length === 0) { listDiv.innerHTML = '<div class="empty-state">No tasks pending.</div>'; return; }
    tasks.sort((a, b) => {
        if(a.completed === b.completed) return new Date(a.deadline) - new Date(b.deadline);
        return a.completed ? 1 : -1;
    });

    tasks.forEach(task => {
        const checkedStr = task.completed ? 'checked' : '';
        const itemClass = task.completed ? 'task-item completed' : 'task-item';
        listDiv.innerHTML += `<div class="${itemClass}"><input type="checkbox" class="task-checkbox" ${checkedStr} onchange="toggleTask('${task.id}')"><div class="task-content"><div style="display:flex; justify-content:space-between;"><p class="task-title">${task.name}</p></div><div style="display:flex; justify-content:space-between; align-items:center;"><p style="font-size: 11px;">Deadline: ${task.deadline}</p><button onclick="deleteTask('${task.id}')" style="background:none; border:none; cursor:pointer;">🗑️</button></div></div></div>`;
    });
}

window.openAddFromDaily = function() { closeModal('dailyModal'); openModal('scheduleModal'); if(selectedDateForNew) { document.getElementById('sch-date').value = selectedDateForNew; } }

window.editSchedule = function(id) {
    let sch = schedules.find(s => s.id == id);
    if(sch) {
        editingScheduleId = id; 
        document.getElementById('schedule-modal-title').innerText = "Edit Schedule";
        document.getElementById('sch-title').value = sch.title; 
        document.getElementById('sch-date').value = sch.date;
        // FORMAT WAKTU PAS MAU DIEDIT BIAR GA ERROR DI INPUT
        document.getElementById('sch-time').value = sch.time.substring(0, 5); 
        document.getElementById('sch-priority').value = sch.priority;
        closeModal('dailyModal'); document.getElementById('scheduleModal').style.display = 'flex';
    }
}

// --- CLOUD SAVE / DELETE ACTIONS ---
window.saveSchedule = async function() {
    const title = document.getElementById('sch-title').value;
    const date = document.getElementById('sch-date').value;
    const time = document.getElementById('sch-time').value;
    const priority = document.getElementById('sch-priority').value;

    if(!title || !date || !time) return alert("Isi lengkap datanya!");

    const { data: { user } } = await supabaseClient.auth.getUser();
    const payload = { title, date, time, priority, user_id: user ? user.id : null };

    if(editingScheduleId) {
        const { error } = await supabaseClient.from('schedules').update(payload).eq('id', editingScheduleId);
        if (error) return alert("Gagal update schedule!");
        editingScheduleId = null; 
    } else {
        const { data: dbData, error } = await supabaseClient.from('schedules').insert([payload]).select();
        if (error) return alert("Gagal simpan schedule!");
        if (dbData && dbData.length > 0) schedules.push(dbData[0]);
    }
    
    localStorage.setItem('finzen_schedules', JSON.stringify(schedules));
    closeModal('scheduleModal'); 
    fetchCloudSchedule();
}

window.deleteSchedule = function(id, dateStr = null) {
    if(confirm('Yakin mau hapus?')) {
        supabaseClient.from('schedules').delete().eq('id', id).then(({error}) => {
            if (error) return alert("Gagal hapus dari cloud!");
            schedules = schedules.filter(s => s.id != id);
            localStorage.setItem('finzen_schedules', JSON.stringify(schedules));
            loadCalendar(); renderUpcoming(); if(dateStr) openDailyModal(dateStr);
        });
    }
}

window.saveTask = async function() {
    const name = document.getElementById('task-name').value;
    const deadline = document.getElementById('task-deadline').value;
    const priority = document.getElementById('task-priority').value;

    if(!name || !deadline) return alert("Nama task dan deadline harus diisi!");

    const { data: { user } } = await supabaseClient.auth.getUser();
    const payload = { name, deadline, priority, completed: false, user_id: user ? user.id : null };

    const { data: dbData, error } = await supabaseClient.from('tasks').insert([payload]).select();
    if (error) return alert("Gagal simpan task!");
    if (dbData && dbData.length > 0) tasks.push(dbData[0]);

    localStorage.setItem('finzen_tasks', JSON.stringify(tasks));
    closeModal('taskModal'); 
    renderTasks();
}

window.toggleTask = async function(id) { 
    let task = tasks.find(t => t.id == id); 
    if(task) { 
        task.completed = !task.completed; 
        await supabaseClient.from('tasks').update({ completed: task.completed }).eq('id', id);
        localStorage.setItem('finzen_tasks', JSON.stringify(tasks)); 
        renderTasks(); 
    } 
}

window.deleteTask = async function(id) { 
    const { error } = await supabaseClient.from('tasks').delete().eq('id', id);
    if (error) return alert("Gagal hapus task!");
    tasks = tasks.filter(t => t.id != id); 
    localStorage.setItem('finzen_tasks', JSON.stringify(tasks)); 
    renderTasks(); 
}

// UI UTILS
window.openModal = function(modalId) { 
    if(modalId === 'scheduleModal' && !editingScheduleId) {
        document.getElementById('schedule-modal-title').innerText = "Add Schedule";
        document.getElementById('sch-title').value = ''; document.getElementById('sch-date').valueAsDate = new Date(); document.getElementById('sch-time').value = '';
    }
    if(modalId === 'taskModal') { document.getElementById('task-name').value = ''; document.getElementById('task-deadline').valueAsDate = new Date(); }
    document.getElementById(modalId).style.display = 'flex'; 
}
window.closeModal = function(modalId) { document.getElementById(modalId).style.display = 'none'; if(modalId === 'scheduleModal') editingScheduleId = null; }
window.onclick = function(event) { if (event.target.classList.contains('modal-overlay')) { event.target.style.display = "none"; editingScheduleId = null; } }

window.onload = () => { if(typeof checkAuth === 'function') checkAuth(); fetchCloudSchedule(); };