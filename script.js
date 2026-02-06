let myChart = null, myBarChart = null;

// --- ส่วนที่เพิ่ม: เช็คการเปลี่ยนปีเพื่อรีเซ็ตค่า ---
const currentSystemYear = new Date().getFullYear().toString();
let lastActiveYear = localStorage.getItem('mie_active_year');

// Initial Data Loading with Safety Checks
let history = [];
try {
    history = JSON.parse(localStorage.getItem('mie_history')) || [];
} catch (e) {
    history = [];
    console.error("Error loading history", e);
}

let categoryTotals = JSON.parse(localStorage.getItem('mie_totals')) || [0, 0, 0, 0, 0];
let income = parseFloat(localStorage.getItem('mie_income')) || 0;

// Logic: ถ้าเป็นปีใหม่ ให้รีเซ็ตยอดรายรับและยอดสรุปหมวดหมู่ (แต่เก็บ History ไว้)
if (lastActiveYear && lastActiveYear !== currentSystemYear) {
    income = 0;
    categoryTotals = [0, 0, 0, 0, 0];
    localStorage.setItem('mie_income', income);
    localStorage.setItem('mie_totals', JSON.stringify(categoryTotals));
}
// อัปเดตปีล่าสุดใน Storage
localStorage.setItem('mie_active_year', currentSystemYear);

let userName = localStorage.getItem('mie_user_name') || "คุณลูกค้า";
let budget = parseFloat(localStorage.getItem('mie_budget')) || 0;
let profilePic = localStorage.getItem('mie_profile_pic') || "https://files.catbox.moe/g7v3o5.png";

// Palette Themes
const colors = ['#7F63F4', '#FFC75F', '#FF9671', '#FF6F91', '#2C73D2'];
const catIcons = ['fast-food', 'car', 'shirt', 'flash', 'gift']; 
const labels = ['อาหาร', 'เดินทาง', 'ช้อปปิ้ง', 'บิล/น้ำไฟ', 'อื่นๆ'];
const monthLabels = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function updateUI() {
    const totalSpent = categoryTotals.reduce((a, b) => a + b, 0);
    const balance = income - totalSpent;

    const statusArea = document.getElementById('status-area');
    if (statusArea) {
        statusArea.innerHTML = `
            <div class="balance-card-modern">
                <div class="balance-info">
                    <h4>ยอดเงินคงเหลือ</h4>
                    <h1>฿${balance.toLocaleString()}</h1>
                </div>
                <div class="balance-mini">
                    <div class="mini-item inc"><span>รายรับ</span><strong>+${income.toLocaleString()}</strong></div>
                    <div class="mini-item exp"><span>รายจ่าย</span><strong>-${totalSpent.toLocaleString()}</strong></div>
                </div>
            </div>`;
    }

    const headerUsername = document.getElementById('header-username');
    if (headerUsername) headerUsername.innerText = userName;

    // --- Doughnut Chart ---
    const ctx = document.getElementById('myChart');
    if (ctx) {
        if (myChart) myChart.destroy();
        myChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: categoryTotals,
                    backgroundColor: colors,
                    borderWidth: 3,
                    borderColor: '#ffffff',
                    hoverOffset: 20
                }]
            },
            plugins: [ChartDataLabels],
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '75%',
                layout: { padding: 25 },
                plugins: {
                    legend: { 
                        position: 'bottom', 
                        labels: { 
                            usePointStyle: true, 
                            padding: 25, 
                            font: { family: 'Kanit', size: 14, weight: '500' },
                            color: '#2d3436' 
                        } 
                    },
                    datalabels: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleFont: { family: 'Kanit', size: 14 },
                        bodyFont: { family: 'Kanit', size: 14 },
                        cornerRadius: 12, padding: 12, displayColors: false
                    }
                }
            }
        });
    }

    // --- Transaction List ---
    const itemList = document.getElementById('item-list');
    if (itemList) {
        if(history.length === 0) {
            itemList.innerHTML = `<div style="text-align:center; color:#b2bec3; padding:40px;">ยังไม่มีรายการใหม่</div>`;
        } else {
            const displayList = history.map((item, index) => ({ ...item, originalIndex: index })).slice(-5).reverse();
            itemList.innerHTML = displayList.map((item, i) => {
                const safeCatIndex = (item.catIndex >= 0 && item.catIndex < catIcons.length) ? item.catIndex : 4;
                const iconName = item.catIndex >= 0 ? catIcons[safeCatIndex] : 'cash-outline';
                const color = item.catIndex >= 0 ? colors[safeCatIndex] : '#00b894';
                
                return `
                <div class="trans-item" style="animation-delay: ${i * 0.05}s">
                    <div class="trans-left">
                        <div class="trans-icon" style="background:${color}"><ion-icon name="${iconName}"></ion-icon></div>
                        <div class="trans-info"><h5>${item.name}</h5><p>${item.date}</p></div>
                    </div>
                    <div class="trans-right">
                        <span class="trans-amount ${item.type}">${item.type === 'income' ? '+' : '-'}${parseFloat(item.amount).toLocaleString()}</span>
                        <button class="btn-delete-mini" onclick="deleteItem(${item.originalIndex})"><ion-icon name="trash-outline"></ion-icon></button>
                    </div>
                </div>`;
            }).join('');
        }
    }
    updateSummary(totalSpent);
    updateProfileUI();
}

