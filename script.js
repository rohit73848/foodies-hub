// script.js - Version 0.5 (Reasons & Instructions)

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
let selectedExtras = [];
let basePrice = 0;
let orderToCancelId = null; // ক্যানসেল করার জন্য আইডি মনে রাখা

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

// ---- MENU & SEARCH (SAME AS BEFORE) ----
function searchFood() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const container = document.getElementById('menu-container');
    container.innerHTML = '';
    const filtered = allFoodsData.filter(food => food.name.toLowerCase().includes(query));
    if (filtered.length === 0) { container.innerHTML = '<p>No food found 😢</p>'; return; }
    renderMenuData(filtered);
}

function showFoodMenu() {
    const container = document.getElementById('menu-container');
    container.innerHTML = '<p>Loading...</p>';
    db.collection("menu_items").onSnapshot(snap => {
        allFoodsData = [];
        snap.forEach(doc => allFoodsData.push({ id: doc.id, ...doc.data() }));
        renderMenu('all');
    });
}

function renderMenu(category) {
    const filtered = category === 'all' ? allFoodsData : allFoodsData.filter(f => f.category === category);
    renderMenuData(filtered);
}

function renderMenuData(foodList) {
    const container = document.getElementById('menu-container');
    container.innerHTML = '';
    foodList.forEach(food => {
        const img = food.image || 'https://via.placeholder.com/300';
        const desc = food.description ? food.description.replace(/'/g, "\\'") : "Tasty!";
        const extras = food.extras || "";
        let btnHTML = food.available
            ? `<div class="action-buttons">
                <button class="btn btn-buy" onclick="buyNow('${food.name}', ${food.price}, '${extras}')">Buy</button>
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
    document.getElementById('search-input').value = '';
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    event?.target.classList.add('active');
    renderMenu(cat);
}

// ---- CART & ORDER LOGIC ----
function addToCart(name, price) {
    cart.push({ name, price });
    updateCartUI();
    const btn = event.target; const oldText = btn.innerText;
    btn.innerText = "✔"; setTimeout(() => btn.innerText = oldText, 1000);
}
function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.length;
    localStorage.setItem('myCart', JSON.stringify(cart));
}

function buyNow(name, price, extrasString) {
    isSingleOrder = true; singleItemData = { name, price };
    basePrice = parseInt(price); selectedExtras = [];
    renderExtras(extrasString); updateTotalPrice();
    document.getElementById('checkoutModal').style.display = 'block';
}

function proceedToCheckout() {
    if (cart.length === 0) return alert("Empty Cart!");
    isSingleOrder = false; closeCartModal();
    document.getElementById('extras-container').style.display = 'none';
    basePrice = cart.reduce((a, b) => a + parseInt(b.price), 0);
    updateTotalPrice();
    document.getElementById('checkoutModal').style.display = 'block';
}

function renderExtras(extrasString) {
    const container = document.getElementById('extras-container');
    const list = document.getElementById('extras-list');
    list.innerHTML = '';
    if (!extrasString) { container.style.display = 'none'; return; }
    container.style.display = 'block';
    const items = extrasString.split(',');
    items.forEach(item => {
        const parts = item.split('=');
        if (parts.length === 2) {
            const name = parts[0].trim(); const price = parseInt(parts[1].trim());
            list.innerHTML += `<div class="extra-item"><label><input type="checkbox" onchange="toggleExtra('${name}', ${price}, this)">${name} (+${price} Rs)</label></div>`;
        }
    });
}
function toggleExtra(name, price, checkbox) {
    if (checkbox.checked) selectedExtras.push({ name, price });
    else selectedExtras = selectedExtras.filter(e => e.name !== name);
    updateTotalPrice();
}
function updateTotalPrice() {
    let extraCost = selectedExtras.reduce((sum, item) => sum + item.price, 0);
    document.getElementById('final-checkout-price').innerText = basePrice + extraCost;
}

// 🔥 UPDATED CONFIRM ORDER (Saves Cooking Note)
function confirmOrder() {
    const name = document.getElementById('cusName').value;
    const phone = document.getElementById('cusPhone').value;
    const address = document.getElementById('cusAddress').value;
    // 👇 Cooking Note নেওয়া হচ্ছে
    const note = document.getElementById('cookingNote').value;

    if (!name || !phone) return alert("Need Name & Phone!");

    let finalName = "";
    let finalPrice = parseInt(document.getElementById('final-checkout-price').innerText);

    if (isSingleOrder) {
        finalName = singleItemData.name;
        if (selectedExtras.length > 0) finalName += ` (With: ${selectedExtras.map(e => e.name).join(", ")})`;
    } else {
        finalName = cart.map(i => i.name).join(", ") + ` (${cart.length} Items)`;
    }

    db.collection("orders").add({
        customerName: name, phone, address,
        foodName: finalName, price: finalPrice,
        status: "Pending", cancelledBy: null,
        note: note || "", // 👇 ডেটাবেসে নোট সেভ
        orderTime: firebase.firestore.FieldValue.serverTimestamp()
    }).then((doc) => {
        alert("Order Placed! 🚀");
        if (!isSingleOrder) { cart = []; updateCartUI(); }
        myOrderIds.push(doc.id);
        sessionStorage.setItem('myOrderIds', JSON.stringify(myOrderIds));
        closeCheckoutModal();
        document.getElementById('cusName').value = ''; document.getElementById('cusPhone').value = ''; document.getElementById('cusAddress').value = ''; document.getElementById('cookingNote').value = '';
        openMyOrders();
    });
}

// ---- HISTORY & CANCELLATION ----
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
                let html = `<div class="order-item"><div><b>${d.foodName}</b><br><span style="color:${col}">${st}</span>`;
                // যদি নোট থাকে তবে দেখাবে
                if (d.note) html += `<br><small style="color:orange;">📝 Note: ${d.note}</small>`;
                if (d.cancelReason) html += `<br><small style="color:red;">❌ Reason: ${d.cancelReason}</small>`;
                html += `</div>`;

                if (st === 'Pending') html += `<button onclick="initiateCancel('${doc.id}')" style="color:red;border:none;background:none;">Cancel</button>`;
                box.innerHTML += html + '</div>';
            }
        });
    });
}

// 🔥 CANCELLATION REASON LOGIC
function initiateCancel(id) {
    orderToCancelId = id;
    document.getElementById('cancelModal').style.display = 'block';

    // Other radio button logic
    document.querySelectorAll('input[name="cancelReason"]').forEach(radio => {
        radio.addEventListener('change', function () {
            document.getElementById('customCancelReason').style.display = this.value === 'Other' ? 'block' : 'none';
        });
    });
}

function submitCancellation() {
    if (!orderToCancelId) return;

    let reason = "";
    const radios = document.getElementsByName('cancelReason');
    for (let radio of radios) {
        if (radio.checked) {
            reason = radio.value;
            break;
        }
    }

    if (reason === 'Other') {
        reason = document.getElementById('customCancelReason').value;
    }

    if (!reason) return alert("Please select a reason!");

    db.collection("orders").doc(orderToCancelId).update({
        status: "Cancelled",
        cancelledBy: "customer",
        cancelReason: reason // 👇 কারণ সেভ করা হচ্ছে
    }).then(() => {
        alert("Order Cancelled.");
        closeCancelModal();
        openMyOrders();
    });
}

function closeCancelModal() { document.getElementById('cancelModal').style.display = 'none'; }

// ---- OTHER MODALS ----
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
function closeMyOrders() { document.getElementById('myOrdersModal').style.display = 'none'; }

function showDetails(name, price, img, desc) {
    document.getElementById('detail-img').src = img;
    document.getElementById('detail-name').innerText = name;
    document.getElementById('detail-price').innerText = price + " Rs";
    document.getElementById('detail-desc').innerText = desc;
    document.getElementById('foodDetailsModal').style.display = 'block';
}
function closeDetailsModal() { document.getElementById('foodDetailsModal').style.display = 'none'; }

// About Modal
function openAboutModal() { document.getElementById('aboutModal').style.display = 'block'; }
function closeAboutModal() { document.getElementById('aboutModal').style.display = 'none'; }

window.onclick = function (e) { if (e.target.className === 'modal') e.target.style.display = "none"; }