// =======================
// ACCOUNTS
// =======================
const accounts = [
    { username: "CSS", password: "css@012", role: "admin" },
    { username: "CSS", password: "css@012", role: "viewer" }
];

let loggedInUser = localStorage.getItem("loggedInUser");
const OVERDUE_LIMIT = 2 * 24 * 60 * 60 * 1000;
const equipmentInput = document.getElementById("equipment-select"); 
const barcodeSelect = document.getElementById("barcode-select");

// =======================
// DATA STORAGE
// =======================
let borrowList = JSON.parse(localStorage.getItem("borrowList")) || [];
const initialStock = {
    "Alligator Forcep": 1, "Alus Forcep": 1, "Bobcock Forcep": 4, "Blade Holder": 2,
    "Bonecurette": 1, "Bone Ronguer": 1, "CTT Set": 5, "Cutdown": 3, "Cutting Needles": 3,
    "Enema Can": 6, "Hemostatic Curve": 1, "Hemostatic Straight": 2, "Minor Set": 6,
    "Kelly Straight": 4, "Mayo Scissors Soaked": 3, "Metz Scissors Soaked": 7,
    "Mosquito Curve": 2, "Needle Holder Gold": 1, "Needle Holder Small": 1,
    "Needle Holder Medium": 1, "Needle Holder Large": 1, "Ovum Forcep": 5,
    "Skin Retractor": 2, "Stainless Kidney Basin": 5, "Suture Remover Soaked": 4,
    "Vaginal Speculum Large": 1, "Vaginal Speculum Small": 2, "Suturing Set": 5,
    "Red Ribbon": 1, "Infectious Minor Set": 2, "Infectious CTT Set": 2,
    "Infectious Kidney Basin": 2, "Needle Holder Long/Straight": 1,
    "Needle Holder Long/Curve": 1, "Pean Straight": 1, "Pean Curve": 1,
    "Bayonet forcep Long": 2, "Bayonet forcep Small": 2, "Nasal Speculum": 2,
    "Tissue forcep w/ Teeth": 4, "Long Nose": 2
};

let detailedStock = JSON.parse(localStorage.getItem("detailedStock")) || {};

if (Object.keys(detailedStock).length === 0) {
    for (let name in initialStock) {
        detailedStock[name] = [];
        for (let i = 0; i < initialStock[name]; i++) {
            detailedStock[name].push({ barcode: "", expiry: "", status: "available" });
        }
    }
}

function saveAll() {
    localStorage.setItem("borrowList", JSON.stringify(borrowList));
    localStorage.setItem("detailedStock", JSON.stringify(detailedStock));
}

// ==========================================
// SYNC DROPDOWN (DYNAMIC INSTRUMENT LIST)
// ==========================================
function syncInstrumentDropdown() {
    const datalist = document.getElementById("instrument-list");
    if (!datalist) return;

    datalist.innerHTML = "";
    const availableNames = Object.keys(detailedStock).sort();

    availableNames.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        datalist.appendChild(option);
    });
}

// =======================
// LOGIN / LOGOUT
// =======================
document.getElementById("login-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const user = accounts.find(a => a.username === document.getElementById("username").value.trim() && a.password === document.getElementById("password").value.trim());
    if (!user) { document.getElementById("error-msg").textContent = "Invalid login!"; return; }
    localStorage.setItem("loggedInUser", user.username);
    document.getElementById("login-page").classList.add("hidden");
    document.getElementById("dashboard-page").classList.remove("hidden");
    loadAll();
    syncInstrumentDropdown();
});

function logout() {
    localStorage.removeItem("loggedInUser");
    location.reload();
}
document.getElementById("logout-btn")?.addEventListener("click", logout);

