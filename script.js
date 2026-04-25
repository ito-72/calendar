let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;

window.addEventListener('DOMContentLoaded', () => init());

async function init() {
    document.body.classList.add('hide-chihiro', 'hide-chihiro-task');
    setupEvents();
    await renderCalendar(currentYear, currentMonth);
}

// 時間解析ヘルパー（休息計算用）
function timeStringToMinutes(str) {
    if (!str) return null;
    const cleanStr = str.replace(/[:：]/g, '').replace(/[～ー]/g, '-');
    const match = cleanStr.match(/(\d{1,4})-(\d{1,4})/);
    if (!match) return null;
    const parseTime = (t) => {
        if (t.length <= 2) return parseInt(t) * 60;
        const h = parseInt(t.slice(0, -2));
        const m = parseInt(t.slice(-2));
        return h * 60 + m;
    };
    return { start: parseTime(match[1]), end: parseTime(match[2]) };
}

async function renderCalendar(year, month) {
    const calendarBody = document.getElementById('calendarBody');
    document.getElementById('currentMonth').innerText = `${year}年 ${month}月`;
    calendarBody.innerHTML = '<div style="grid-column:span 7; text-align:center; padding:20px;">読込中...</div>';

    const firstDay = new Date(year, month - 1, 1).getDay();
    const lastDate = new Date(year, month, 0).getDate();
    const rows = await fetchMonthData(year, month);
    
    let nextMonthFirstRow = null;
    try {
        const nextRows = await fetchMonthData(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1);
        nextMonthFirstRow = nextRows.find(r => parseInt(r[0]) === 1);
    } catch (e) {}

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
            let atsushiClass = "";
            let shortText = "";
            if (dayData[2]) {
                if (dayData[2].includes('休')) {
                    atsushiClass = "is-holiday";
                } else {
                    const todayTimes = timeStringToMinutes(dayData[2]);
                    let tomorrowTimes = null;
                    if (date < lastDate) {
                        const nextDayData = rows.find(r => parseInt(r[0]) === date + 1);
                        tomorrowTimes = nextDayData ? timeStringToMinutes(nextDayData[2]) : null;
                    } else {
                        tomorrowTimes = nextMonthFirstRow ? timeStringToMinutes(nextMonthFirstRow[2]) : null;
                    }
                    if (todayTimes && tomorrowTimes) {
                        const restMinutes = (1440 - todayTimes.end) + tomorrowTimes.start;
                        if (restMinutes < 14 * 60) {
                            atsushiClass = "is-short-rest";
                            const diff = (14 * 60 - restMinutes) / 60;
                            shortText = `<span class="short-val">-${diff.toFixed(1)}h</span>`;
                        }
                    }
                }
                cell.innerHTML += `<div class="shift-tag atsushi-tag ${atsushiClass}">${dayData[2]}${shortText}</div>`;
            }
            if (dayData[3]) cell.innerHTML += `<div class="shift-tag atsushi-task-tag">T: ${dayData[3]}</div>`;
            if (dayData[4]) cell.innerHTML += `<div class="shift-tag chihiro-tag">${dayData[4]}</div>`;
            if (dayData[5]) cell.innerHTML += `<div class="shift-tag chihiro-task-tag">T: ${dayData[5]}</div>`;
            if (dayData[6]) cell.innerHTML += `<div class="shift-tag memo-tag">${dayData[6]}</div>`;
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

// 編集用UIを表示するモーダル
function showDetail(date, data) {
    const modal = document.getElementById('detailModal');
    document.getElementById('modalDateTitle').innerText = `${currentMonth}月 ${date}日`;
    
    // 編集セクションを作るヘルパー
    const makeEditField = (title, user, type, currentVal) => `
        <div class="edit-section">
            <label>${title}</label>
            <textarea id="edit-${user}-${type}" rows="2">${currentVal || ''}</textarea>
            <button onclick="handleOverwrite(${date}, '${user}', '${type}')">保存</button>
        </div>
    `;

    document.getElementById('modalDetailBody').innerHTML = `
        <div class="modal-inner-scroll">
            <h4 class="user-label atsushi">篤志の予定</h4>
            ${makeEditField('シフト', 'atsushi', 'shift', data ? data[2] : '')}
            ${makeEditField('タスク', 'atsushi', 'task', data ? data[3] : '')}
            <hr>
            <h4 class="user-label chihiro">千尋の予定</h4>
            ${makeEditField('シフト', 'chihiro', 'shift', data ? data[4] : '')}
            ${makeEditField('タスク', 'chihiro', 'task', data ? data[5] : '')}
        </div>
    `;
    modal.classList.remove('hidden');
}

// 上書き保存処理
window.handleOverwrite = async (day, user, type) => {
    const newVal = document.getElementById(`edit-${user}-${type}`).value;
    const btn = event.target;
    btn.disabled = true;
    btn.innerText = "保存中...";

    const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            mode: "overwrite",
            year: currentYear, month: currentMonth, day: day,
            user: user, type: type, value: newVal
        })
    });
    
    const txt = await res.text();
    if(txt.includes("✅")) {
        btn.innerText = "完了！";
        setTimeout(() => location.reload(), 500);
    } else {
        alert("失敗しました: " + txt);
        btn.disabled = false;
        btn.innerText = "保存";
    }
};

function setupEvents() {
    document.getElementById('prevBtn').onclick = () => { currentMonth--; if(currentMonth<1){currentMonth=12; currentYear--;} renderCalendar(currentYear, currentMonth); };
    document.getElementById('nextBtn').onclick = () => { currentMonth++; if(currentMonth>12){currentMonth=1; currentYear++;} renderCalendar(currentYear, currentMonth); };
    document.getElementById('closeModal').onclick = () => document.getElementById('detailModal').classList.add('hidden');
    
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.onclick = () => {
            tab.classList.toggle('active');
            document.body.classList.toggle(`hide-${tab.dataset.target}`, !tab.classList.contains('active'));
        };
    });
}