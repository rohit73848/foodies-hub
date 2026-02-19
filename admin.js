// admin.js - Version 0.6.1 (With Edit Item Feature)

const firebaseConfig = {
    apiKey: "AIzaSyDwb7cSVOgHQNY0ELb-Ilzfi5fVFLItIew",
    authDomain: "foodieshub-8c673.firebaseapp.com",
    projectId: "foodieshub-8c673",
    storageBucket: "foodieshub-8c673.firebasestorage.app",
    messagingSenderId: "994269320843",
    appId: "1:994269320843:web:fde35f6b84be28186da68e"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

window.onload = function () {
    if (localStorage.getItem('theme') === 'light') document.body.classList.add('light-mode');
    renderOrders();
    renderFoodTable();
    loadAdminSettings(); 
};

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
}

function showSection(sectionId) {
    document.getElementById('sec-orders').style.display = 'none';
    document.getElementById('sec-add').style.display = 'none';
    document.getElementById('sec-stock').style.display = 'none';
    document.getElementById('sec-settings').style.display = 'none'; 
    document.getElementById('sec-' + sectionId).style.display = 'block';

    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    if (sectionId === 'orders') buttons[0].classList.add('active');
    if (sectionId === 'add') buttons[1].classList.add('active');
    if (sectionId === 'stock') buttons[2].classList.add('active');
    if (sectionId === 'settings') buttons[3].classList.add('active');
}

// ---- ADD ITEM ----
function addNewFood() {
    const name = document.getElementById('foodName').value;
    const price = document.getElementById('foodPrice').value;
    const image = document.getElementById('foodImage').value;
    const desc = document.getElementById('foodDesc').value;
    const extras = document.getElementById('foodExtras').value;
    const category = document.getElementById('foodCategory').value;

    if (!name || !price || category === 'all') return alert("Fill mandatory fields!");

    db.collection("menu_items").add({
        name: name, price: price, image: image, description: desc || "Tasty food!",
        extras: extras || "", 
        category: category, available: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert("Item Added!");
        document.getElementById('foodName').value = ''; document.getElementById('foodPrice').value = ''; document.getElementById('foodDesc').value = ''; document.getElementById('foodExtras').value = ''; document.getElementById('foodImage').value = '';
    });
}

// ---- RENDER ORDERS ----
function renderOrders() {
    const table = document.getElementById('admin-order-list');
    db.collection("orders").orderBy("orderTime", "desc").onSnapshot(snap => {
        table.innerHTML = '';
        if (snap.empty) { table.innerHTML = '<tr><td colspan="4" style="text-align:center;">No Pending Orders</td></tr>'; return; }

        snap.forEach(doc => {
            const d = doc.data();
            const color = d.status === 'Accepted' ? 'green' : (d.status === 'Cancelled' ? 'red' : 'orange');
            
            let extraInfo = "";
            if (d.note) extraInfo += `<br><small style="color:#ffa502;">📝 Note: ${d.note}</small>`;
            if (d.billDetails) extraInfo += `<br><small style="color:#aaa;">🧾 ${d.billDetails}</small>`;
            if (d.cancelReason) extraInfo += `<br><small style="color:red;">❌ Reason: ${d.cancelReason}</small>`;

            table.innerHTML += `
                <tr>
                    <td><b>${d.customerName}</b><br><small>${d.phone}</small><br><small>${d.address}</small></td>
                    <td>
                        <span style="color:#2ed573; font-weight:bold;">${d.foodName}</span><br>
                        <b>Total: ₹${d.price}</b>
                        ${extraInfo}
                    </td>
                    <td style="color:${color}; font-weight:bold;">${d.status}</td>
                    <td>
                        ${d.status === 'Pending' ? `
                        <button onclick="setStatus('${doc.id}','Accepted')" style="background:#2ed573; color:white; border:none; padding:5px; border-radius:4px; margin-bottom:5px;">✔ Accept</button>
                        <button onclick="setStatus('${doc.id}','Cancelled')" style="background:#ff4757; color:white; border:none; padding:5px; border-radius:4px;">✖ Cancel</button>` : ''}
                        <button onclick="delOrder('${doc.id}')" style="background:#555; border:none; padding:5px; border-radius:4px; margin-top:5px; display:block;">🗑️ Delete</button>
                    </td>
                </tr>`;
        });
    });
}

function setStatus(id, st) {
    let data = { status: st };
    if (st === 'Cancelled') data.cancelledBy = 'admin';
    db.collection("orders").doc(id).update(data);
}
function delOrder(id) { if (confirm("Delete Order?")) db.collection("orders").doc(id).delete(); }

