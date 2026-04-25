let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;

window.addEventListener('DOMContentLoaded', () => init());

async function init() {
    setupEvents();
    await renderCalendar(currentYear, currentMonth);
}

async function renderCalendar(year, month) {
    const calendarBody = document.getElementById('calendarBody');
    const monthDisplay = document.getElementById('currentMonth');
    if (monthDisplay) monthDisplay.innerText = `${year}年 ${month}月`;
    
    calendarBody.innerHTML = '<div style="grid-column:span 7; text-align:center; padding:20px;">読込中...</div>';

    const firstDay = new Date(year, month - 1, 1).getDay();
    const lastDate = new Date(year, month, 0).getDate();

    // データの取得
    const rows = await fetchMonthData(year, month);
    calendarBody.innerHTML = '';

    // 空白セル
    for (let i = 0; i < firstDay; i++) {
        calendarBody.appendChild(Object.assign(document.createElement('div'), {className: 'date-cell empty'}));
    }

    // 日付セル
    for (let date = 1; date <= lastDate; date++) {
        const cell = document.createElement('div');
        cell.className = 'date-cell';
        const dow = new Date(year, month - 1, date).getDay();
        if (dow === 0 || dow === 6) cell.classList.add('is-weekend');

        // 今日のハイライト
        const today = new Date();
        if (year === today.getFullYear() && month === (today.getMonth() + 1) && date === today.getDate()) {
            cell.classList.add('is-today');
        }

        const dayData = rows.find(r => parseInt(r[0]) === date);
        cell.innerHTML = `<div class="date-num">${date}</div>`;
        
        if (dayData) {
            // スプレッドシートの列に合わせて表示
            if (dayData[2]) cell.innerHTML += `<div class="shift-tag atsushi-tag">${dayData[2]}</div>`;
            if (dayData[4]) cell.innerHTML += `<div class="shift-tag chihiro-tag">${dayData[4]}</div>`;
            if (dayData[6]) cell.innerHTML += `<div class="memo-dot">●</div>`;
        }

        cell.onclick = () => showDetail(date, dayData);
        calendarBody.appendChild(cell);
    }
}

// 読み取り（1つに統合しました！）
async function fetchMonthData(y, m) {
    try {
        const res = await fetch('/api/calendar', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ mode: "getRows", view: "month", year: y, month: m })
        });
        const data = await res.json();
        console.log("GASから届いたデータ:", data); // ブラウザのF12コンソールで確認用
        return data.ok ? data.rows : [];
    } catch (e) {
        console.error("データ取得エラー:", e);
        return [];
    }
}

function showDetail(date, data) {
    const modal = document.getElementById('detailModal');
    const body = document.getElementById('modalDetailBody');
    document.getElementById('modalDateTitle').innerText = `${currentMonth}月 ${date}日`;

    body.innerHTML = `
        <div class="edit-section">
            <p><strong>篤志:</strong> ${data ? data[2] : '-'}</p>
            <div style="font-size:0.8rem; color:#888; margin-bottom:5px;">${data && data[3] ? '現在: ' + data[3] : ''}</div>
            <input type="text" id="task-atsushi" placeholder="篤志Taskを追記...">
            <button onclick="handleSave(${date}, 'atsushi')">篤志へ書込</button>
        </div>
        <hr>
        <div class="edit-section">
            <p><strong>千尋:</strong> ${data ? data[4] : '-'}</p>
            <div style="font-size:0.8rem; color:#888; margin-bottom:5px;">${data && data[5] ? '現在: ' + data[5] : ''}</div>
            <input type="text" id="task-chihiro" placeholder="千尋Taskを追記...">
            <button onclick="handleSave(${date}, 'chihiro')">千尋へ書込</button>
        </div>
    `;
    modal.classList.remove('hidden');
}

window.handleSave = async (day, user) => {
    const val = document.getElementById(`task-${user}`).value;
    if(!val) return;
    
    // 保存ボタンを一時的に無効化（連打防止）
    const btn = event.target;
    btn.disabled = true;
    btn.innerText = "保存中...";

    try {
        const res = await fetch('/api/calendar', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                year: currentYear, 
                month: currentMonth, 
                day: day, 
                user: user, 
                task: val, 
                mode: "" 
            })
        });
        const txt = await res.text();
        if(txt.includes("✅")) {
            alert("保存完了！");
            location.reload();
        } else {
            alert("保存に失敗しました: " + txt);
            btn.disabled = false;
            btn.innerText = user + "へ書込";
        }
    } catch (e) {
        alert("通信エラーが発生しました");
        btn.disabled = false;
    }
};

function setupEvents() {
    document.getElementById('prevBtn').onclick = () => { 
        currentMonth--; 
        if(currentMonth < 1){ currentMonth = 12; currentYear--; } 
        renderCalendar(currentYear, currentMonth); 
    };
    document.getElementById('nextBtn').onclick = () => { 
        currentMonth++; 
        if(currentMonth > 12){ currentMonth = 1; currentYear++; } 
        renderCalendar(currentYear, currentMonth); 
    };
    document.getElementById('closeModal').onclick = () => {
        document.getElementById('detailModal').classList.add('hidden');
    };
    // モーダル外タップで閉じる
    window.onclick = (event) => {
        const modal = document.getElementById('detailModal');
        if (event.target == modal) modal.classList.add('hidden');
    };
}