function updateSummary(totalSpent) {
    let monthlyExpenses = new Array(12).fill(0);
    history.forEach(item => {
        const mIndex = (typeof item.monthIndex !== 'undefined') ? item.monthIndex : new Date().getMonth(); 
        // กรองเฉพาะรายการที่เป็นปีปัจจุบันเพื่อมาแสดงในกราฟแท่ง
        const currentYearNum = new Date().getFullYear();
        if(item.type === 'expense' && (item.year === currentYearNum || !item.year)) {
            monthlyExpenses[mIndex] += parseFloat(item.amount);
        }
    });

    const ctxBar = document.getElementById('barChart');
    if(ctxBar) {
        const ctx = ctxBar.getContext('2d');
        let gradientBg = '#8e2de2'; 
        try {
            gradientBg = ctx.createLinearGradient(0, 0, 0, 400);
            gradientBg.addColorStop(0, '#8e2de2');
            gradientBg.addColorStop(1, '#ff6f91');
        } catch(e) { console.log('Canvas context not ready for gradient'); }

        if(myBarChart) myBarChart.destroy();
        myBarChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthLabels,
                datasets: [{ 
                    label: 'รายจ่าย',
                    data: monthlyExpenses, 
                    backgroundColor: gradientBg, 
                    borderRadius: 4, 
                    borderSkipped: false,
                    barThickness: 'flex',
                    maxBarThickness: 30,
                    hoverBackgroundColor: gradientBg,
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                layout: { padding: { top: 20, bottom: 10, left: 10, right: 10 } },
                scales: { 
                    x: { grid: { display: false }, ticks: { font: { family: 'Kanit', size: 11 }, color: '#b2bec3' } }, 
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)', borderDash: [5, 5] }, ticks: { font: { family: 'Kanit', size: 11 }, color: '#b2bec3' } } 
                },
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleFont: { family: 'Kanit', size: 13 },
                        bodyFont: { family: 'Kanit', size: 13 },
                        cornerRadius: 10, displayColors: false,
                        callbacks: { label: function(c) { return ' ฿' + c.parsed.y.toLocaleString(); } }
                    }
                },
                onClick: (e) => {
                    let breakdownText = "";
                    labels.forEach((label, i) => {
                        const amt = categoryTotals[i];
                        const pct = totalSpent > 0 ? ((amt / totalSpent) * 100).toFixed(1) : 0;
                        breakdownText += `\n- ${label}: ฿${amt.toLocaleString()} (${pct}%)`;
                    });
                    const remaining = budget - totalSpent;
                    const statusMsg = remaining >= 0 ? "✅ ยังอยู่ในงบ" : "⚠️ เกินงบแล้ว";
                    alert(`📊 สรุปภาพรวมรายจ่าย (${currentSystemYear})\n-----------------------------\n💰 งบประมาณ: ฿${budget.toLocaleString()}\n💸 ใช้ไปแล้ว: ฿${totalSpent.toLocaleString()}\n-----------------------------\nแยกตามหมวดหมู่:${breakdownText}\n-----------------------------\nคงเหลือ: ฿${remaining.toLocaleString()}\n(${statusMsg})`);
                }
            }
        });
    }
    
    const sumDiv = document.getElementById('monthly-summary');
    if(sumDiv) {
        const percent = budget > 0 ? (totalSpent / budget * 100).toFixed(0) : 0;
        const widthPercent = Math.min(percent, 100);
        sumDiv.innerHTML = `
            <div style="background:white; padding:25px; border-radius:25px; box-shadow:0 10px 30px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; margin-bottom:12px; align-items:center;">
                    <span style="color:#636e72; font-weight:500;">ใช้จ่ายไปแล้ว (${currentSystemYear})</span>
                    <strong style="font-size:20px; color:var(--primary-color);">${percent}%</strong>
                </div>
                <div style="height:12px; background:#f1f2f6; border-radius:6px; overflow:hidden;">
                    <div style="width:${widthPercent}%; height:100%; background:linear-gradient(90deg, var(--primary-color), #ff6f91); border-radius:6px; transition: width 1s ease-in-out;"></div>
                </div>
                <p style="margin-top:15px; font-size:14px; color:#b2bec3; text-align:right;">งบประมาณคงเหลือ <strong style="color:#2d3436;">฿${(budget - totalSpent).toLocaleString()}</strong></p>
            </div>
        `;
    }
}

