// ==========================================================================
// ส่วนควบคุมระบบ LOGIN และการทำ AUTO-FILL ข้อมูลผู้ใช้
// ==========================================================================

// ฐานข้อมูลผู้ใช้งานจำลองสำหรับ กฟส.เบตง
const peaUsers = {
    user1: { name: "นายอับดุลรอฮีม มากาเต", position: "พชง.6 ผมต.เบตง", initial: "อ" },
    user2: { name: "นายสมชาย มั่นคง", position: "ผจก.กฟส.เบตง", initial: "ส" },
    user3: { name: "นายณัฐพล รักดี", position: "วศ.6 แผนกปฏิบัติการเบตง", initial: "ณ" }
};

// 🏠 NAVIGATION
function showHomePage() {
    const h = document.getElementById('home-page');
    const f = document.getElementById('form-page');
    if (h) h.style.display = 'block';
    if (f) f.style.display = 'none';
    window.scrollTo(0, 0);
    
    // โหลด stats เมื่อไปหน้า HOME
    setTimeout(() => loadHomePageStats(), 200);
}

function goToForm() {
    const h = document.getElementById('home-page');
    const f = document.getElementById('form-page');
    if (h) h.style.display = 'none';
    if (f) f.style.display = 'block';
    window.scrollTo(0, 0);
    
    // รีเซท form ไปหน้า 1
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
    
    // เฉพาะเมื่อ "บันทึกข้อมูลใหม่" (ไม่ได้กำลัง edit) ค่อยลบข้อมูล
    if (currentEditingRecordId === null) {
        clearAllForm();
    }
}

function newRecordClick() {
    // รีเซท flag editing เมื่อกด "บันทึกข้อมูลใหม่"
    currentEditingRecordId = null;
    goToForm();
}

function clearAllForm() {
    const sessionData = localStorage.getItem("pea_current_user");
    const currentUser = sessionData ? JSON.parse(sessionData) : null;
    
    document.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.id && el.id !== 'sign-date') {
            el.value = '';
        }
    });
    
    if (typeof ctx !== 'undefined') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Re-apply auto-fill สำหรับข้อมูล user
    if (currentUser) {
        const costAccountantInput = document.getElementById("cost-accountant");
        const costAccountantPosInput = document.getElementById("cost-accountant-pos");
        if (costAccountantInput) costAccountantInput.value = currentUser.name;
        if (costAccountantPosInput) costAccountantPosInput.value = currentUser.position;

        const signNameInput = document.getElementById("sign-name");
        const signPosInput = document.getElementById("sign-pos");
        if (signNameInput) signNameInput.value = currentUser.name;
        if (signPosInput) signPosInput.value = currentUser.position;
    }
}

function showHistory() {
    if (typeof window.renderHistory === 'function') {
        window.renderHistory();
    }
    const historyModal = document.getElementById('history-modal');
    if (historyModal) {
        historyModal.classList.add('show');
        historyModal.style.display = 'block';
        historyModal.style.visibility = 'visible';
        historyModal.style.opacity = '1';
        historyModal.style.zIndex = '9999';
    }
}

function logout() {
    if (confirm("คุณต้องการออกจากระบบหรือไม่?")) {
        localStorage.removeItem("pea_current_user");
        location.reload();
    }
}

// Global variable to track if we're editing an existing record
let currentEditingRecordId = null;

function loadHomePageStats() {
    const records = JSON.parse(localStorage.getItem('pea_transformer_history') || '[]');
    
    // นับทั้งหมด
    const total = records.length;
    
    // นับเดือนนี้
    const now = new Date();
    const thisMonth = records.filter(r => {
        try {
            const rDate = new Date(r.date);
            return rDate.getMonth() === now.getMonth() && rDate.getFullYear() === now.getFullYear();
        } catch {
            return false;
        }
    }).length;
    
    // Latest 3 records - แสดง สถานที่/PEA ด้วยการเว้นบรรทัด
    let latestInfo = '-';
    if (records.length > 0) {
        const last3 = records.slice(-3).reverse();
        latestInfo = last3.map(r => {
            const location = r.data?.['location'] || 'N/A';
            const peaId = r.data?.['trans-id'] || 'N/A';
            return `${location} / ${peaId}`;
        }).join('\n');
    }
    
    // คำนวณราคาค่าบำรุงรักษา จาก costState หรือ localStorage
    let maintenanceCost = '0.00';
    try {
        // ดึงจาก costState ถ้าอยู่ในฟอร์ม
        if (typeof costState !== 'undefined') {
            let cost = 0;
            [1,2,3].forEach(s => {
                if (costState[s]) {
                    costState[s].forEach(row => {
                        cost += (parseFloat(row.qty) || 0) * (parseFloat(row.price) || 0);
                    });
                }
            });
            maintenanceCost = cost.toLocaleString('th-TH', {minimumFractionDigits:2, maximumFractionDigits:2});
        } else {
            // ดึงจากบันทึกทั้งหมด
            let totalCost = 0;
            records.forEach(r => {
                if (r.data) {
                    [1,2,3].forEach(s => {
                        const section = r.data[`cost-section-${s}`];
                        if (typeof section === 'string') {
                            try {
                                const parsed = JSON.parse(section);
                                if (Array.isArray(parsed)) {
                                    parsed.forEach(row => {
                                        totalCost += (parseFloat(row.qty) || 0) * (parseFloat(row.price) || 0);
                                    });
                                }
                            } catch (e) {}
                        }
                    });
                }
            });
            maintenanceCost = totalCost.toLocaleString('th-TH', {minimumFractionDigits:2, maximumFractionDigits:2});
        }
    } catch (e) {
        console.log('Cost calc error:', e);
    }
    
    // อัปเดต DOM
    const statsTotal = document.getElementById('stats-total');
    const statsMonth = document.getElementById('stats-month');
    const statsLatest = document.getElementById('stats-latest');
    const statsMaintenance = document.getElementById('stats-maintenance');
    
    if (statsTotal) statsTotal.textContent = total;
    if (statsMonth) statsMonth.textContent = thisMonth;
    if (statsLatest) statsLatest.textContent = latestInfo;
    if (statsMaintenance) statsMaintenance.textContent = maintenanceCost + ' บาท';
}

