// script.js - Version 0.7 (Order ID, Booking, Share, Ratings)

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
let orderToCancelId = null;

// Pricing
let basePrice = 0;
let deliveryFee = 0;
let packingFee = 0;
let discountAmount = 0;
let appliedCouponCode = "";
let appliedDeliveryFee = 0;

window.onload = function () {
    showFoodMenu();
    if (localStorage.getItem('theme') === 'light') document.body.classList.add('light-mode');
    if (localStorage.getItem('myCart')) {
        cart = JSON.parse(localStorage.getItem('myCart'));
        updateCartUI();
    }
    validateAndFetchOrders();
    fetchStoreFees();
};

function fetchStoreFees() {
    db.collection('settings').doc('fees').get().then(doc => {
        if (doc.exists) {
            deliveryFee = parseInt(doc.data().delivery) || 0;
            packingFee = parseInt(doc.data().packing) || 0;
        }
    });
}

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
}

// ---- SHARE FEATURE (NEW) ----
function shareWebsite() {
    if (navigator.share) {
        navigator.share({
            title: 'Foodies Hub',
            text: 'Order delicious food from Foodies Hub!',
            url: window.location.href
        }).then(() => console.log('Shared!')).catch((error) => console.log('Sharing failed', error));
    } else {
        alert("Link copied: " + window.location.href);
    }
}

// ---- BOOKING SYSTEM (NEW) ----
function openBookingModal() { document.getElementById('bookingModal').style.display = 'block'; }
function closeBookingModal() { document.getElementById('bookingModal').style.display = 'none'; }

function submitBooking() {
    const name = document.getElementById('bookName').value;
    const phone = document.getElementById('bookPhone').value;
    const date = document.getElementById('bookDate').value;
    const time = document.getElementById('bookTime').value;
    const guests = document.getElementById('bookGuests').value;

    if (!name || !phone || !date || !time) return alert("Please fill all details!");

    db.collection("reservations").add({
        name, phone, date, time, guests,
        status: "Pending",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert("Table Request Sent! Wait for confirmation.");
        closeBookingModal();
    });
}

// ---- MENU & SEARCH (Existing) ----
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
                <div class="info-btn" onclick="showDetails('${food.name}', ${food.price}, '${img}', '${desc}')">ℹ️</div>
                <img src="${img}" onclick="showDetails('${food.name}', ${food.price}, '${img}', '${desc}')">
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

// ---- DETAILS MODAL ----
let currentDetailItem = {};
function showDetails(name, price, img, desc) {
    currentDetailItem = { name, price };
    document.getElementById('detail-img').src = img;
    document.getElementById('detail-name').innerText = name;
    document.getElementById('detail-price').innerText = price + " Rs";
    document.getElementById('detail-desc').innerText = desc;
    document.getElementById('foodDetailsModal').style.display = 'block';
}
function addCurrentToCart() {
    addToCart(currentDetailItem.name, currentDetailItem.price);
    closeDetailsModal();
}
function closeDetailsModal() { document.getElementById('foodDetailsModal').style.display = 'none'; }


// ---- CART LOGIC ----
function addToCart(name, price) {
    let existingItem = cart.find(item => item.name === name);
    if (existingItem) existingItem.qty += 1;
    else cart.push({ name, price, qty: 1 });
    updateCartUI();
    const btn = event.target; const oldText = btn.innerText;
    btn.innerText = "✔"; setTimeout(() => btn.innerText = oldText, 1000);
}

function updateCartUI() {
    let totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('cart-count').innerText = totalItems;
    localStorage.setItem('myCart', JSON.stringify(cart));
}