// Helper function para sa Barcode Dropdown
function updateBarcodes(name) {
    barcodeSelect.innerHTML = '<option value="">Select Barcode & Expiry</option>';
    if (!detailedStock[name]) return;
    const available = detailedStock[name].filter(u => u.status === "available");
    if (available.length === 0) {
        barcodeSelect.innerHTML = '<option value="">⚠️ OUT OF STOCK</option>';
    } else {
        available.forEach(unit => {
            const opt = document.createElement("option");
            opt.value = unit.barcode || "No Barcode"; 
            const bCode = unit.barcode || "No Barcode Set";
            const expDate = unit.expiry ? `(Exp: ${unit.expiry})` : "(No Expiry)";
            opt.textContent = `${bCode} ${expDate}`;
            barcodeSelect.appendChild(opt);
        });
    }
}

if (equipmentInput) {
    equipmentInput.addEventListener("input", (e) => {
        const selectedInstrument = e.target.value.trim();
        updateBarcodes(selectedInstrument);
    });
}

// =======================
// RETURN
// =======================
function returnItem(id) {
    const item = borrowList.find(i => i.id === id);
    if (!item || item.returned) return;

    Swal.fire({
        title: 'Return Instrument',
        html: `<p style="color: #666;">Receive return for: <b>${item.equipment}</b></p>`,
        input: 'text', // KINI ANG IMPORTANTE PARA MAKA-TYPE
        inputAttributes: {
            autocapitalize: 'off'
        },
        inputPlaceholder: 'Kinsa ang nagdawat?',
        showCancelButton: true,
        confirmButtonText: 'Confirm Return',
        confirmButtonColor: '#12B9B9',
        cancelButtonColor: '#e74c3c',
        // Kini para sigurado nga mo-focus ang cursor pag-abli sa modal
        didOpen: () => {
            const input = Swal.getInput();
            if (input) {
                input.focus();
            }
        },
        inputValidator: (value) => {
            if (!value) {
                return 'Palihog isulat ang ngalan sa nagdawat!'
            }
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const receiver = result.value;

            // Ipadayon ang imong logic sa pag-save
            item.returned = true;
            item.returnTime = new Date().toLocaleString();
            item.receivedBy = receiver;

            if (detailedStock[item.equipment]) {
                const unit = detailedStock[item.equipment].find(u => u.barcode === item.barcode);
                if (unit) unit.status = "available";
            }

            saveAll();
            loadAll();

            Swal.fire({
                title: 'Success!',
                text: 'Instrument successfully returned.',
                icon: 'success',
                confirmButtonColor: '#12B9B9'
            });
        }
    });
}
// =======================
// VIEW LOADERS
// =======================
function loadActive() {
    const tbody = document.querySelector("#borrow-table tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    borrowList.filter(i => !i.returned).forEach(item => {
        tbody.innerHTML += `<tr>
            <td>${item.name}</td><td>${item.type}</td><td>${item.equipment}</td>
            <td>${item.barcode}</td><td>${item.area}</td><td>${item.issuedBy}</td>
            <td>${item.time}</td><td><button onclick="returnItem(${item.id})">Return</button></td>
        </tr>`;
    });
}

function loadAvailable() {
    const tbody = document.querySelector("#available-table tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    for (let name in detailedStock) {
        const items = detailedStock[name];
        const availableCount = items.filter(i => i.status === "available").length;
        tbody.innerHTML += `
            <tr>
                <td>${name}</td>
                <td>${items.length}</td>
                <td>${availableCount}</td>
                <td>
                    <button onclick="openUnitManager('${name}')">Edit Units</button>
                </td>
            </tr>`;
    }
}

function openUnitManager(name) {
    const items = detailedStock[name];
    let html = `<div id="unit-modal" style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:white; padding:20px; border:2px solid #2c3e50; z-index:9999; width:80%; max-height:80vh; overflow-y:auto; box-shadow: 0 0 20px rgba(0,0,0,0.5);">
        <h3>Manage ${name}</h3>`;
    items.forEach((item, index) => {
        html += `<div style="margin-bottom:10px; border-bottom:1px solid #eee;">
            Unit ${index + 1}: <input type="text" id="bc-${index}" value="${item.barcode}" placeholder="Barcode">
            Expiry: <input type="date" id="ex-${index}" value="${item.expiry}">
            Status: <strong>${item.status}</strong>
        </div>`;
    });
    html += `<button onclick="saveUnits('${name}')">Save</button> <button onclick="document.getElementById('overlay').remove()">Close</button></div>`;
    const div = document.createElement('div'); div.id="overlay"; div.innerHTML = html; document.body.appendChild(div);
}