// ---- 🔥 STOCK CONTROL (With Edit Button) ----
function renderFoodTable() {
    const table = document.getElementById('admin-food-list');
    db.collection("menu_items").orderBy("createdAt", "desc").onSnapshot(snap => {
        table.innerHTML = '';
        snap.forEach(doc => {
            const f = doc.data();
            const cls = f.available ? 'in-stock' : 'out-stock';
            const txt = f.available ? 'In Stock' : 'Out';
            const img = f.image || 'https://via.placeholder.com/50';

            // Escaping quotes for function passing
            const safeDesc = f.description ? f.description.replace(/'/g, "\\'").replace(/"/g, '&quot;') : '';
            const safeExtras = f.extras ? f.extras.replace(/'/g, "\\'").replace(/"/g, '&quot;') : '';

            table.innerHTML += `
                <tr>
                    <td><img src="${img}" width="40" style="border-radius:5px;"></td>
                    <td>${f.name}<br><small>${f.price} Rs</small></td>
                    <td><button class="stock-btn ${cls}" onclick="togStock('${doc.id}', ${f.available})">${txt}</button></td>
                    <td>
                        <button onclick="openEditModal('${doc.id}', '${f.name}', '${f.price}', '${img}', '${safeDesc}', '${safeExtras}', '${f.category}')" style="color:orange; background:none; border:none; cursor:pointer; font-size:16px; margin-right:8px;">✏️</button>
                        <button onclick="delFood('${doc.id}')" style="color:red; background:none; border:none; cursor:pointer; font-size:16px;">❌</button>
                    </td>
                </tr>`;
        });
    });
}
function togStock(id, s) { db.collection("menu_items").doc(id).update({ available: !s }); }
function delFood(id) { if (confirm("Delete Item?")) db.collection("menu_items").doc(id).delete(); }

// ---- 🔥 EDIT ITEM LOGIC ----
function openEditModal(id, name, price, img, desc, extras, category) {
    document.getElementById('editFoodId').value = id;
    document.getElementById('editFoodName').value = name;
    document.getElementById('editFoodPrice').value = price;
    document.getElementById('editFoodImage').value = img;
    document.getElementById('editFoodDesc').value = desc;
    document.getElementById('editFoodExtras').value = extras;
    document.getElementById('editFoodCategory').value = category;
    
    document.getElementById('editFoodModal').style.display = 'block';
}

function closeEditModal() {
    document.getElementById('editFoodModal').style.display = 'none';
}

function updateFood() {
    const id = document.getElementById('editFoodId').value;
    const name = document.getElementById('editFoodName').value;
    const price = document.getElementById('editFoodPrice').value;
    const image = document.getElementById('editFoodImage').value;
    const desc = document.getElementById('editFoodDesc').value;
    const extras = document.getElementById('editFoodExtras').value;
    const category = document.getElementById('editFoodCategory').value;

    if (!name || !price) return alert("Name and Price are required!");

    db.collection("menu_items").doc(id).update({
        name: name,
        price: price,
        image: image,
        description: desc,
        extras: extras,
        category: category
    }).then(() => {
        alert("Item Updated Successfully! ✅");
        closeEditModal();
    }).catch(err => alert("Error updating: " + err.message));
}

// ---- SETTINGS & COUPONS ----
function loadAdminSettings() {
    db.collection('settings').doc('fees').get().then(doc => {
        if(doc.exists) {
            document.getElementById('adminDeliveryFee').value = doc.data().delivery || 0;
            document.getElementById('adminPackingFee').value = doc.data().packing || 0;
        }
    });

    db.collection('coupons').onSnapshot(snap => {
        const table = document.getElementById('admin-coupon-list');
        table.innerHTML = '';
        snap.forEach(doc => {
            const data = doc.data();
            table.innerHTML += `
                <tr>
                    <td style="font-weight:bold; color:orange;">${data.code}</td>
                    <td style="color:#2ed573;">₹${data.discount}</td>
                    <td><button onclick="delCoupon('${doc.id}')" style="color:red; border:none; background:none;">🗑️</button></td>
                </tr>`;
        });
    });
}

function saveFees() {
    const del = document.getElementById('adminDeliveryFee').value;
    const pack = document.getElementById('adminPackingFee').value;
    db.collection('settings').doc('fees').set({
        delivery: parseInt(del) || 0,
        packing: parseInt(pack) || 0
    }).then(() => alert("Fees Saved! Customers will now see these charges."));
}

function addCoupon() {
    const code = document.getElementById('couponCode').value.toUpperCase().trim();
    const discount = document.getElementById('couponDiscount').value;

    if(!code || !discount) return alert("Enter code and discount amount!");

    db.collection('coupons').add({
        code: code,
        discount: parseInt(discount)
    }).then(() => {
        alert("Coupon Created!");
        document.getElementById('couponCode').value = '';
        document.getElementById('couponDiscount').value = '';
    });
}

function delCoupon(id) {
    if(confirm("Delete this coupon?")) db.collection('coupons').doc(id).delete();
}

window.onclick = function (e) { 
    if (e.target.className === 'modal') e.target.style.display = "none"; 
}