function saveData() {
    const name = document.getElementById('itemName').value;
    const amount = parseFloat(document.getElementById('itemAmount').value);
    const type = document.getElementById('itemType').value;
    const cat = parseInt(document.getElementById('itemCategory').value);

    if (name && !isNaN(amount) && amount > 0) {
        const d = new Date();
        const monthIdx = d.getMonth();
        const year = d.getFullYear(); // เก็บปีปัจจุบัน
        const dateStr = `${d.getDate()} ${monthLabels[monthIdx]}`;
        
        if (type === 'expense') { 
            if (!categoryTotals[cat]) categoryTotals[cat] = 0;
            categoryTotals[cat] += amount; 
        } else { 
            income += amount; 
        }

        history.push({ 
            name, amount, date: dateStr, type, 
            catIndex: type === 'expense' ? cat : -1,
            monthIndex: monthIdx,
            year: year // เพิ่ม Property ปีเข้าไปในรายการ
        });
        
        localStorage.setItem('mie_history', JSON.stringify(history));
        localStorage.setItem('mie_totals', JSON.stringify(categoryTotals));
        localStorage.setItem('mie_income', income);
        localStorage.setItem('mie_active_year', year.toString()); // อัปเดตปีล่าสุดที่บันทึก
        
        document.getElementById('itemName').value = '';
        document.getElementById('itemAmount').value = '';
        closeModal();
        updateUI();
        changePage('home');
    } else {
        alert("กรุณากรอกข้อมูลให้ครบถ้วน");
    }
}

function deleteItem(index) {
    if(confirm("ต้องการลบรายการนี้ใช่ไหม?")) {
        const item = history[index];
        if (item.type === 'expense') {
            if(item.catIndex >= 0 && categoryTotals[item.catIndex] !== undefined) {
                categoryTotals[item.catIndex] = Math.max(0, categoryTotals[item.catIndex] - item.amount);
            }
        } else { 
            income -= item.amount; 
        }
        
        history.splice(index, 1);
        localStorage.setItem('mie_history', JSON.stringify(history));
        localStorage.setItem('mie_totals', JSON.stringify(categoryTotals));
        localStorage.setItem('mie_income', income);
        updateUI();
    }
}

function changePage(pageId) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    
    const targetPage = document.getElementById(pageId + '-page');
    if(targetPage) {
        targetPage.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    document.querySelectorAll('.nav-btn').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-btn[onclick*="${pageId}"]`)?.classList.add('active');
    
    if(pageId === 'home' || pageId === 'summary') updateUI();
}

function openModal(type) {
    document.getElementById('itemType').value = type;
    document.getElementById('modalTitle').innerText = type === 'expense' ? 'รายจ่ายใหม่' : 'รายรับใหม่';
    const catWrapper = document.getElementById('category-wrapper');
    const catGrid = document.querySelector('.category-grid');
    
    if(type === 'expense') {
        catWrapper.style.display = 'block';
        catGrid.innerHTML = labels.map((l, i) => 
            `<div class="cat-chip ${i === 0 ? 'selected' : ''}" onclick="selectCat(this, ${i})">${l}</div>`
        ).join('');
        document.getElementById('itemCategory').value = 0;
    } else { 
        catWrapper.style.display = 'none'; 
    }
    document.getElementById('addModal').style.display = 'flex';
}

function selectCat(el, index) {
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById('itemCategory').value = index;
}

function closeModal() { document.getElementById('addModal').style.display = 'none'; }

function updateProfileUI() {
    const displayName = document.getElementById('display-name');
    const showIncome = document.getElementById('show-income');
    const showBudget = document.getElementById('show-budget');
    const profileImg = document.getElementById('profile-img-display');

    if(displayName) displayName.innerText = userName;
    if(showIncome) showIncome.innerText = "฿" + income.toLocaleString();
    if(showBudget) showBudget.innerText = "฿" + budget.toLocaleString();
    if(profileImg) profileImg.src = profilePic;
}

function changeProfileImage(e) {
    const file = e.target.files[0];
    if(file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            profilePic = evt.target.result;
            localStorage.setItem('mie_profile_pic', profilePic);
            updateProfileUI();
        };
        reader.readAsDataURL(file);
    }
}

function setFinance() {
    const i = prompt("ระบุรายรับรวม:", income);
    const b = prompt("ตั้งงบประมาณ:", budget);
    if(i !== null) income = parseFloat(i) || 0;
    if(b !== null) budget = parseFloat(b) || 0;
    
    localStorage.setItem('mie_income', income);
    localStorage.setItem('mie_budget', budget);
    updateUI();
}

function editName() {
    const n = prompt("ชื่อเล่นของคุณ:", userName);
    if(n) { userName = n; localStorage.setItem('mie_user_name', n); updateProfileUI(); }
}

function resetAll() {
    if(confirm("⚠️ คำเตือน: ข้อมูลทั้งหมดจะหายไป\nคุณแน่ใจหรือไม่ว่าจะล้างข้อมูล?")) {
        localStorage.clear();
        location.reload();
    }
}

window.onload = updateUI;

window.onclick = function(event) {
    const modal = document.getElementById('addModal');
    if (event.target == modal) {
        closeModal();
    }
}