function saveUnits(name) {
    detailedStock[name].forEach((item, index) => {
        item.barcode = document.getElementById(`bc-${index}`).value;
        item.expiry = document.getElementById(`ex-${index}`).value;
    });
    saveAll();
    document.getElementById("overlay").remove();
    loadAvailable();
}

function loadReturned() {
    const tbody = document.querySelector("#returned-table tbody");
    if (!tbody) return; tbody.innerHTML = "";
    borrowList.filter(i => i.returned).forEach(item => {
        tbody.innerHTML += `<tr><td>${item.name}</td><td>${item.equipment}</td><td>${item.barcode}</td><td>${item.area}</td><td>${item.returnTime}</td><td>${item.receivedBy}</td></tr>`;
    });
}

function loadTotal() {
    const tbody = document.querySelector("#total-table tbody");
    if (!tbody) return; tbody.innerHTML = "";
    borrowList.forEach(item => {
        tbody.innerHTML += `<tr><td>${item.name}</td><td>${item.equipment}</td><td>${item.barcode}</td><td>${item.area}</td><td>${item.time}</td><td>${item.issuedBy}</td><td>${item.receivedBy || "-"}</td></tr>`;
    });
}

// 1. Function to automatically fill the Year Filter based on your Borrow List
// 1. Function to fill Year Filter with a wide range (Real-time & Accurate)
function updateYearOptions() {
    const yearFilter = document.getElementById("year-filter");
    if (!yearFilter) return;

    const currentYear = new Date().getFullYear();
    const endYear = 2040; 
    const startYear = 2020; 

    yearFilter.innerHTML = '<option value="all">All Years</option>';

    for (let year = startYear; year <= endYear; year++) {
        const opt = document.createElement("option");
        opt.value = year;
        opt.textContent = year;
        // I-auto select ang current year para accurate dayon ang view
        if (year === currentYear) {
            // opt.selected = true; // I-uncomment ni kung gusto nimo auto-select ang 2026
        }
        yearFilter.appendChild(opt);
    }
}

// 2. Updated Real-Time Monthly Loader
function loadMonthly() {
    const tbody = document.querySelector("#monthly-table tbody");
    if (!tbody) return;
    
    tbody.innerHTML = "";

    const selectedMonth = document.getElementById("month-filter")?.value || "all";
    const selectedYear = document.getElementById("year-filter")?.value || "all";

    const filtered = borrowList.filter(item => {
        const d = new Date(item.timestamp);
        const matchMonth = (selectedMonth === "all" || d.getMonth().toString() === selectedMonth);
        const matchYear = (selectedYear === "all" || d.getFullYear().toString() === selectedYear);
        return matchMonth && matchYear;
    });

    // Kung walay nakit-an nga record sa gipili nga bulan/tuig
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr>
            <td colspan="6" style="text-align:center; color: #999; padding: 20px;">
                🚫 No records found for ${selectedMonth === "all" ? "all months" : "this month"} in ${selectedYear === "all" ? "all years" : selectedYear}.
            </td>
        </tr>`;
        return;
    }

    // Kung naay record, i-display kini
    filtered.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td>${item.name}</td>
                <td>${item.equipment}</td>
                <td>${item.barcode}</td>
                <td>${item.area}</td>
                <td>${item.time}</td>
                <td>${item.issuedBy}</td>
            </tr>`;
    });
}

