const STORAGE_KEY = 'attendance_data_v5';
const META_KEY = 'attendance_meta_v5';
const defaultMeta = { class_name: 'Math 101', teacher_name: 'Mr. Johnson', teacher_email: 'johnson@example.com', teacher_phone: '+1234567890' };

let meta = loadMeta();
let currentDate = new Date().toISOString().slice(0, 10);
let currentData = loadDataForDate(currentDate);

function persistDataForDate(date, data) { localStorage.setItem(STORAGE_KEY + '_' + date, JSON.stringify(data)); }
function loadDataForDate(date) { try { const raw = localStorage.getItem(STORAGE_KEY + '_' + date); return raw ? JSON.parse(raw) : []; } catch (e) { return []; } }
function persistMeta() { localStorage.setItem(META_KEY, JSON.stringify(meta)); }
function loadMeta() { try { const raw = localStorage.getItem(META_KEY); return raw ? JSON.parse(raw) : defaultMeta; } catch (e) { return defaultMeta; } }

function updateCurrentDate() { document.getElementById('current-date').textContent = new Date(currentDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }
function applyMetaToUI() { document.getElementById('class-name').textContent = meta.class_name; document.getElementById('teacher-name').textContent = meta.teacher_name; document.getElementById('teacher-email').textContent = meta.teacher_email; document.getElementById('teacher-phone').textContent = meta.teacher_phone; }
function showToast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 3000); }

// Teacher modal
function openTeacherModal() {
  const backdrop = document.createElement('div'); backdrop.className = 'modal-backdrop';
  const modal = document.createElement('div'); modal.className = 'modal';
  modal.innerHTML = `
    <h3 class="text-lg font-bold mb-4">Edit Class & Teacher</h3>
    <label>Class Name</label><input id='modal-class' class='form-input mb-2' value='${meta.class_name}' />
    <label>Teacher Name</label><input id='modal-name' class='form-input mb-2' value='${meta.teacher_name}' />
    <label>Email</label><input id='modal-email' class='form-input mb-2' value='${meta.teacher_email}' />
    <label>Phone</label><input id='modal-phone' class='form-input mb-4' value='${meta.teacher_phone}' />
    <div class="flex justify-end gap-2">
      <button id='modal-save' class='btn btn-primary'>Save</button>
      <button id='modal-cancel' class='btn'>Cancel</button>
    </div>`;
  backdrop.appendChild(modal); document.body.appendChild(backdrop);
  document.getElementById('modal-cancel').onclick = () => backdrop.remove();
  document.getElementById('modal-save').onclick = () => {
    meta.class_name = document.getElementById('modal-class').value || defaultMeta.class_name;
    meta.teacher_name = document.getElementById('modal-name').value || defaultMeta.teacher_name;
    meta.teacher_email = document.getElementById('modal-email').value || defaultMeta.teacher_email;
    meta.teacher_phone = document.getElementById('modal-phone').value || defaultMeta.teacher_phone;
    persistMeta(); applyMetaToUI(); backdrop.remove(); showToast('Teacher info updated');
  };
}

// Student list
function renderStudentList() {
  const container = document.getElementById('student-list');
  container.innerHTML = '';
  if (currentData.length === 0) {
    container.innerHTML = '<div class="empty-state"><h3>No students added yet</h3><p>Add students using the form above</p></div>';
    updateSummary(); return;
  }
  currentData.forEach((s, i) => {
    const div = document.createElement('div');
    div.className = `student-card ${s.status}`;
    div.innerHTML = `<strong>${s.name}</strong>
      <select onchange="changeStatus(${i}, this.value)" class="form-input">
        <option value="present" ${s.status === 'present' ? 'selected' : ''}>Present</option>
        <option value="absent" ${s.status === 'absent' ? 'selected' : ''}>Absent</option>
        <option value="late" ${s.status === 'late' ? 'selected' : ''}>Late</option>
      </select>`;
    container.appendChild(div);
  });
  updateSummary();
}

function changeStatus(index, status) { currentData[index].status = status; persistDataForDate(currentDate, currentData); renderStudentList(); }
function updateSummary() {
  const counts = { present: 0, absent: 0, late: 0 };
  currentData.forEach(s => counts[s.status]++);
  document.getElementById('present-count').textContent = counts.present;
  document.getElementById('absent-count').textContent = counts.absent;
  document.getElementById('late-count').textContent = counts.late;
  document.getElementById('total-count').textContent = currentData.length;
}

function clearTodayAttendance() { if (confirm('Reset attendance for this date?')) { currentData = []; persistDataForDate(currentDate, currentData); renderStudentList(); showToast('Attendance cleared'); } }
function exportAttendance() {
  if (currentData.length === 0) { showToast('No data to export'); return; }
  let csv = 'Name,Status\n';
  currentData.forEach(s => { csv += `${s.name},${s.status}\n`; });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `attendance_${currentDate}.csv`; a.click();
  URL.revokeObjectURL(url); showToast('CSV exported');
}

// Add student
document.getElementById('add-student-form').onsubmit = function (e) {
  e.preventDefault();
  const name = document.getElementById('student-name-input').value.trim();
  if (!name) return;
  currentData.push({ name, status: 'absent' });
  persistDataForDate(currentDate, currentData); renderStudentList();
  document.getElementById('student-name-input').value = ''; showToast(`${name} added`);
}

// Date picker
const dateInput = document.getElementById('attendance-date');
dateInput.value = currentDate;
dateInput.onchange = function () {
  currentDate = this.value;
  currentData = loadDataForDate(currentDate);
  updateCurrentDate();
  renderStudentList();
}

// Duplicate attendance modal
function openDuplicateModal() {
  const backdrop = document.createElement('div'); backdrop.className = 'modal-backdrop';
  const modal = document.createElement('div'); modal.className = 'modal';
  modal.innerHTML = `
    <h3 class="text-lg font-bold mb-4">Duplicate Today's Attendance</h3>
    <label>Select Target Date:</label>
    <input type="date" id="duplicate-date" class="form-input mb-4" />
    <div class="flex justify-end gap-2">
      <button id='duplicate-save' class='btn btn-primary'>Duplicate</button>
      <button id='duplicate-cancel' class='btn'>Cancel</button>
    </div>`;
  backdrop.appendChild(modal); document.body.appendChild(backdrop);
  document.getElementById('duplicate-cancel').onclick = () => backdrop.remove();
  document.getElementById('duplicate-save').onclick = () => {
    const targetDate = document.getElementById('duplicate-date').value;
    if (!targetDate) { alert('Select a date'); return; }
    persistDataForDate(targetDate, JSON.parse(JSON.stringify(currentData)));
    backdrop.remove();
    showToast(`Attendance duplicated to ${targetDate}`);
  };
}

// Initial setup
updateCurrentDate(); applyMetaToUI(); renderStudentList();