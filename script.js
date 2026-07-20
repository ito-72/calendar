let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;

window.addEventListener('DOMContentLoaded', () => init());

async function init() {
    // デフォルトで千尋さんの情報を隠す設定を適用
    document.body.classList.add('hide-chihiro', 'hide-chihiro-task');
    setupEvents();
    await renderCalendar(currentYear, currentMonth);
}

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
    document.getElementById('currentMonth').innerText = `${year}年 ${month}月`;
    
    const cacheKeyCurr = `cal_data_${year}_${month}`;
    const nextY = month === 12 ? year + 1 : year;
    const nextM = month === 12 ? 1 : month + 1;
    const cacheKeyNext = `cal_data_${nextY}_${nextM}`;

    const cachedCurr = localStorage.getItem(cacheKeyCurr);
    const cachedNext = localStorage.getItem(cacheKeyNext);

    // 1. キャッシュがあれば即座に描画（爆速表示）
    if (cachedCurr) {
        const rowsCurr = JSON.parse(cachedCurr);
        const rowsNext = cachedNext ? JSON.parse(cachedNext) : [];
        const nextMonthFirstRow = rowsNext.find(r => parseInt(r[0]) === 1);
        buildCalendarUI(year, month, rowsCurr, nextMonthFirstRow);
    } else {
        const calendarBody = document.getElementById('calendarBody');
        calendarBody.innerHTML = '<div style="grid-column:span 7; text-align:center; padding:20px;">読込中...</div>';
    }

    // 2. 裏で最新データを並列取得 (Promise.all)
    try {
        const [rowsCurr, rowsNext] = await Promise.all([
            fetchMonthData(year, month),
            fetchMonthData(nextY, nextM)
        ]);

        // キャッシュ保存
        localStorage.setItem(cacheKeyCurr, JSON.stringify(rowsCurr));
        localStorage.setItem(cacheKeyNext, JSON.stringify(rowsNext));

        // 最新データで画面を更新
        const nextMonthFirstRow = rowsNext.find(r => parseInt(r[0]) === 1);
        buildCalendarUI(year, month, rowsCurr, nextMonthFirstRow);
    } catch (e) {
        console.error("データ取得エラー:", e);
    }
}

function buildCalendarUI(year, month, rows, nextMonthFirstRow) {
    const calendarBody = document.getElementById('calendarBody');
    calendarBody.innerHTML = '';

    const firstDay = new Date(year, month - 1, 1).getDay();
    const lastDate = new Date(year, month, 0).getDate();

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

function showDetail(date, data) {
    const modal = document.getElementById('detailModal');
    document.getElementById('modalDateTitle').innerText = `${currentMonth}月 ${date}日`;
    document.getElementById('modalDetailBody').innerHTML = `
        <div class="edit-section">
            <p><strong>篤志:</strong> ${data ? data[2] : '-'}</p>
            <input type="text" id="task-atsushi" placeholder="篤志へ追記...">
            <button id="save-atsushi-btn" onclick="handleSave(${date}, 'atsushi')">書込</button>
        </div>
        <hr>
        <div class="edit-section">
            <p><strong>千尋:</strong> ${data ? data[4] : '-'}</p>
            <input type="text" id="task-chihiro" placeholder="千尋へ追記...">
            <button id="save-chihiro-btn" onclick="handleSave(${date}, 'chihiro')">書込</button>
        </div>`;
    modal.classList.remove('hidden');
}

window.handleSave = async (day, user) => {
    const input = document.getElementById(`task-${user}`);
    const btn = document.getElementById(`save-${user}-btn`);
    const val = input.value;
    if(!val) return;

    btn.disabled = true;
    btn.innerText = "保存中...";

    try {
        const res = await fetch('/api/calendar', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ year: currentYear, month: currentMonth, day: day, user: user, task: val, mode: "" }) });
        const txt = await res.text();
        if(txt.includes("✅")) { 
            document.getElementById('detailModal').classList.add('hidden');
            // キャッシュ破棄して画面を再描画（全リロードはしない）
            localStorage.removeItem(`cal_data_${currentYear}_${currentMonth}`);
            await renderCalendar(currentYear, currentMonth);
        } else {
            alert("保存失敗: " + txt);
            btn.disabled = false;
            btn.innerText = "書込";
        }
    } catch(e) {
        alert("エラーが発生しました");
        btn.disabled = false;
        btn.innerText = "書込";
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