// 2. The Real-Time Monthly Loader (REPLACE THE OLD ONE WITH THIS)
function loadMonthly() {
    const tbody = document.querySelector("#monthly-table tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const selectedMonth = document.getElementById("month-filter")?.value || "all";
    const selectedYear = document.getElementById("year-filter")?.value || "all";

    const filtered = borrowList.filter(item => {
        const d = new Date(item.timestamp);
        const matchMonth = (selectedMonth === "all" || d.getMonth().toString() === selectedMonth);
        const matchYear = (selectedYear === "all" || d.getFullYear().toString() === selectedYear);
        return matchMonth && matchYear;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No records found for this period.</td></tr>`;
        return;
    }

    filtered.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td>${item.name}</td>
                <td>${item.equipment}</td>
                <td>${item.barcode}</td>
                <td>${item.area}</td>
                <td>${item.time}</td>
                <td>${item.issuedBy}</td>
            </tr>`;
    });
}
function loadOverdue() {
    const tbody = document.querySelector("#overdue-table tbody");
    if (!tbody) return; tbody.innerHTML = "";
    const now = Date.now();
    borrowList.filter(i => !i.returned && (now - i.timestamp) > OVERDUE_LIMIT).forEach(item => {
        tbody.innerHTML += `<tr><td>${item.name}</td><td>${item.equipment}</td><td>${item.barcode}</td><td>${item.area}</td><td>${item.time}</td></tr>`;
    });
}

function loadStats() {
    document.getElementById("stat-total").textContent = borrowList.length;
    document.getElementById("stat-active").textContent = borrowList.filter(i => !i.returned).length;
    document.getElementById("stat-returned").textContent = borrowList.filter(i => i.returned).length;
    const now = Date.now();
    document.getElementById("stat-overdue").textContent = borrowList.filter(i => !i.returned && (now - i.timestamp) > OVERDUE_LIMIT).length;
}

function loadAll() { loadActive(); loadReturned(); loadTotal(); loadMonthly(); loadAvailable(); loadStats(); loadOverdue(); }

// =======================
// NAVIGATION
// =======================
function showView(view) {
    document.querySelectorAll(".main-content > div").forEach(v => v.classList.add("hidden"));
    const target = document.getElementById("view-" + view);
    if (target) target.classList.remove("hidden");
    document.querySelectorAll(".sidebar nav ul li").forEach(li => li.classList.remove("active"));
    const activeNav = document.getElementById("nav-" + (view === 'dashboard' ? 'dash' : view));
    if (activeNav) activeNav.classList.add("active");
}

document.getElementById("nav-dash").onclick = () => showView("dashboard");
document.getElementById("nav-total").onclick = () => showView("total");
document.getElementById("nav-returned").onclick = () => showView("returned");
document.getElementById("nav-overdue").onclick = () => showView("overdue");
document.getElementById("nav-available").onclick = () => showView("available");
document.getElementById("nav-monthly").onclick = () => { showView("monthly"); loadMonthly(); };

window.addEventListener("load", () => {
    if (localStorage.getItem("loggedInUser")) {
        document.getElementById("login-page").classList.add("hidden");
        document.getElementById("dashboard-page").classList.remove("hidden");
        loadAll();
        syncInstrumentDropdown(); // <--- BUILD LIST ON LOAD
        updateYearOptions(); // Punuon ang 2024 hangtod 2040
        
        // REAL-TIME LISTENERS
        document.getElementById("month-filter")?.addEventListener("change", loadMonthly);
        document.getElementById("year-filter")?.addEventListener("change", loadMonthly);
    }
});

document.getElementById("month-filter")?.addEventListener("change", loadMonthly);
let selectedInstrumentToDelete = "";

function openAddInstrumentModal() { document.getElementById("add-modal").classList.remove("hidden"); }
function closeAddInstrumentModal() { document.getElementById("add-modal").classList.add("hidden"); document.getElementById("new-inst-name").value = ""; }

function saveNewInstrument() {
    const name = document.getElementById("new-inst-name").value.trim();
    const stock = parseInt(document.getElementById("new-inst-stock").value);
    if (!name || isNaN(stock)) { alert("Please fill up all fields!"); return; }
    if (detailedStock[name]) { alert("Instrument already exists!"); return; }
    detailedStock[name] = [];
    for (let i = 0; i < stock; i++) { detailedStock[name].push({ barcode: "", expiry: "", status: "available" }); }
    saveAll(); 
    loadAll(); 
    syncInstrumentDropdown(); // <--- SYNC ON ADD
    closeAddInstrumentModal();
    Swal.fire({
        title: 'Added!',
        text: 'New instrument added successfully!',
        icon: 'success',
        confirmButtonColor: '#12B9B9'
    });
}

function openDeleteModal() {
    const listContainer = document.getElementById("delete-list-container");
    listContainer.innerHTML = "";
    document.getElementById("delete-action-area").classList.add("hidden");
    for (let name in detailedStock) {
        const itemDiv = document.createElement("div");
        itemDiv.className = "delete-item-row";
        itemDiv.innerHTML = `<strong>${name}</strong> <span style="float:right; color:#999;">${detailedStock[name].length} units</span>`;
        itemDiv.onclick = function() {
            const allItems = listContainer.querySelectorAll('.delete-item-row');
            allItems.forEach(d => d.style.background = "none");
            itemDiv.style.background = "#fff5f5";
            showDeleteConfirmation(name);
        };
        listContainer.appendChild(itemDiv);
    }
    document.getElementById("delete-modal").classList.remove("hidden");
}

function showDeleteConfirmation(name) {
    selectedInstrumentToDelete = name;
    document.getElementById("target-to-delete").textContent = name;
    document.getElementById("delete-action-area").classList.remove("hidden");
}

function confirmDelete() {
    if (selectedInstrumentToDelete) {
        delete detailedStock[selectedInstrumentToDelete];
        saveAll(); 
        loadAll(); 
        syncInstrumentDropdown(); // <--- SYNC ON DELETE
        openDeleteModal();
        Swal.fire({
            title: 'Success!',
            text: `Successfully removed ${selectedInstrumentToDelete}`,
            icon: 'success',
            confirmButtonColor: '#12B9B9',
            background: '#ffffff',
            color: '#001C01',
            confirmButtonText: 'OK'
        });
    }
}
function cancelSelection() { document.getElementById("delete-action-area").classList.add("hidden"); }
function closeDeleteModal() { document.getElementById("delete-modal").classList.add("hidden"); }

// =======================
// BORROWING LOGIC
// =======================
document.getElementById("borrow-form")?.addEventListener("submit", function(e) {
    e.preventDefault();

    const name = document.getElementById("borrower-name").value.trim();
    const issuedBy = document.getElementById("issued-by").value.trim();
    const type = document.getElementById("type-select").value;
    const equipment = document.getElementById("equipment-select").value.trim();
    const barcode = document.getElementById("barcode-select").value;
    const area = document.getElementById("area-select").value.trim();

    if (!barcode || barcode === "" || barcode.includes("OUT OF STOCK")) {
       Swal.fire({
        title: 'Recorded!',
        text: 'Borrowing recorded successfully!',
        icon: 'success',
        confirmButtonColor: '#12B9B9',
        background: '#ffffff',
        color: '#001C01'
    });
    }

    const newItem = {
        id: Date.now(),
        name: name,
        type: type,
        equipment: equipment,
        barcode: barcode,
        area: area,
        issuedBy: issuedBy,
        time: new Date().toLocaleString(),
        timestamp: Date.now(),
        returned: false,
        receivedBy: ""
    };

    if (detailedStock[equipment]) {
        const unit = detailedStock[equipment].find(u => u.barcode === barcode);
        if (unit) {
            unit.status = "unavailable";
        }
    }

    borrowList.push(newItem);
    saveAll();
    loadAll();

    this.reset();
    barcodeSelect.innerHTML = '<option value="">Select Barcode & Expiry</option>';
    Swal.fire({
        title: 'Recorded Successfully!',
        text: 'The instrument borrowing has been logged.',
        icon: 'success',
        iconColor: '#12B9B9', 
        confirmButtonColor: '#12B9B9',
        background: '#ffffff',
        color: '#001C01',
        showClass: {
            popup: 'animate__animated animate__fadeInDown'
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutUp'
        }
    });
});