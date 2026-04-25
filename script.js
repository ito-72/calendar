// 状態管理（初期値は今日の日付）
const now = new Date();
let currentYear = now.getFullYear();
let currentMonth = now.getMonth() + 1; // JSは0-11なので+1

// 起動時の処理
window.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {
    setupEvents();
    await renderCalendar(currentYear, currentMonth);
}

// カレンダーを描画するメイン関数
async function renderCalendar(year, month) {
    const calendarBody = document.getElementById('calendarBody');
    const monthDisplay = document.getElementById('currentMonth');
    
    // 表示の更新
    monthDisplay.innerText = `${year}年 ${month}月`;
    calendarBody.innerHTML = '<div class="loading">読み込み中...</div>';

    // 1日の曜日(0:日〜6:土)と、その月の最終日(28〜31)を計算
    const firstDay = new Date(year, month - 1, 1).getDay();
    const lastDate = new Date(year, month, 0).getDate();

    // --- データの取得 ---
    const spreadsheetData = await fetchMonthData();
    calendarBody.innerHTML = ''; // ローディング表示を消去

    // --- 前月の空白セルを追加 ---
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'date-cell empty';
        calendarBody.appendChild(empty);
    }

    // --- 日付セルの生成 (1日 〜 末日) ---
    for (let date = 1; date <= lastDate; date++) {
        const cell = document.createElement('div');
        cell.className = 'date-cell';
        
        // 土日の判定（背景色用）
        const dow = new Date(year, month - 1, date).getDay();
        if (dow === 0 || dow === 6) {
            cell.classList.add('is-weekend');
        }

        // 今日の判定（枠線用）
        if (year === now.getFullYear() && month === (now.getMonth() + 1) && date === now.getDate()) {
            cell.classList.add('is-today');
        }

        // --- データの流し込み ---
        // スプレッドシートの行を探す（A列の日付が一致するもの）
        const dayData = spreadsheetData.find(row => parseInt(row[0]) === date);

        let contentHtml = `<div class="date-num">${date}</div>`;
        
        if (dayData) {
            // 篤志さん (C列=Index 2)
            if (dayData[2]) {
                contentHtml += `<div class="shift-tag atsushi-tag">${dayData[2]}</div>`;
            }
            // 千尋さん (E列=Index 4)
            if (dayData[4]) {
                contentHtml += `<div class="shift-tag chihiro-tag">${dayData[4]}</div>`;
            }
            // 備考やTaskがある場合は「●」を表示
            if (dayData[3] || dayData[5] || dayData[6]) {
                contentHtml += `<div class="memo-dot">●</div>`;
            }
        }

        cell.innerHTML = contentHtml;
        
        // タップイベント
        cell.onclick = () => showDetail(date, dayData);
        
        calendarBody.appendChild(cell);
    }
}

// 詳細表示（モーダル）
function showDetail(date, data) {
    const modal = document.getElementById('detailModal');
    const title = document.getElementById('modalDateTitle');
    const body = document.getElementById('modalDetailBody');
    
    title.innerText = `${currentMonth}月 ${date}日`;
    
    if (data) {
        body.innerHTML = `
            <div class="detail-item">
                <span class="label atsushi">篤志</span>
                <div class="val">${data[2] || 'なし'}<br><small>${data[3] || ''}</small></div>
            </div>
            <div class="detail-item">
                <span class="label chihiro">千尋</span>
                <div class="val">${data[4] || 'なし'}<br><small>${data[5] || ''}</small></div>
            </div>
            <div class="detail-item memo">
                <span class="label">備考</span>
                <div class="val">${data[6] || 'なし'}</div>
            </div>
        `;
    } else {
        body.innerHTML = '<p>予定はありません</p>';
    }
    
    modal.classList.remove('hidden');
}

// APIからデータを取ってくる関数
async function fetchMonthData() {
    try {
        const response = await fetch('/api/calendar');
        if (!response.ok) throw new Error('Network error');
        return await response.json();
    } catch (e) {
        console.error("データ取得失敗:", e);
        return []; // 失敗時は空配列を返す
    }
}

// ボタンなどのイベント設定
function setupEvents() {
    // 前の月へ
    document.getElementById('prevBtn').onclick = async () => {
        currentMonth--;
        if (currentMonth < 1) {
            currentMonth = 12;
            currentYear--;
        }
        await renderCalendar(currentYear, currentMonth);
    };

    // 次の月へ
    document.getElementById('nextBtn').onclick = async () => {
        currentMonth++;
        if (currentMonth > 12) {
            currentMonth = 1;
            currentYear++;
        }
        await renderCalendar(currentYear, currentMonth);
    };

    // モーダルを閉じる
    document.getElementById('closeModal').onclick = () => {
        document.getElementById('detailModal').classList.add('hidden');
    };

    // モーダルの外側をタップしても閉じるようにする
    document.getElementById('detailModal').onclick = (e) => {
        if (e.target.id === 'detailModal') {
            document.getElementById('detailModal').classList.add('hidden');
        }
    };
}