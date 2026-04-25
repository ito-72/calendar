let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;

window.addEventListener('DOMContentLoaded', () => init());

async function init() {
    setupEvents();
    await renderCalendar(currentYear, currentMonth);
}

// 時間解析ロジックの強化版
function timeStringToMinutes(str) {
    if (!str) return null;
    
    // 1. 記号を整理 (コロンや波線を統一)
    const cleanStr = str.replace(/[:：]/g, '').replace(/[～ー]/g, '-');
    
    // 2. 「数字-数字」のパターンを抽出
    const match = cleanStr.match(/(\d{1,4})-(\d{1,4})/);
    if (!match) return null;

    const parseTime = (t) => {
        if (t.length <= 2) {
            // "14" や "9" のような2桁以下の場合は時単位
            return parseInt(t) * 60;
        } else {
            // "730" や "1215" のような3〜4桁の場合
            const h = parseInt(t.slice(0, -2));
            const m = parseInt(t.slice(-2));
            return h * 60 + m;
        }
    };

    return {
        start: parseTime(match[1]),
        end: parseTime(match[2])
    };
}

async function renderCalendar(year, month) {
    const calendarBody = document.getElementById('calendarBody');
    document.getElementById('currentMonth').innerText = `${year}年 ${month}月`;
    calendarBody.innerHTML = '<div style="grid-column:span 7; text-align:center; padding:20px;">読込中...</div>';

    const firstDay = new Date(year, month - 1, 1).getDay();
    const lastDate = new Date(year, month, 0).getDate();
    
    // 当月のデータを取得
    const rows = await fetchMonthData(year, month);
    
    // 月末の計算用に「翌月1日」のデータもこっそり取得（オプション機能）
    let nextMonthFirstRow = null;
    try {
        const nextRows = await fetchMonthData(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1);
        nextMonthFirstRow = nextRows.find(r => parseInt(r[0]) === 1);
    } catch (e) { /* 翌月シートがない場合は無視 */ }

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
                    
                    // 翌日の出社時間を探す（月末なら翌月1日のデータを見る）
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

// --- 以下、showDetail, handleSave, setupEvents は前回のままでOK ---
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
    
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.onclick = () => {
            tab.classList.toggle('active');
            document.body.classList.toggle(`hide-${tab.dataset.target}`, !tab.classList.contains('active'));
        };
    });
}