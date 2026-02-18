// script.js - Final Version 0.3 (Details + Responsive)

const firebaseConfig = {
    apiKey: "AIzaSyDwb7cSVOgHQNY0ELb-Ilzfi5fVFLItIew",
    authDomain: "foodieshub-8c673.firebaseapp.com",
    projectId: "foodieshub-8c673",
    storageBucket: "foodieshub-8c673.firebasestorage.app",
    messagingSenderId: "994269320843",
    appId: "1:994269320843:web:fde35f6b84be28186da68e"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let allFoodsData = [];
let cart = [];
let myOrderIds = [];
let isSingleOrder = false;
let singleItemData = {};

window.onload = function () {
    showFoodMenu();
    if (localStorage.getItem('theme') === 'light') document.body.classList.add('light-mode');
    if (localStorage.getItem('myCart')) {
        cart = JSON.parse(localStorage.getItem('myCart'));
        updateCartUI();
    }
    validateAndFetchOrders();
};

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
}

// ---- MENU ----
function showFoodMenu() {
    const container = document.getElementById('menu-container');
    container.innerHTML = '<p>Loading...</p>';
    db.collection("menu_items").onSnapshot(snap => {
        allFoodsData = [];
        container.innerHTML = '';
        snap.forEach(doc => allFoodsData.push({ id: doc.id, ...doc.data() }));
        renderMenu('all');
    });
}

function renderMenu(category) {
    const container = document.getElementById('menu-container');
    container.innerHTML = '';
    const filtered = category === 'all' ? allFoodsData : allFoodsData.filter(f => f.category === category);

    filtered.forEach(food => {
        const img = food.image || 'https://via.placeholder.com/300';
        const desc = food.description ? food.description.replace(/'/g, "\\'") : "Delicious food!";

        let btnHTML = food.available
            ? `<div class="action-buttons">
                <button class="btn btn-buy" onclick="buyNow('${food.name}', ${food.price})">Buy</button>
                <button class="btn btn-cart" onclick="addToCart('${food.name}', ${food.price})">Cart</button>
               </div>`
            : `<button class="btn" style="background:#555; width:100%; margin-top:10px;" disabled>Out of Stock</button>`;

        container.innerHTML += `
            <div class="food-card">
                <div class="info-btn" onclick="showDetails('${food.name}', '${food.price}', '${img}', '${desc}')">ℹ️</div>
                <img src="${img}" onclick="showDetails('${food.name}', '${food.price}', '${img}', '${desc}')">
                <div class="card-body">
                    <span class="food-name">${food.name}</span>
                    <span class="food-price">${food.price} Rs</span>
                    ${btnHTML}
                </div>
            </div>`;
    });
}
function filterFood(cat) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    event?.target.classList.add('active');
    renderMenu(cat);
}

// ---- DETAILS MODAL (NEW) ----
function showDetails(name, price, img, desc) {
    document.getElementById('detail-img').src = img;
    document.getElementById('detail-name').innerText = name;
    document.getElementById('detail-price').innerText = price + " Rs";
    document.getElementById('detail-desc').innerText = desc;
    document.getElementById('foodDetailsModal').style.display = 'block';
}
function closeDetailsModal() { document.getElementById('foodDetailsModal').style.display = 'none'; }

// ---- CART & ORDER ----
function addToCart(name, price) {
    cart.push({ name, price });
    updateCartUI();
    // Toast effect
    const btn = event.target;
    const oldText = btn.innerText;
    btn.innerText = "✔";
    setTimeout(() => btn.innerText = oldText, 1000);
}
function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.length;
    localStorage.setItem('myCart', JSON.stringify(cart));
}
function buyNow(name, price) {
    isSingleOrder = true;
    singleItemData = { name, price };
    document.getElementById('checkoutModal').style.display = 'block';
}
function proceedToCheckout() {
    if (cart.length === 0) return alert("Empty Cart!");
    isSingleOrder = false;
    closeCartModal();
    document.getElementById('checkoutModal').style.display = 'block';
}
function confirmOrder() {
    const name = document.getElementById('cusName').value;
    const phone = document.getElementById('cusPhone').value;
    const address = document.getElementById('cusAddress').value;
    if (!name || !phone) return alert("Need Name & Phone!");

    let finalName = isSingleOrder ? singleItemData.name : cart.map(i => i.name).join(", ") + ` (${cart.length})`;
    let finalPrice = isSingleOrder ? singleItemData.price : cart.reduce((a, b) => a + parseInt(b.price), 0);

    db.collection("orders").add({
        customerName: name, phone, address,
        foodName: finalName, price: finalPrice,
        status: "Pending", cancelledBy: null,
        orderTime: firebase.firestore.FieldValue.serverTimestamp()
    }).then((doc) => {
        alert("Order Placed! 🚀");
        if (!isSingleOrder) { cart = []; updateCartUI(); }
        myOrderIds.push(doc.id);
        sessionStorage.setItem('myOrderIds', JSON.stringify(myOrderIds));
        closeCheckoutModal();
        openMyOrders();
    });
}

// ---- MODAL HELPERS ----
function openCartModal() {
    document.getElementById('cartModal').style.display = 'block';
    const box = document.getElementById('cart-items-container');
    const tot = document.getElementById('cart-total-price');
    box.innerHTML = ''; let t = 0;
    if (cart.length === 0) { box.innerHTML = '<p>Empty</p>'; tot.innerText = '0'; return; }
    cart.forEach((i, idx) => {
        t += parseInt(i.price);
        box.innerHTML += `<div class="cart-item"><span>${i.name}</span> <button class="remove-btn" onclick="remCart(${idx})">✖</button></div>`;
    });
    tot.innerText = t;
}
function remCart(idx) { cart.splice(idx, 1); updateCartUI(); openCartModal(); }
function closeCartModal() { document.getElementById('cartModal').style.display = 'none'; }
function closeCheckoutModal() { document.getElementById('checkoutModal').style.display = 'none'; }

// ---- HISTORY ----
function validateAndFetchOrders() {
    if (!sessionStorage.getItem('myOrderIds')) return;
    myOrderIds = JSON.parse(sessionStorage.getItem('myOrderIds'));
}
function openMyOrders() {
    document.getElementById('myOrdersModal').style.display = 'block';
    const box = document.getElementById('order-history-list');
    box.innerHTML = '<p>Loading...</p>';
    Promise.all(myOrderIds.map(id => db.collection("orders").doc(id).get())).then(docs => {
        box.innerHTML = '';
        docs.forEach(doc => {
            if (doc.exists) {
                const d = doc.data();
                const st = d.status;
                const col = st === 'Accepted' ? '#2ed573' : (st === 'Cancelled' ? '#ff4757' : 'orange');
                let html = `<div class="order-item"><div><b>${d.foodName}</b><br><span style="color:${col}">${st}</span></div>`;
                if (st === 'Pending') html += `<button onclick="canOrd('${doc.id}')" style="color:red;border:none;background:none;">Cancel</button>`;
                box.innerHTML += html + '</div>';
            }
        });
    });
}
function canOrd(id) {
    if (confirm("Cancel?")) db.collection("orders").doc(id).update({ status: "Cancelled", cancelledBy: "customer" }).then(() => { alert("Done"); openMyOrders(); });
}
function closeMyOrders() { document.getElementById('myOrdersModal').style.display = 'none'; }

window.onclick = function (e) {
    if (e.target.className === 'modal') e.target.style.display = "none";
}