function openCartModal() {
    document.getElementById('cartModal').style.display = 'block';
    const box = document.getElementById('cart-items-container');
    box.innerHTML = '';
    let totalValue = 0;
    if (cart.length === 0) { box.innerHTML = '<p style="text-align:center;">Empty 😢</p>'; return; }
    cart.forEach((i, idx) => {
        let itemTotal = parseInt(i.price) * i.qty;
        totalValue += itemTotal;
        box.innerHTML += `
            <div class="cart-item">
                <div style="flex:2;"><strong>${i.name}</strong><br><small>${i.price} Rs / each</small></div>
                <div style="flex:1; display:flex; align-items:center; gap:8px;">
                    <button class="qty-btn" onclick="changeQty(${idx}, -1)">-</button>
                    <span style="font-weight:bold;">${i.qty}</span>
                    <button class="qty-btn" onclick="changeQty(${idx}, 1)">+</button>
                </div>
                <div style="flex:1; text-align:right;">
                    <span style="color:var(--primary-color); font-weight:bold;">${itemTotal}</span>
                    <button class="remove-btn" onclick="remCart(${idx})" style="margin-left:5px;">✖</button>
                </div>
            </div>`;
    });
    box.innerHTML += `<div class="cart-total">Cart Value: ${totalValue} Rs</div>`;
}

function changeQty(index, amount) {
    cart[index].qty += amount;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    updateCartUI(); openCartModal();
}
function remCart(idx) { cart.splice(idx, 1); updateCartUI(); openCartModal(); }
function closeCartModal() { document.getElementById('cartModal').style.display = 'none'; }


// ---- CHECKOUT & PRICING ----
function buyNow(name, price, extrasString) {
    isSingleOrder = true;
    singleItemData = { name, price, qty: 1 };
    basePrice = parseInt(price);
    selectedExtras = []; discountAmount = 0; appliedCouponCode = ""; document.getElementById('couponInput').value = '';
    renderExtras(extrasString);
    calculateFinalBill();
    document.getElementById('checkoutModal').style.display = 'block';
}

function proceedToCheckout() {
    if (cart.length === 0) return alert("Empty Cart!");
    isSingleOrder = false; closeCartModal();
    document.getElementById('extras-container').style.display = 'none';
    discountAmount = 0; appliedCouponCode = ""; document.getElementById('couponInput').value = '';
    basePrice = cart.reduce((a, b) => a + (parseInt(b.price) * b.qty), 0);
    calculateFinalBill();
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
    calculateFinalBill();
}

function applyCoupon() {
    const code = document.getElementById('couponInput').value.toUpperCase().trim();
    if (!code) return alert("Enter coupon code!");
    db.collection('coupons').where('code', '==', code).get().then(snap => {
        if (snap.empty) { alert("Invalid Coupon!"); discountAmount = 0; appliedCouponCode = ""; }
        else { snap.forEach(doc => { discountAmount = parseInt(doc.data().discount); appliedCouponCode = code; alert(`Coupon Applied! You saved ${discountAmount} Rs 🎉`); }); }
        calculateFinalBill();
    });
}

function calculateFinalBill() {
    let extraCost = selectedExtras.reduce((sum, item) => sum + item.price, 0);
    let subtotal = basePrice + extraCost;
    if (subtotal >= 600) { appliedDeliveryFee = 0; document.getElementById('summ-delivery').innerText = `₹0 (Free)`; document.getElementById('summ-delivery').style.color = '#2ed573'; }
    else { appliedDeliveryFee = deliveryFee; document.getElementById('summ-delivery').innerText = `₹${deliveryFee}`; document.getElementById('summ-delivery').style.color = '#ccc'; }
    document.getElementById('summ-subtotal').innerText = `₹${subtotal}`;
    document.getElementById('summ-packing').innerText = `₹${packingFee}`;
    document.getElementById('summ-discount').innerText = discountAmount > 0 ? `-₹${discountAmount}` : `₹0`;
    let finalTotal = (subtotal + packingFee + appliedDeliveryFee) - discountAmount;
    if (finalTotal < 0) finalTotal = 0;
    document.getElementById('final-checkout-price').innerText = `₹${finalTotal}`;
}

