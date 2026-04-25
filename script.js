let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;

window.addEventListener('DOMContentLoaded', () => init());

async function init() {
    setupEvents();
    await renderCalendar(currentYear, currentMonth);
}

async function renderCalendar(year, month) {
    const calendarBody = document.getElementById('calendarBody');
    document.getElementById('currentMonth').innerText = `${year}年 ${month}月`;
    calendarBody.innerHTML = '<div style="grid-column:span 7; text-align:center; padding:20px;">読込中...</div>';

    const firstDay = new Date(year, month - 1, 1).getDay();
    const lastDate = new Date(year, month, 0).getDate();
    const rows = await fetchMonthData(year, month);
    calendarBody.innerHTML = '';

    for (let i = 0; i < firstDay; i++) {
        calendarBody.appendChild(Object.assign(document.createElement('div'), {className: 'date-cell empty'}));
    }

    for (let date = 1; date <= lastDate; date++) {
        const cell = document.createElement('div');
        cell.className = 'date-cell';
        if ([0, 6].includes(new Date(year, month - 1, date).getDay())) cell.classList.add('is-weekend');
        if (year === new Date().getFullYear() && month === (new Date().getMonth()+1) && date === new Date().getDate()) cell.classList.add('is-today');

        const dayData = rows.find(r => parseInt(r[0]) === date);
        cell.innerHTML = `<div class="date-num">${date}</div>`;
        
        if (dayData) {
            // 篤志: シフト(2) と タスク(3)
            if (dayData[2]) cell.innerHTML += `<div class="shift-tag atsushi-tag">${dayData[2]}</div>`;
            if (dayData[3]) cell.innerHTML += `<div class="shift-tag atsushi-task-tag">T: ${dayData[3]}</div>`;
            
            // 千尋: シフト(4) と タスク(5)
            if (dayData[4]) cell.innerHTML += `<div class="shift-tag chihiro-tag">${dayData[4]}</div>`;
            if (dayData[5]) cell.innerHTML += `<div class="shift-tag chihiro-task-tag">T: ${dayData[5]}</div>`;
            
            // 備考 (6): 緑色のタグで文字を表示
            if (dayData[6]) {
                cell.innerHTML += `<div class="shift-tag memo-tag">${dayData[6]}</div>`;
            }
        }
        cell.onclick = () => showDetail(date, dayData);
        calendarBody.appendChild(cell);
    }
}

async function fetchMonthData(y, m) {
    const res = await fetch('/api/calendar', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ mode: "getRows", view: "month", year: y, month: m }) });
    const data = await res.json();
    return data.ok ? data.rows : [];
}

function showDetail(date, data) {
    const modal = document.getElementById('detailModal');
    document.getElementById('modalDateTitle').innerText = `${currentMonth}月 ${date}日`;
    document.getElementById('modalDetailBody').innerHTML = `
        <div class="edit-section">
            <p><strong>篤志:</strong> ${data ? data[2] : '-'}</p>
            <input type="text" id="task-atsushi" placeholder="篤志へ追記...">
            <button onclick="handleSave(${date}, 'atsushi')">書込</button>
        </div>
        <hr>
        <div class="edit-section">
            <p><strong>千尋:</strong> ${data ? data[4] : '-'}</p>
            <input type="text" id="task-chihiro" placeholder="千尋へ追記...">
            <button onclick="handleSave(${date}, 'chihiro')">書込</button>
        </div>`;
    modal.classList.remove('hidden');
}

window.handleSave = async (day, user) => {
    const val = document.getElementById(`task-${user}`).value;
    if(!val) return;
    const res = await fetch('/api/calendar', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ year: currentYear, month: currentMonth, day: day, user: user, task: val, mode: "" }) });
    const txt = await res.text();
    if(txt.includes("✅")) { alert("保存完了！"); location.reload(); }
};

function setupEvents() {
    document.getElementById('prevBtn').onclick = () => { currentMonth--; if(currentMonth<1){currentMonth=12; currentYear--;} renderCalendar(currentYear, currentMonth); };
    document.getElementById('nextBtn').onclick = () => { currentMonth++; if(currentMonth>12){currentMonth=1; currentYear++;} renderCalendar(currentYear, currentMonth); };
    document.getElementById('closeModal').onclick = () => document.getElementById('detailModal').classList.add('hidden');
    
    // タブ切り替えロジック
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.onclick = () => {
            tab.classList.toggle('active');
            document.body.classList.toggle(`hide-${tab.dataset.target}`, !tab.classList.contains('active'));
        };
    });
}