document.addEventListener("DOMContentLoaded", () => {
    checkLoginSession();

    // ดักจับเหตุการณ์การเข้าสู่ระบบ
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const selectedKey = document.getElementById("login-user-select").value;
            const passwordInput = document.getElementById("login-password").value;

            // ตรวจสอบรหัสผ่านอย่างง่าย (กำหนดให้เป็น 1234 เพื่อความสะดวกในการทดสอบ)
            if (passwordInput === "1234") {
                const userData = peaUsers[selectedKey];
                if (userData) {
                    // บันทึกข้อมูลลง Session Storage หรือ Local Storage
                    localStorage.setItem("pea_current_user", JSON.stringify(userData));
                    
                    // ปิดหน้าล็อกอินและกรอกข้อมูลฟอร์ม
                    checkLoginSession();
                }
            } else {
                alert("รหัสผ่านไม่ถูกต้อง! (ทดสอบด้วยรหัส: 1234)");
            }
        });
    }

    // ดักจับเหตุการณ์การออกจากระบบ
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", () => {
            if (confirm("คุณต้องการออกจากระบบหรือไม่?")) {
                localStorage.removeItem("pea_current_user");
                location.reload(); // รีเฟรชเพื่อเคลียร์สถานะทั้งหมด
            }
        });
    }
});

// ฟังก์ชันตรวจสอบ Session และทำการ Auto-fill ลงฟิลด์ข้อมูล
function checkLoginSession() {
    const sessionData = localStorage.getItem("pea_current_user");
    const loginModal = document.getElementById("login-modal");
    const profileInfo = document.getElementById("user-profile-info");

    if (sessionData) {
        const currentUser = JSON.parse(sessionData);

        // 1. ซ่อนหน้าต่าง Login และแสดงแถบโปรไฟล์บน Header
        if (loginModal) loginModal.style.display = "none";
        if (profileInfo) {
            profileInfo.style.display = "flex";
            profileInfo.classList.add('show');
        }

        // แสดงหน้า HOME หลัง login
        const homePage = document.getElementById("home-page");
        const formPage = document.getElementById("form-page");
        if (homePage) homePage.style.display = "block";
        if (formPage) formPage.style.display = "none";
        
        // โหลด stats
        loadHomePageStats();

        // 2. อัปเดตข้อมูลบน Header ด้านบน
        document.getElementById("header-user-name").textContent = currentUser.name;
        document.getElementById("header-user-pos").textContent = currentUser.position;
        document.getElementById("user-avatar-text").textContent = currentUser.initial;

        // 3. ดำเนินการ Auto-fill ลงช่องต่างๆ ในระบบแบบอัตโนมัติ
        
        // ส่วนที่ 5: ผู้คิดค่าบริการและตำแหน่ง
        const costAccountantInput = document.getElementById("cost-accountant");
        const costAccountantPosInput = document.getElementById("cost-accountant-pos");
        if (costAccountantInput) costAccountantInput.value = currentUser.name;
        if (costAccountantPosInput) costAccountantPosInput.value = currentUser.position;

        // ส่วนท้ายฟอร์ม: ข้อมูลผู้ตรวจสอบลงชื่อและตำแหน่ง
        const signNameInput = document.getElementById("sign-name");
        const signPosInput = document.getElementById("sign-pos");
        if (signNameInput) signNameInput.value = currentUser.name;
        if (signPosInput) signPosInput.value = currentUser.position;

    } else {
        // หากไม่มีการล็อกอิน ให้บังคับเปิดหน้าต่าง Login Modal ไว้
        if (loginModal) loginModal.style.display = "flex";
        if (profileInfo) profileInfo.style.display = "none";
    }
}
// ฟังก์ชันดึงค่าจากช่องกรอกทั่วไปอย่างปลอดภัย (Text, Textarea, Select)
function v(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : ''; 
}

// ฟังก์ชันดึงค่าจาก Checkbox หรือ Radio Button อย่างปลอดภัย
function cv(id) {
    const el = document.getElementById(id);
    if (!el) return ''; 
    return el.checked ? el.value : '';
}

// ฟังก์ชันแปลงวันที่จาก <input type="date"> (ค.ศ. แบบ YYYY-MM-DD)
// ให้เป็นรูปแบบไทย {day, month, year พ.ศ.} สำหรับใช้แสดงผลตอนพิมพ์
const THAI_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

function formatThaiDateParts(isoDate) {
    if (!isoDate) return { day: '', month: '', year: '' };
    const parts = isoDate.split('-');
    if (parts.length !== 3) return { day: '', month: '', year: '' };
    const y = parseInt(parts[0], 10);
    const mIdx = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(mIdx) || isNaN(d)) return { day: '', month: '', year: '' };
    return {
        day: d.toString(),
        month: THAI_MONTHS[mIdx] || '',
        year: (y + 543).toString()
    };
}

// ฟังก์ชันแปลงวันที่เป็นข้อความรูปแบบไทยรวดเดียว เช่น "15 มิถุนายน 2567"
function formatThaiDate(isoDate) {
    const { day, month, year } = formatThaiDateParts(isoDate);
    if (!day || !month || !year) return '';
    return `${day} ${month} ${year}`;
}

// ฟังก์ชันแปลงเวลาจาก <input type="time"> (HH:MM) ให้เป็นรูปแบบไทย เช่น "14.30 น."
function formatThaiTime(hhmm) {
    if (!hhmm) return '';
    const parts = hhmm.split(':');
    if (parts.length < 2) return '';
    return `${parts[0]}.${parts[1]} น.`;
}