// ---- CONFIRM ORDER (With Order ID) ----
function confirmOrder() {
    const name = document.getElementById('cusName').value;
    const phone = document.getElementById('cusPhone').value;
    const address = document.getElementById('cusAddress').value;
    const note = document.getElementById('cookingNote').value;

    if (!name || !phone) return alert("Need Name & Phone!");

    // 🔥 GENERATE ORDER ID (#ORD-Random)
    const orderId = '#ORD-' + Math.floor(100000 + Math.random() * 900000);

    let finalName = "";
    let finalPriceText = document.getElementById('final-checkout-price').innerText.replace('₹', '');
    let finalPrice = parseInt(finalPriceText);

    if (isSingleOrder) {
        finalName = `1x ${singleItemData.name}`;
        if (selectedExtras.length > 0) finalName += ` (Extras: ${selectedExtras.map(e => e.name).join(",")})`;
    } else {
        finalName = cart.map(i => `${i.qty}x ${i.name}`).join(" + ");
    }

    let billDetails = `Packing: ₹${packingFee}, Delivery: ₹${appliedDeliveryFee}`;
    if (appliedCouponCode) billDetails += `, Coupon: ${appliedCouponCode} (-₹${discountAmount})`;

    db.collection("orders").add({
        orderId: orderId, // 🔥 Save Order ID
        customerName: name, phone, address,
        foodName: finalName,
        price: finalPrice,
        billDetails: billDetails,
        status: "Pending", cancelledBy: null, cancelReason: "",
        note: note || "",
        rating: 0, // Default 0
        orderTime: firebase.firestore.FieldValue.serverTimestamp()
    }).then((doc) => {
        alert(`Order Placed Successfully! ID: ${orderId} 🚀`);
        if (!isSingleOrder) { cart = []; updateCartUI(); }
        myOrderIds.push(doc.id);
        sessionStorage.setItem('myOrderIds', JSON.stringify(myOrderIds));
        closeCheckoutModal();
        document.getElementById('cusName').value = ''; document.getElementById('cusPhone').value = ''; document.getElementById('cusAddress').value = ''; document.getElementById('cookingNote').value = '';
        openMyOrders();
    });
}
function closeCheckoutModal() { document.getElementById('checkoutModal').style.display = 'none'; }


// ---- HISTORY, RATING & CANCELLATION ----
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
                const oid = d.orderId || 'N/A';
                const col = st === 'Accepted' ? '#2ed573' : (st === 'Cancelled' ? '#ff4757' : 'orange');

                let html = `<div class="order-item">
                    <div>
                        <small style="color:#aaa;">${oid}</small><br>
                        <b>${d.foodName}</b><br>
                        <span style="color:${col}">${st} - ₹${d.price}</span>`;

                if (d.note) html += `<br><small style="color:orange;">📝 ${d.note}</small>`;
                if (d.cancelReason) html += `<br><small style="color:red;">❌ Reason: ${d.cancelReason}</small>`;

                // 🔥 Rating System for Accepted Orders
                if (st === 'Accepted') {
                    let starHTML = '';
                    for (let i = 1; i <= 5; i++) {
                        let cls = d.rating >= i ? 'active' : '';
                        starHTML += `<span class="star-input ${cls}" onclick="rateOrder('${doc.id}', ${i})">★</span>`;
                    }
                    html += `<div class="star-rating">${starHTML}</div>`;
                }

                html += `</div>`;
                if (st === 'Pending') html += `<button onclick="initiateCancel('${doc.id}')" style="color:red;border:none;background:none;">Cancel</button>`;
                box.innerHTML += html + '</div>';
            }
        });
    });
}

function rateOrder(id, rating) {
    db.collection('orders').doc(id).update({ rating: rating })
        .then(() => { alert(`Rated ${rating} Stars! ⭐`); openMyOrders(); });
}

function initiateCancel(id) {
    orderToCancelId = id;
    document.getElementById('cancelModal').style.display = 'block';
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
    for (let radio of radios) { if (radio.checked) { reason = radio.value; break; } }
    if (reason === 'Other') reason = document.getElementById('customCancelReason').value;
    if (!reason) return alert("Please select a reason!");

    db.collection("orders").doc(orderToCancelId).update({
        status: "Cancelled", cancelledBy: "customer", cancelReason: reason
    }).then(() => {
        alert("Order Cancelled."); closeCancelModal(); openMyOrders();
    });
}
function closeCancelModal() { document.getElementById('cancelModal').style.display = 'none'; }
function closeMyOrders() { document.getElementById('myOrdersModal').style.display = 'none'; }

function openAboutModal() { document.getElementById('aboutModal').style.display = 'block'; }
function closeAboutModal() { document.getElementById('aboutModal').style.display = 'none'; }
window.onclick = function (e) { if (e.target.className === 'modal') e.target.style.display = "none"; }