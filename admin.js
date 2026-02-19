// admin.js - Version 0.4 (With Extras Saving)

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
};

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
}

function showSection(sectionId) {
    document.getElementById('sec-orders').style.display = 'none';
    document.getElementById('sec-add').style.display = 'none';
    document.getElementById('sec-stock').style.display = 'none';
    document.getElementById('sec-' + sectionId).style.display = 'block';

    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    if (sectionId === 'orders') buttons[0].classList.add('active');
    if (sectionId === 'add') buttons[1].classList.add('active');
    if (sectionId === 'stock') buttons[2].classList.add('active');
}

// --- ADD ITEM (UPDATED FOR EXTRAS) ---
function addNewFood() {
    const name = document.getElementById('foodName').value;
    const price = document.getElementById('foodPrice').value;
    const image = document.getElementById('foodImage').value;
    const desc = document.getElementById('foodDesc').value;
    // 👇 New
    const extras = document.getElementById('foodExtras').value;
    const category = document.getElementById('foodCategory').value;

    if (!name || !price || category === 'all') return alert("Fill mandatory fields!");

    db.collection("menu_items").add({
        name: name, price: price, image: image, description: desc || "Tasty food!",
        extras: extras || "", // এক্সট্রা সেভ করা হচ্ছে
        category: category, available: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert("Item Added!");
        // Clear inputs
        document.getElementById('foodName').value = '';
        document.getElementById('foodPrice').value = '';
        document.getElementById('foodDesc').value = '';
        document.getElementById('foodExtras').value = '';
    });
}

function renderOrders() {
    const table = document.getElementById('admin-order-list');
    db.collection("orders").orderBy("orderTime", "desc").onSnapshot(snap => {
        table.innerHTML = '';
        if (snap.empty) { table.innerHTML = '<tr><td colspan="4" style="text-align:center;">No Pending Orders</td></tr>'; return; }

        snap.forEach(doc => {
            const d = doc.data();
            const color = d.status === 'Accepted' ? 'green' : (d.status === 'Cancelled' ? 'red' : 'orange');

            table.innerHTML += `
                <tr>
                    <td><b>${d.customerName}</b><br><small>${d.phone}</small><br><small>${d.address}</small></td>
                    <td>${d.foodName}<br><b>${d.price} Rs</b></td>
                    <td style="color:${color}; font-weight:bold;">${d.status}</td>
                    <td>
                        ${d.status === 'Pending' ? `
                        <button onclick="setStatus('${doc.id}','Accepted')" style="background:#2ed573; color:white; border:none; padding:5px; border-radius:4px; margin-right:5px;">✔</button>
                        <button onclick="setStatus('${doc.id}','Cancelled')" style="background:#ff4757; color:white; border:none; padding:5px; border-radius:4px;">✖</button>` : ''}
                        <button onclick="delOrder('${doc.id}')" style="background:#555; border:none; padding:5px; border-radius:4px; margin-left:5px;">🗑️</button>
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

function renderFoodTable() {
    const table = document.getElementById('admin-food-list');
    db.collection("menu_items").orderBy("createdAt", "desc").onSnapshot(snap => {
        table.innerHTML = '';
        snap.forEach(doc => {
            const f = doc.data();
            const cls = f.available ? 'in-stock' : 'out-stock';
            const txt = f.available ? 'In Stock' : 'Out';
            const img = f.image || 'https://via.placeholder.com/50';

            table.innerHTML += `
                <tr>
                    <td><img src="${img}" width="40" style="border-radius:5px;"></td>
                    <td>${f.name}<br><small>${f.price} Rs</small></td>
                    <td><button class="stock-btn ${cls}" onclick="togStock('${doc.id}', ${f.available})">${txt}</button></td>
                    <td><button onclick="delFood('${doc.id}')" style="color:red; background:none; border:none;">❌</button></td>
                </tr>`;
        });
    });
}
function togStock(id, s) { db.collection("menu_items").doc(id).update({ available: !s }); }
function delFood(id) { if (confirm("Delete Item?")) db.collection("menu_items").doc(id).delete(); }