document.addEventListener('DOMContentLoaded', () => {
    const btnPrintBottom = document.getElementById('btn-print-bottom');

    // !!! หมายเหตุสำคัญ !!! 
    // โปรดนำรหัส Base64 ของโลโก้ PEA เดิมของคุณมาใส่ในเครื่องหมายคำพูดด้านล่างนี้
    const logoBase64 = 'data:image/png;base64,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';
    function fetchLogoAsBase64() { return Promise.resolve(); }
    
    // --- Step Navigation & Data Sync ---
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const btnNext = document.getElementById('btn-next');
    const btnBack = document.getElementById('btn-back');

    const peaNoInput_Page1 = document.getElementById('trans-id'); 
    const signNameInput_Page1 = document.getElementById('sign-name'); 
    const sizeKvaInput_Page1 = document.getElementById('size-kva');
    
    const costPeaNoInput_Page2 = document.getElementById('cost-pea-no');
    const costAccountantInput_Page2 = document.getElementById('cost-accountant');
    const costTransformerSizeInput_Page2 = document.getElementById('cost-transformer-size');

    if (btnNext) {
        btnNext.addEventListener('click', () => {
            if(peaNoInput_Page1) costPeaNoInput_Page2.value = peaNoInput_Page1.value;
            if(signNameInput_Page1) costAccountantInput_Page2.value = signNameInput_Page1.value;

            // ดึงขนาดหม้อแปลง (kVA) จากหน้า 1 มาเติมให้อัตโนมัติ
            if (sizeKvaInput_Page1 && costTransformerSizeInput_Page2) {
                const sizeVal = sizeKvaInput_Page1.value.trim();
                if (sizeVal) {
                    const matchOption = [...costTransformerSizeInput_Page2.options]
                        .find(opt => opt.value === sizeVal);
                    if (matchOption) {
                        // มีขนาดมาตรฐานตรงกันอยู่แล้ว เลือกตัวเลือกนั้น
                        costTransformerSizeInput_Page2.value = sizeVal;
                    } else {
                        // ไม่ตรงกับขนาดมาตรฐานที่มี ให้เพิ่มตัวเลือกใหม่ตามค่าที่กรอกไว้หน้า 1
                        const newOption = document.createElement('option');
                        newOption.value = sizeVal;
                        newOption.textContent = `${sizeVal} kVA`;
                        newOption.dataset.autoAdded = 'true';
                        costTransformerSizeInput_Page2.appendChild(newOption);
                        costTransformerSizeInput_Page2.value = sizeVal;
                    }
                }
            }
            
            step1.style.display = 'none';
            step2.style.display = 'block';
            window.scrollTo(0, 0);
        });
    }

    if (btnBack) {
        btnBack.addEventListener('click', () => {
            step2.style.display = 'none';
            step1.style.display = 'block';
            window.scrollTo(0, 0);
        });
    }
    // -----------------------------------

    // --- Signature Pad Setup ---
    const canvas = document.getElementById('signature-pad');
    const ctx = canvas.getContext('2d');
    let isDrawing = false;

    function resizeCanvas() {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        ctx.scale(ratio, ratio);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function startDrawing(e) {
        e.preventDefault();
        isDrawing = true;
        const pos = getMousePos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getMousePos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    }

    function stopDrawing() {
        if (!isDrawing) return;
        isDrawing = false;
        ctx.closePath();
    }

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    canvas.addEventListener('touchstart', startDrawing, {passive: false});
    canvas.addEventListener('touchmove', draw, {passive: false});
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);

    document.getElementById('btn-clear-sig').addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    function isCanvasBlank() {
        const blank = document.createElement('canvas');
        blank.width = canvas.width;
        blank.height = canvas.height;
        return canvas.toDataURL() === blank.toDataURL();
    }

    // --- History System ---
    const HISTORY_KEY = 'pea_transformer_history';

    function saveToHistory() {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    
    // ถ้า editing record เดิม → ลบ record เก่าออก
    if (currentEditingRecordId !== null) {
        history = history.filter(r => r.id !== currentEditingRecordId);
    }
    
    let record = {
        id: currentEditingRecordId || Date.now(),  // ใช้ ID เก่า หรือสร้างใหม่
        date: new Date().toLocaleString('th-TH'),
        peaId: document.getElementById('trans-id') ? document.getElementById('trans-id').value : '',
        location: document.getElementById('location') ? document.getElementById('location').value : '',
        data: {}
    };
    
    document.querySelectorAll('input, select, textarea').forEach(el => {
        if(el.id) record.data[el.id] = el.value;
    });
    
    if (!isCanvasBlank()) {
        record.signature = canvas.toDataURL('image/png');
    }
    
    history.push(record);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    
    // รีเซท editing flag
    currentEditingRecordId = null;
}

function loadHistoryRecord(id) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    let record = history.find(r => r.id === id);
    if (record) {
        // เซท flag ว่ากำลัง edit record นี้
        currentEditingRecordId = id;
        
        Object.keys(record.data).forEach(key => {
            let el = document.getElementById(key);
            if (el) el.value = record.data[key];
        });
        if (record.signature) {
            let img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = record.signature;
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        const modal = document.getElementById('history-modal');
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
            modal.style.visibility = 'hidden';
        }
        
        // ไปแสดงฟอร์มพร้อมข้อมูลที่โหลด
        setTimeout(() => {
            goToForm();
        }, 200);
    }
}

    function deleteHistoryRecord(id) {
        if(confirm('ต้องการลบประวัตินี้ใช่หรือไม่?')) {
            let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
            history = history.filter(r => r.id !== id);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
            renderHistory();
        }
    }

    function printHistoryRecord(id) {
        let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        let record = history.find(r => r.id === id);
        if (record) {
            loadHistoryRecord(id);
            setTimeout(() => {
                generatePrintView();
            }, 300);
        }
    }

    function renderHistory() {
        let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        let tbody = document.getElementById('history-list');
        if(!tbody) return;
        tbody.innerHTML = '';
        history.slice().reverse().forEach(r => {
            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${r.date}</td>
                <td>${r.peaId || '-'}</td>
                <td>${r.location || '-'}</td>
                <td>
                    <button type="button" class="btn-secondary btn-sm" onclick="window.loadHistoryRecord(${r.id})">โหลด</button>
                    <button type="button" class="btn-secondary btn-sm" onclick="window.printHistoryRecord(${r.id})">ปริ้น</button>
                    <button type="button" class="btn-secondary btn-sm" onclick="window.deleteHistoryRecord(${r.id})" style="color:red;">ลบ</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    window.loadHistoryRecord = loadHistoryRecord;
    window.deleteHistoryRecord = deleteHistoryRecord;
    window.printHistoryRecord = printHistoryRecord;
    window.renderHistory = renderHistory;

    const btnHome = document.getElementById('btn-home');
    const btnHistory = document.getElementById('btn-history');
    const historyModal = document.getElementById('history-modal');
    const closeHistory = document.getElementById('close-history');

    if(btnHome) {
        btnHome.addEventListener('click', () => { showHomePage(); });
    }

    if(btnHistory) {
        btnHistory.addEventListener('click', () => {
            renderHistory();
            historyModal.classList.add('show');
            historyModal.style.display = 'block';
            historyModal.style.visibility = 'visible';
            historyModal.style.zIndex = '9999';
        });
    }
    if(closeHistory) {
        closeHistory.addEventListener('click', () => {
            historyModal.classList.remove('show');
            historyModal.style.display = 'none';
            historyModal.style.visibility = 'hidden';
        });
    }
    window.addEventListener('click', (e) => {
        if (e.target === historyModal) {
            historyModal.classList.remove('show');
            historyModal.style.display = 'none';
            historyModal.style.visibility = 'hidden';
        }
    });

    // =========================================================
    // COST / EXPENSE SYSTEM
    // =========================================================
    const costState = { 1: [], 2: [], 3: [] };

    function addCostRow(section) {
        const id = Date.now();
        costState[section].push({ id, item: '', qty: '', price: '' });
        renderCostRows(section);
    }

    function deleteCostRow(section, id) {
        costState[section] = costState[section].filter(r => r.id !== id);
        renderCostRows(section);
        recalcCost();
    }

    function renderCostRows(section) {
        const container = document.getElementById(`cost-items-${section}`);
        if (!container) return;
        container.innerHTML = '';
        costState[section].forEach(row => {
            const div = document.createElement('div');
            div.className = 'cost-row has-del';
            div.dataset.id = row.id;

            const rowTotal = (parseFloat(row.qty) || 0) * (parseFloat(row.price) || 0);
            div.innerHTML = `
                <div><input type="text" list="expense-list" placeholder="เลือกหรือพิมพ์รายการ..." value="${row.item}" data-field="item"></div>
                <div><input type="number" inputmode="decimal" placeholder="0" min="0" value="${row.qty}" data-field="qty" style="text-align:center;"></div>
                <div><input type="number" inputmode="decimal" placeholder="0.00" min="0" step="0.01" value="${row.price}" data-field="price" style="text-align:right;"></div>
                <div class="cost-row-total">${rowTotal > 0 ? rowTotal.toLocaleString('th-TH', {minimumFractionDigits:2}) : ''}</div>
                <div class="cost-row-del"><button type="button" class="btn-del-row" title="ลบ">✕</button></div>
            `;
            div.querySelector('.btn-del-row').addEventListener('click', () => deleteCostRow(section, row.id));
            div.querySelectorAll('input').forEach(inp => {
                inp.addEventListener('input', e => {
                    row[e.target.dataset.field] = e.target.value;
                    // อัปเดตเฉพาะยอดรวมของแถวนี้และยอดรวมทั้งหมด
                    // ไม่ render ใหม่ทั้งแถว เพื่อไม่ให้ช่องที่กำลังพิมพ์อยู่หลุดโฟกัส
                    const newTotal = (parseFloat(row.qty) || 0) * (parseFloat(row.price) || 0);
                    const totalEl = div.querySelector('.cost-row-total');
                    if (totalEl) {
                        totalEl.textContent = newTotal > 0 ? newTotal.toLocaleString('th-TH', {minimumFractionDigits:2}) : '';
                    }
                    recalcCost();
                });
            });
            container.appendChild(div);
        });
        recalcCost();
    }

    function recalcCost() {
        let sub = 0;
        [1, 2, 3].forEach(s => {
            costState[s].forEach(r => {
                sub += (parseFloat(r.qty) || 0) * (parseFloat(r.price) || 0);
            });
        });
        const vat = sub * 0.07;
        const total = sub + vat;
        const fmt = n => n.toLocaleString('th-TH', {minimumFractionDigits:2, maximumFractionDigits:2});
        const el = id => document.getElementById(id);
        if (el('cost-subtotal')) el('cost-subtotal').textContent = fmt(sub);
        if (el('cost-vat'))      el('cost-vat').textContent      = fmt(vat);
        if (el('cost-total'))    el('cost-total').textContent     = fmt(total);
        if (el('cost-total-text')) el('cost-total-text').textContent = bahtText(total);
    }

    window.addCostRow = addCostRow;
    [1, 2, 3].forEach(s => addCostRow(s));

    function bahtText(amount) {
        const ones = ['','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า'];
        const tens = ['','สิบ','ยี่สิบ','สามสิบ','สี่สิบ','ห้าสิบ','หกสิบ','เจ็ดสิบ','แปดสิบ','เก้าสิบ'];
        const places = ['','สิบ','ร้อย','พัน','หมื่น','แสน','ล้าน'];
        if (amount === 0) return 'ศูนย์บาทถ้วน';
        const rounded = Math.round(amount * 100) / 100;
        const parts = rounded.toFixed(2).split('.');
        let baht = parseInt(parts[0]);
        const satang = parseInt(parts[1]);

        function convert(n) {
            if (n === 0) return '';
            if (n < 10) return ones[n];
            if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ones[n%10] : '');
            const digits = String(n).split('').reverse();
            let res = '';
            for (let i = digits.length - 1; i >= 0; i--) {
                const d = parseInt(digits[i]);
                if (d === 0) continue;
                if (i === 0) res += ones[d];
                else if (i === 1) res += (d === 1 ? 'สิบ' : d === 2 ? 'ยี่สิบ' : ones[d] + 'สิบ');
                else res += ones[d] + places[i];
            }
            return res;
        }

        let result = '';
        if (baht >= 1000000) {
            result += convert(Math.floor(baht / 1000000)) + 'ล้าน';
            baht = baht % 1000000;
        }
        result += convert(baht) + 'บาท';
        if (satang > 0) result += convert(satang) + 'สตางค์';
        else result += 'ถ้วน';
        return result;
    }

    async function generatePrintView(e) {
        if (e) e.preventDefault();
	if (!logoBase64) {
            await fetchLogoAsBase64();
        }
        saveToHistory();
        const v = (id) => {
            const el = document.getElementById(id);
            return el ? el.value : '';
        };
        const check = (val, target) => val === target ? '✓' : '';

        const sigData = isCanvasBlank() ? '' : canvas.toDataURL('image/png');

        const printHTML = `
            <div class="print-page">
                <div class="p-header-row">
                    <div class="p-logo-left">
                        <img src="${logoBase64 || 'logo.jpg'}" alt="PEA Logo" />
                    </div>
                    <div class="p-header-center">
                        <div class="p-subtitle">บันทึกผลการบำรุงรักษาหม้อแปลง</div>
                        <div class="p-header-sub">PEA Transformer Maintenance Record</div>
                    </div>
                    <div class="p-logo-right"></div>
                </div>

                <div class="p-section-title">1. รายละเอียดเกี่ยวกับหม้อแปลง</div>
                <div class="p-text">
                    สถานที่ติดตั้ง <span class="p-dotted">${v('location')}</span> 
                    กฟฟ. <span class="p-dotted">${v('pea-branch')}</span> 
                    PEA <span class="p-dotted">${v('trans-id')}</span> 
                    SER.NO <span class="p-dotted">${v('ser-no')}</span> .
                </div>
                <div class="p-text">
                    บริษัทผู้ผลิต. <span class="p-dotted">${v('manufacturer')}</span> 
                    ปีที่ผลิต. <span class="p-dotted">${v('year-mfg')}</span> 
                    ขนาด <span class="p-dotted">${v('size-kva')}</span> KVA 
                    ระบบ <span class="p-dotted">${v('system-kv')}</span> 
                    เวคเตอร์กรุ๊ป <span class="p-dotted">${v('vector-group')}</span> .
                </div>
                <div class="p-text">
                    ตำแหน่งแท็ปแรงสูง <span class="p-dotted">${v('tap-position')}</span> 
                    พิกัดแรงสูง <span class="p-dotted">${v('hv-amp')}</span> 
                    พิกัดแรงต่ำ <span class="p-dotted">${v('lv-amp')}</span> .
                </div>
                <div class="p-text">
                    การบำรุงรักษาหม้อแปลงครั้งสุดท้าย วันที่ <span class="p-dotted" style="min-width: 150px;">${formatThaiDate(v('last-maintenance'))}</span>
                </div>

                <div class="p-section-title">2. รายละเอียดค่าที่วัดได้ทางเทคนิค</div>
                <table class="p-table">
                    <colgroup>
                        <col style="width:4%">
                        <col style="width:26%">
                        <col style="width:12%">
                        <col style="width:12%">
                        <col style="width:22%">
                        <col style="width:8%">
                        <col style="width:10%">
                        <col style="width:6%">
                    </colgroup>
                    <tr>
                        <th rowspan="2">ลำดับ</th>
                        <th rowspan="2">รายการตรวจเช็ค</th>
                        <th colspan="2">มาตรฐาน (กฟภ.)</th>
                        <th colspan="4">ผลการตรวจสอบ</th>
                    </tr>
                    <tr>
                        <th>ระบบ 1&Oslash;</th>
                        <th>ระบบ 3&Oslash;</th>
                        <th>ค่าที่วัดได้</th>
                        <th>มาตรฐาน</th>
                        <th>ต่ำกว่า<br>มาตรฐาน</th>
                        <th>การแก้ไข</th>
                    </tr>
                    <tr>
                        <td class="t-center" rowspan="3">1</td>
                        <td>ตรวจสอบค่าฉนวนขดลวด <span>พี – จี</span></td>
                        <td class="t-center">0 M&Omega;(30&deg;)</td>
                        <td class="t-center">> 500 M&Omega;(30&deg;)</td>
                        <td>ค่าที่วัดได้ <span class="p-dotted">${v('meas-pg')}</span> M&Omega;</td>
                        <td class="t-center check-mark">${check(v('res-pg'), 'มาตรฐาน')}</td>
                        <td class="t-center check-mark">${check(v('res-pg'), 'ต่ำกว่ามาตรฐาน')}</td>
                        <td class="t-center">${v('fix-pg')}</td>
                    </tr>
                    <tr>
                        <td>ตรวจสอบค่าฉนวนขดลวด <span>พี – เอส</span></td>
                        <td class="t-center">> 400 M&Omega;(30&deg;)</td>
                        <td class="t-center">> 500 M&Omega;(30&deg;)</td>
                        <td>ค่าที่วัดได้ <span class="p-dotted">${v('meas-ps')}</span> M&Omega;</td>
                        <td class="t-center check-mark">${check(v('res-ps'), 'มาตรฐาน')}</td>
                        <td class="t-center check-mark">${check(v('res-ps'), 'ต่ำกว่ามาตรฐาน')}</td>
                        <td class="t-center">${v('fix-ps')}</td>
                    </tr>
                    <tr>
                        <td>ตรวจสอบค่าฉนวนขดลวด <span>เอส – จี</span></td>
                        <td class="t-center">> 400 M&Omega;(30&deg;)</td>
                        <td class="t-center">> 500 M&Omega;(30&deg;)</td>
                        <td>ค่าที่วัดได้ <span class="p-dotted">${v('meas-sg')}</span> M&Omega;</td>
                        <td class="t-center check-mark">${check(v('res-sg'), 'มาตรฐาน')}</td>
                        <td class="t-center check-mark">${check(v('res-sg'), 'ต่ำกว่ามาตรฐาน')}</td>
                        <td class="t-center">${v('fix-sg')}</td>
                    </tr>
                    <tr>
                        <td class="t-center">2</td>
                        <td>วัดค่าฉนวนของน้ำมัน</td>
                        <td class="t-center">> 32 kv./2.2mm</td>
                        <td class="t-center">> 32 kv./2.2 mm</td>
                        <td>ค่าที่วัดได้ <span class="p-dotted">${v('meas-oil')}</span> KV</td>
                        <td class="t-center check-mark">${check(v('res-oil'), 'มาตรฐาน')}</td>
                        <td class="t-center check-mark">${check(v('res-oil'), 'ต่ำกว่ามาตรฐาน')}</td>
                        <td class="t-center">${v('fix-oil')}</td>
                    </tr>
                    <tr>
                        <td class="t-center">3</td>
                        <td colspan="7">ค่ากราวด์ <span class="p-dotted">${v('meas-ground')}</span> &Omega;</td>
                    </tr>
                </table>

                <div class="p-section-title">3. รายละเอียดผลการตรวจสอบ / สับเปลี่ยน</div>
                <table class="p-table">
                    <colgroup>
                        <col style="width:4%">
                        <col style="width:22%">
                        <col style="width:20%">
                        <col style="width:8%">
                        <col style="width:12%">
                        <col style="width:20%">
                        <col style="width:14%">
                    </colgroup>
                    <tr>
                        <th rowspan="2">ลำดับ</th>
                        <th rowspan="2">รายการ</th>
                        <th rowspan="2">มาตรฐาน (กฟภ.)</th>
                        <th colspan="2">ผลการทดสอบ</th>
                        <th rowspan="2">การแก้ไข</th>
                        <th rowspan="2">หมายเหตุ</th>
                    </tr>
                    <tr>
                        <th>ปกติ</th>
                        <th>ต่ำกว่า /<br>เสื่อมสภาพ</th>
                    </tr>
                    <tr>
                        <td class="t-center" rowspan="3">1</td>
                        <td>อุปกรณ์ป้องกันความชื้น<br>กระเปาะ</td>
                        <td>ไม่แตกร้าว</td>
                        <td class="t-center check-mark">${check(v('stat-bulb'), 'ปกติ')}</td>
                        <td class="t-center check-mark">${check(v('stat-bulb'), 'ชำรุด')}</td>
                        <td class="t-center">${v('fix-bulb')}</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>ซิลิก้าเจล</td>
                        <td>สีน้ำเงิน</td>
                        <td class="t-center check-mark">${check(v('stat-silica'), 'ปกติ')}</td>
                        <td class="t-center check-mark">${check(v('stat-silica'), 'เสื่อมสภาพ')}</td>
                        <td class="t-center">${v('fix-silica')}</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>ถ้วยกรองน้ำมัน</td>
                        <td>ในระดับ</td>
                        <td class="t-center check-mark">${check(v('stat-oilcup'), 'ปกติ')}</td>
                        <td class="t-center check-mark">${check(v('stat-oilcup'), 'ต่ำกว่า')}</td>
                        <td class="t-center">${v('fix-oilcup')}</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td class="t-center" rowspan="3">2</td>
                        <td>ขั้วต่อสาย<br>แรงสูง</td>
                        <td>ไม่มีรอยอาร์ค<br>หลอมละลาย</td>
                        <td class="t-center check-mark">${check(v('stat-term-hv'), 'ปกติ')}</td>
                        <td class="t-center check-mark">${check(v('stat-term-hv'), 'ชำรุด')}</td>
                        <td class="t-center">${v('fix-term-hv')}</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>แรงต่ำ</td>
                        <td>ไม่มีรอยอาร์ค<br>หลอมละลาย</td>
                        <td class="t-center check-mark">${check(v('stat-term-lv'), 'ปกติ')}</td>
                        <td class="t-center check-mark">${check(v('stat-term-lv'), 'ชำรุด')}</td>
                        <td class="t-center">${v('fix-term-lv')}</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>หางปลา</td>
                        <td>ไม่มีรอยอาร์ค<br>หลอมละลาย</td>
                        <td class="t-center check-mark">${check(v('stat-term-lug'), 'ปกติ')}</td>
                        <td class="t-center check-mark">${check(v('stat-term-lug'), 'ชำรุด')}</td>
                        <td class="t-center">${v('fix-term-lug')}</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td class="t-center">3</td>
                        <td>ขั้วต่อสายดิน</td>
                        <td>ต่อแน่น</td>
                        <td class="t-center check-mark">${check(v('stat-ground-term'), 'ปกติ')}</td>
                        <td class="t-center check-mark">${check(v('stat-ground-term'), 'ชำรุด')}</td>
                        <td class="t-center">${v('fix-ground-term')}</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td class="t-center">4</td>
                        <td>น้ำมันหม้อแปลง</td>
                        <td>เหนือระดับ</td>
                        <td class="t-center check-mark">${check(v('stat-oil-level'), 'ปกติ')}</td>
                        <td class="t-center check-mark">${check(v('stat-oil-level'), 'ต่ำกว่า')}</td>
                        <td class="t-center">${v('fix-oil-level')}</td>
                        <td></td>
                    </tr>
                </table>
            </div>

            <div class="print-page">
                <div class="p-section-title" style="margin-top:0;">4. รายละเอียดผลการตรวจสอบทั่วไป</div>
                <table class="p-table">
                    <colgroup>
                        <col style="width:5%">
                        <col style="width:18%">
                        <col style="width:26%">
                        <col style="width:7%">
                        <col style="width:7%">
                        <col style="width:18%">
                        <col style="width:19%">
                    </colgroup>
                    <tr>
                        <th rowspan="2">ลำดับ</th>
                        <th rowspan="2">รายการ</th>
                        <th rowspan="2">มาตรฐาน</th>
                        <th colspan="2">ผลการตรวจสอบ</th>
                        <th rowspan="2">การแก้ไข</th>
                        <th rowspan="2">หมายเหตุ</th>
                    </tr>
                    <tr>
                        <th>ปกติ</th>
                        <th>ชำรุด</th>
                    </tr>
                    <tr>
                        <td class="t-center" rowspan="4">1</td>
                        <td>อุปกรณ์ป้องกันหม้อแปลง<br>ล่อฟ้า HT</td>
                        <td>ไม่มีรอยอาร์ค, ผิวเรียบ</td>
                        <td class="t-center check-mark">${check(v('gen-arr-ht'), 'ปกติ')}</td>
                        <td class="t-center check-mark">${check(v('gen-arr-ht'), 'ชำรุด')}</td>
                        <td></td>
                        <td>${v('gen-arr-ht-rem')}</td>
                    </tr>
                    <tr>
                        <td>ล่อฟ้า LT</td>
                        <td>ไม่มีรอยอาร์ค, ผิวเรียบ</td>
                        <td class="t-center check-mark">${check(v('gen-arr-lt'), 'ปกติ')}</td>
                        <td class="t-center check-mark">${check(v('gen-arr-lt'), 'ชำรุด')}</td>
                        <td></td>
                        <td>${v('gen-arr-lt-rem')}</td>
                    </tr>
                    <tr>
                        <td>HT.SW</td>
                        <td>ไม่มีรอยอาร์ค, ผิวเรียบ</td>
                        <td class="t-center check-mark">${check(v('gen-htsw'), 'ปกติ')}</td>
                        <td class="t-center check-mark">${check(v('gen-htsw'), 'ชำรุด')}</td>
                        <td></td>
                        <td>${v('gen-htsw-rem')}</td>
                    </tr>
                    <tr>
                        <td>LT.SW</td>
                        <td>ไม่มีรอยอาร์ค, ผิวเรียบ</td>
                        <td class="t-center check-mark">${check(v('gen-ltsw'), 'ปกติ')}</td>
                        <td class="t-center check-mark">${check(v('gen-ltsw'), 'ชำรุด')}</td>
                        <td></td>
                        <td>${v('gen-ltsw-rem')}</td>
                    </tr>
                    <tr>
                        <td class="t-center" rowspan="2">2</td>
                        <td>BUSHING<br>ด้านแรงสูง</td>
                        <td>สะอาดผิวเรียบ</td>
                        <td class="t-center check-mark">${check(v('gen-bush-hv'), 'ปกติ')}</td>
                        <td class="t-center check-mark">${check(v('gen-bush-hv'), 'ชำรุด')}</td>
                        <td></td>
                        <td>${v('gen-bush-hv-rem')}</td>
                    </tr>
                    <tr>
                        <td>ด้านแรงต่ำ</td>
                        <td></td>
                        <td class="t-center check-mark">${check(v('gen-bush-lv'), 'ปกติ')}</td>
                        <td class="t-center check-mark">${check(v('gen-bush-lv'), 'ชำรุด')}</td>
                        <td></td>
                        <td>${v('gen-bush-lv-rem')}</td>
                    </tr>
                    <tr>
                        <td class="t-center">3</td>
                        <td>รอยรั่วซึม</td>
                        <td>ไม่มีรอยรั่วซึมทุกจุด</td>
                        <td class="t-center check-mark">${check(v('gen-leak'), 'ปกติ')}</td>
                        <td class="t-center check-mark">${check(v('gen-leak'), 'ชำรุด')}</td>
                        <td></td>
                        <td>${v('gen-leak-rem')}</td>
                    </tr>
                    <tr>
                        <td class="t-center">4</td>
                        <td>ตำแหน่ง TAP CHANGER</td>
                        <td>ตรงตามหมายเลข</td>
                        <td class="t-center check-mark" colspan="2"><span class="p-dotted">${v('gen-tap')}</span></td>
                        <td></td>
                        <td>${v('gen-tap-rem')}</td>
                    </tr>
                    <tr>
                        <td class="t-center">5</td>
                        <td>สภาพภายนอกทั่วไป</td>
                        <td>นั่งร้านเสา มาตรฐาน</td>
                        <td class="t-center check-mark">${check(v('gen-ext'), 'ปกติ')}</td>
                        <td class="t-center check-mark">${check(v('gen-ext'), 'ชำรุด')}</td>
                        <td></td>
                        <td>${v('gen-ext-rem')}</td>
                    </tr>
                    <tr>
                        <td class="t-center">6</td>
                        <td>ระยะห่างระหว่าง<br>ARCING HORN</td>
                        <td>15.5 cm. ระบบ 22 KV.<br>22 cm. ระบบ 33 KV.</td>
                        <td class="t-center check-mark">${check(v('gen-arcing'), 'ปกติ')}</td>
                        <td class="t-center check-mark">${check(v('gen-arcing'), 'ชำรุด')}</td>
                        <td></td>
                        <td>${v('gen-arcing-rem')}</td>
                    </tr>
                    <tr>
                        <td class="t-center">7</td>
                        <td>สภาพประเด็น</td>
                        <td>บุชชิ่ง HT., บุชชิ่ง LT ยึดหยุ่นได้</td>
                        <td class="t-center check-mark">${check(v('gen-flex'), 'ปกติ')}</td>
                        <td class="t-center check-mark">${check(v('gen-flex'), 'ชำรุด')}</td>
                        <td></td>
                        <td>${v('gen-flex-rem')}</td>
                    </tr>
                    <tr>
                        <td class="t-center">8</td>
                        <td>สภาพการรับโหลด</td>
                        <td colspan="2">กระแสก่อนดำเนินการ<br>A <span class="p-dotted">${v('load-cur-pre-a')}</span> Amp.<br>B <span class="p-dotted">${v('load-cur-pre-b')}</span> Amp.<br>C <span class="p-dotted">${v('load-cur-pre-c')}</span> Amp.<br>แรงดันก่อนดำเนินการ<br>A <span class="p-dotted">${v('load-vol-pre-a')}</span> Volt.<br>B <span class="p-dotted">${v('load-vol-pre-b')}</span> Volt.<br>C <span class="p-dotted">${v('load-vol-pre-c')}</span> Volt.</td>
                        <td colspan="2">กระแสหลังดำเนินการ<br>A <span class="p-dotted">${v('load-cur-post-a')}</span> Amp.<br>B <span class="p-dotted">${v('load-cur-post-b')}</span> Amp.<br>C <span class="p-dotted">${v('load-cur-post-c')}</span> Amp.<br>แรงดันหลังดำเนินการ<br>A <span class="p-dotted">${v('load-vol-post-a')}</span> volt.<br>B <span class="p-dotted">${v('load-vol-post-b')}</span> volt.<br>C <span class="p-dotted">${v('load-vol-post-c')}</span> volt.</td>
                        <td class="t-center">100% amp.<br>เฟส</td>
                    </tr>
                    <tr>
                        <td class="t-center">9</td>
                        <td>ขนาดฟิวส์แรงสูง</td>
                        <td colspan="5">
                            A <span class="p-dotted">${v('fuse-hv-a')}</span> Amp.
                            &nbsp;&nbsp;&nbsp;B <span class="p-dotted">${v('fuse-hv-b')}</span> Amp.
                            &nbsp;&nbsp;&nbsp;C <span class="p-dotted">${v('fuse-hv-c')}</span> Amp.
                        </td>
                    </tr>
                    <tr>
                        <td class="t-center">10</td>
                        <td>ขนาดฟิวส์แรงต่ำ</td>
                        <td colspan="5">
                            A <span class="p-dotted">${v('fuse-lv-a')}</span> Amp.
                            &nbsp;&nbsp;&nbsp;B <span class="p-dotted">${v('fuse-lv-b')}</span> Amp.
                            &nbsp;&nbsp;&nbsp;C <span class="p-dotted">${v('fuse-lv-c')}</span> Amp.
                        </td>
                    </tr>
                </table>

                <div class="p-text">
                    <strong>หมายเหตุ</strong> <span class="p-dotted" style="min-width: 300px;">${v('general-remarks')}</span>
                </div>

                <div class="p-signature">
                    <div style="margin-bottom: 20px;">ตรวจสอบและบำรุงรักษาหม้อแปลง</div>
                    <div>
                        (ลงชื่อ) <span class="sig-line">${sigData ? '<img class="sig-img" src="' + sigData + '" />' : ''}</span>
                    </div>
                    <div style="margin-bottom: 10px;">(<span class="p-dotted" style="min-width: 130px; text-align: center;">${v('sign-name')}</span>)</div>
                    <div>
                        ตำแหน่ง <span class="sig-line" style="text-align: center;"><span class="p-dotted" style="border: none;">${v('sign-pos')}</span></span>
                    </div>
                    <div style="margin-top: 10px;">วันที่ <span class="p-dotted">${formatThaiDateParts(v('sign-date')).day}</span> เดือน <span class="p-dotted">${formatThaiDateParts(v('sign-date')).month}</span> พ.ศ. <span class="p-dotted">${formatThaiDateParts(v('sign-date')).year}</span></div>
                    <div>เริ่มเวลา <span class="p-dotted">${formatThaiTime(v('time-start'))}</span> ถึง. <span class="p-dotted">${formatThaiTime(v('time-end'))}</span></div>
                </div>
            </div>

            ${buildCostPage()}
        `;
        
        document.getElementById('print-container').innerHTML = printHTML;

        // สั่งให้ Print PDF ทำงานหลังจากเรนเดอร์ข้อมูลเสร็จ
        setTimeout(() => {
            window.print();
            // หลังปิด print dialog ไป HOME page
            setTimeout(() => {
                showHomePage();
            }, 1000);
        }, 300);
    }

    function buildCostPage() {
        const cv = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
        const fmtNum = n => n.toLocaleString('th-TH', {minimumFractionDigits:2, maximumFractionDigits:2});

        let sub = 0;
        [1,2,3].forEach(s => costState[s].forEach(r => { sub += (parseFloat(r.qty)||0)*(parseFloat(r.price)||0); }));
        const vat = sub * 0.07;
        const total = sub + vat;

        const dateStr = formatThaiDate(v('sign-date'));
        const timeStart = formatThaiTime(v('time-start'));
        const timeEnd = formatThaiTime(v('time-end'));
        const timeTotal = (timeStart && timeEnd) ? `${timeStart} - ${timeEnd}` : '';
        const transformerSize = v('cost-transformer-size');

        return `
        <div class="print-page">
            <div>
                <div class="p-header-row">
                    <div class="p-logo-left">
                        <img src="${logoBase64}" alt="PEA Logo">
                    </div>
                    <div class="p-header-center">
                        <div class="p-title">รายละเอียดการคิดค่าใช้จ่ายในการตรวจสอบและบำรุงรักษาหม้อแปลงของ กฟส.เบตง</div>
                    </div>
                    <div class="p-logo-right"></div>
                </div>

                <table style="width:100%; border-collapse:collapse; margin-bottom:6px; font-size:10pt;">
                    <tr>
                        <td style="width:50%; padding:2px 0;">ผู้ใช้ไฟ <span class="p-dotted" style="min-width:120px;">${v('cost-owner')}</span></td>
                        <td style="width:50%; padding:2px 0; text-align:right;">หมายเลขผู้ใช้ไฟ <span class="p-dotted" style="min-width:80px;">${v('cost-owner-no')}</span></td>
                    </tr>
                    <tr>
                        <td style="padding:2px 0;">เลขที่คำร้อง <span class="p-dotted" style="min-width:120px;">${v('cost-req-no')}</span></td>
                        <td style="padding:2px 0; text-align:right;">หมายเลข PEA <span class="p-dotted" style="min-width:80px;">${v('cost-pea-no')}</span></td>
                    </tr>
                    <tr>
                        <td style="padding:2px 0;">วันที่ <span class="p-dotted" style="min-width:100px;">${dateStr}</span></td>
                        <td style="padding:2px 0; text-align:right;">
                            ขนาด <span class="p-dotted" style="min-width:40px; text-align:center;">${transformerSize}</span> kVA &nbsp;&nbsp; 
                            เวลา <span class="p-dotted" style="min-width:80px; text-align:center;">${timeTotal}</span>
                        </td>
                    </tr>
                </table>

                <table class="p-cost-table">
                    <colgroup>
                        <col style="width:5%">
                        <col style="width:50%">
                        <col style="width:15%">
                        <col style="width:15%">
                        <col style="width:15%">
                    </colgroup>
                    <thead>
                        <tr>
                            <th>ลำดับ</th>
                            <th>รายการ</th>
                            <th>จำนวน</th>
                            <th>ราคา/หน่วย</th>
                            <th>เป็นเงินบาท/สต.</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td class="t-center" rowspan="${Math.max(costState[1].filter(r=>r.item||r.qty||r.price).length,1)+1}" style="vertical-align:top; padding-top:4px; font-weight:bold;">1</td>
                            <td colspan="4" style="font-weight:bold;">ค่าอุปกรณ์</td></tr>
                        ${costState[1].filter(r=>r.item||r.qty||r.price).map(r=>{
                            const tot=(parseFloat(r.qty)||0)*(parseFloat(r.price)||0);
                            return `<tr><td>&nbsp;&nbsp;- ${r.item||''}</td><td class="t-center">${r.qty||''}</td><td class="t-right">${r.price?parseFloat(r.price).toLocaleString('th-TH',{minimumFractionDigits:2}):''}</td><td class="t-right">${tot>0?fmtNum(tot):''}</td></tr>`;
                        }).join('') || '<tr><td style="height:16px;"></td><td></td><td></td><td></td></tr>'}
                        <tr><td class="t-center" rowspan="${Math.max(costState[2].filter(r=>r.item||r.qty||r.price).length,1)+1}" style="vertical-align:top; padding-top:4px; font-weight:bold;">2</td>
                            <td colspan="4" style="font-weight:bold;">ค่าบำรุงรักษาหม้อแปลง</td></tr>
                        ${costState[2].filter(r=>r.item||r.qty||r.price).map(r=>{
                            const tot=(parseFloat(r.qty)||0)*(parseFloat(r.price)||0);
                            return `<tr><td>&nbsp;&nbsp;- ${r.item||''}</td><td class="t-center">${r.qty||''}</td><td class="t-right">${r.price?parseFloat(r.price).toLocaleString('th-TH',{minimumFractionDigits:2}):''}</td><td class="t-right">${tot>0?fmtNum(tot):''}</td></tr>`;
                        }).join('') || '<tr><td style="height:16px;"></td><td></td><td></td><td></td></tr>'}
                        <tr><td class="t-center" rowspan="${Math.max(costState[3].filter(r=>r.item||r.qty||r.price).length,1)+1}" style="vertical-align:top; padding-top:4px; font-weight:bold;">3</td>
                            <td colspan="4" style="font-weight:bold;">ค่าทดสอบน้ำมันหม้อแปลง</td></tr>
                        ${costState[3].filter(r=>r.item||r.qty||r.price).map(r=>{
                            const tot=(parseFloat(r.qty)||0)*(parseFloat(r.price)||0);
                            return `<tr><td>&nbsp;&nbsp;- ${r.item||''}</td><td class="t-center">${r.qty||''}</td><td class="t-right">${r.price?parseFloat(r.price).toLocaleString('th-TH',{minimumFractionDigits:2}):''}</td><td class="t-right">${tot>0?fmtNum(tot):''}</td></tr>`;
                        }).join('') || '<tr><td style="height:16px;"></td><td></td><td></td><td></td></tr>'}
                        <tr>
                            <td class="t-center" style="font-weight:bold;">4</td>
                            <td colspan="3" style="font-weight:bold;">รวมค่าบริการและค่าอุปกรณ์ ( ข้อ 1+ ข้อ 2+ ข้อ 3 )</td>
                            <td class="t-right" style="font-weight:bold;">${fmtNum(sub)}</td>
                        </tr>
                        <tr>
                            <td></td>
                            <td colspan="3">ภาษีมูลค่าเพิ่ม 7%</td>
                            <td class="t-right">${fmtNum(vat)}</td>
                        </tr>
                        <tr>
                            <td></td>
                            <td colspan="4" style="font-weight:bold; text-decoration:underline;">
                                ค่าใช้จ่ายที่เรียกเก็บจากผู้ใช้บริการ เป็นเงิน (${bahtText(total)})
                                <span style="float:right;">${fmtNum(total)}</span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div style="display:flex; justify-content:space-between; margin-top:25px; font-size:10pt;">
                    <div class="print-signature-box" style="text-align:center; width:48%; min-width:140px;">
                        <div style="margin-bottom:5px;">ลงชื่อ <span class="p-dotted" style="min-width:110px;"></span> ผู้คิดค่าบริการ</div>
                        <div>(${v('cost-accountant') || '....................................'})</div>
                        <div>${v('cost-accountant-pos') || ''}</div>
                    </div>
                    <div style="text-align:center; width:42%;">
                        <div>เรียน ผจก.กฟส.เบตง</div>
                        <div>เพื่อโปรดอนุมัติเรียกเก็บค่าใช้จ่ายฯ ต่อไป</div>

                        <div style="margin-top:25px;">ลงชื่อ <span class="p-dotted" style="min-width:130px;"></span></div>
                        <div>( <span class="p-dotted" style="min-width:130px;"></span> )</div>
                        <div>ตำแหน่ง <span class="p-dotted" style="min-width:130px;"></span></div>

                        <div style="margin-top:20px;">ผบส., ผบร.</div>
                        <div>อนุมัติและดำเนินการในส่วนเกี่ยวข้องต่อไป</div>

                        <div style="margin-top:25px;">ลงชื่อ <span class="p-dotted" style="min-width:130px;"></span></div>
                        <div>( <span class="p-dotted" style="min-width:130px;"></span> )</div>
                        <div>ตำแหน่ง <span class="p-dotted" style="min-width:130px;"></span></div>
                    </div>
                </div>
            </div>
        </div>`;
    }

    if (btnPrintBottom) btnPrintBottom.addEventListener('click', (e) => generatePrintView(e));
    
    const btnSaveOnly = document.getElementById('btn-save-only');
    if (btnSaveOnly) btnSaveOnly.addEventListener('click', (e) => {
        e.preventDefault();
        saveToHistory();
        alert('✅ บันทึกข้อมูลสำเร็จแล้ว');
        showHomePage();
    });
});