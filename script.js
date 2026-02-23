// script.js - Version 0.9.1 Final (Bug Fixes: Delivered Rating & Auth)

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
const auth = firebase.auth();

let allFoodsData = [];
let cart = [];
let myOrderIds = [];
let isSingleOrder = false;
let singleItemData = {};
let selectedExtras = [];
let orderToCancelId = null;

let basePrice = 0, deliveryFee = 0, packingFee = 0, discountAmount = 0, appliedCouponCode = "", appliedDeliveryFee = 0;
let currentUser = null;
let userProfile = {};

// --- AUTHENTICATION & PROFILE LOGIC ---
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        if (document.getElementById('login-section')) {
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('profile-section').style.display = 'block';
            document.getElementById('user-dp').src = user.photoURL || 'https://via.placeholder.com/80';
            document.getElementById('user-name').innerText = user.displayName;
            document.getElementById('user-email').innerText = user.email;
        }
        
        db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists) {
                userProfile = doc.data();
                if (document.getElementById('profPhone')) document.getElementById('profPhone').value = userProfile.phone || '';
                if (document.getElementById('profAddress')) document.getElementById('profAddress').value = userProfile.address || '';
                
                if (document.getElementById('cusName')) document.getElementById('cusName').value = user.displayName;
                if (document.getElementById('cusPhone')) document.getElementById('cusPhone').value = userProfile.phone || '';
                if (document.getElementById('cusAddress')) document.getElementById('cusAddress').value = userProfile.address || '';
            } else {
                if (document.getElementById('cusName')) document.getElementById('cusName').value = user.displayName;
            }
        });

        if(document.getElementById('live-orders-container')) {
            fetchLiveTrackingOrders(user.uid);
        }

    } else {
        currentUser = null;
        userProfile = {};
        if (document.getElementById('login-section')) {
            document.getElementById('login-section').style.display = 'block';
            document.getElementById('profile-section').style.display = 'none';
        }
    }
});

function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(err => alert("Login Failed: " + err.message));
}

function logoutUser() {
    auth.signOut().then(() => { alert("Logged out successfully!"); window.location.href = 'index.html'; });
}

function saveProfileDetails() {
    if (!currentUser) return;
    const phone = document.getElementById('profPhone').value;
    const address = document.getElementById('profAddress').value;
    if(!phone || !address) return alert("Please fill both Phone and Address!");
    db.collection('users').doc(currentUser.uid).set({ phone, address }, { merge: true })
    .then(() => alert("Profile Details Saved! 💾\nIt will auto-fill during checkout."));
}

// --- INITIALIZATION ---
window.onload = function () {
    if(document.getElementById('menu-container')) showFoodMenu();
    if (localStorage.getItem('theme') === 'light') document.body.classList.add('light-mode');
    if (localStorage.getItem('myCart')) { cart = JSON.parse(localStorage.getItem('myCart')); updateCartUI(); }
    validateAndFetchOrders();
    fetchStoreFees();
};

function fetchStoreFees() {
    db.collection('settings').doc('fees').get().then(doc => {
        if (doc.exists) { deliveryFee = parseInt(doc.data().delivery) || 0; packingFee = parseInt(doc.data().packing) || 0; }
    });
}

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
}

function shareWebsite() {
    if (navigator.share) {
        navigator.share({ title: 'Foodies Hub', text: 'Order delicious food from Foodies Hub!', url: window.location.href })
        .catch(err => console.log('Sharing failed', err));
    } else { alert("Link copied: " + window.location.href); }
}

// --- BOOKING SYSTEM ---
function openBookingModal() { document.getElementById('bookingModal').style.display = 'block'; }
function closeBookingModal() { document.getElementById('bookingModal').style.display = 'none'; }
function submitBooking() {
    const name = document.getElementById('bookName').value;
    const phone = document.getElementById('bookPhone').value;
    const date = document.getElementById('bookDate').value;
    const time = document.getElementById('bookTime').value;
    const guests = document.getElementById('bookGuests').value;

    if (!name || !phone || !date || !time) return alert("Please fill all details!");
    db.collection("reservations").add({ name, phone, date, time, guests, status: "Pending", createdAt: firebase.firestore.FieldValue.serverTimestamp() })
    .then(() => { alert("Table Request Sent! Wait for confirmation."); closeBookingModal(); });
}

// --- MENU & RATING DISPLAY ---
function searchFood() {
    const q = document.getElementById('search-input').value.toLowerCase();
    const c = document.getElementById('menu-container'); c.innerHTML = '';
    const f = allFoodsData.filter(x => x.name.toLowerCase().includes(q));
    if (f.length === 0) { c.innerHTML = '<p>No food found 😢</p>'; return; }
    renderMenuData(f);
}

function showFoodMenu() {
    const container = document.getElementById('menu-container');
    if(!container) return;
    container.innerHTML = '<p>Loading...</p>';
    db.collection("menu_items").onSnapshot(snap => {
        allFoodsData = [];
        snap.forEach(doc => allFoodsData.push({ id: doc.id, ...doc.data() }));
        renderMenu('all');
    });
}

function renderMenu(category) {
    renderMenuData(category === 'all' ? allFoodsData : allFoodsData.filter(f => f.category === category));
}

function renderMenuData(foodList) {
    const container = document.getElementById('menu-container');
    if(!container) return; 
    container.innerHTML = '';
    foodList.forEach(food => {
        const img = food.image || 'https://via.placeholder.com/300';
        const desc = food.description ? food.description.replace(/'/g, "\\'") : "Tasty!";
        const extras = food.extras || "";
        
        let avgRating = 0;
        let reviews = food.ratingCount || 0;
        if(reviews > 0) avgRating = (food.ratingSum / reviews).toFixed(1);
        let starBadge = reviews > 0 
            ? `<div class="rating-badge"><span class="stars">⭐ ${avgRating}</span> <span class="reviews">(${reviews} reviews)</span></div>` 
            : `<div class="rating-badge"><span class="reviews">No reviews yet</span></div>`;
        
        let btnHTML = food.available
            ? `<div class="action-buttons">
                <button class="btn btn-buy" onclick="buyNow('${food.name}', ${food.price}, '${extras}')">Buy</button>
                <button class="btn btn-cart" onclick="addToCart('${food.name}', ${food.price})">Add</button>
               </div>`
            : `<button class="btn" style="background:#555; width:100%; margin-top:10px;" disabled>Out of Stock</button>`;
        
        container.innerHTML += `
            <div class="food-card">
                <div class="info-btn" onclick="showDetails('${food.name}', ${food.price}, '${img}', '${desc}')">ℹ️</div>
                <img src="${img}" onclick="showDetails('${food.name}', ${food.price}, '${img}', '${desc}')">
                <div class="card-body">
                    <span class="food-name">${food.name}</span>
                    ${starBadge}
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

// --- DETAILS & CART ---
let currentDetailItem = {};
function showDetails(name, price, img, desc) {
    currentDetailItem = { name, price };
    document.getElementById('detail-img').src = img;
    document.getElementById('detail-name').innerText = name;
    document.getElementById('detail-price').innerText = price + " Rs";
    document.getElementById('detail-desc').innerText = desc;
    document.getElementById('foodDetailsModal').style.display = 'block';
}
function addCurrentToCart() { addToCart(currentDetailItem.name, currentDetailItem.price); closeDetailsModal(); }
function closeDetailsModal() { document.getElementById('foodDetailsModal').style.display = 'none'; }

function addToCart(name, price) {
    let exist = cart.find(i => i.name === name);
    if (exist) exist.qty += 1; else cart.push({ name, price, qty: 1 });
    updateCartUI();
    const btn = event.target; const old = btn.innerText; btn.innerText = "✔"; setTimeout(() => btn.innerText = old, 1000);
}
function updateCartUI() {
    if(document.getElementById('cart-count')) document.getElementById('cart-count').innerText = cart.reduce((s, i) => s + i.qty, 0);
    localStorage.setItem('myCart', JSON.stringify(cart));
}

function openCartModal() {
    document.getElementById('cartModal').style.display = 'block';
    const box = document.getElementById('cart-items-container'); box.innerHTML = '';
    let total = 0;
    if (cart.length === 0) { box.innerHTML = '<p style="text-align:center;">Empty 😢</p>'; return; }
    cart.forEach((i, idx) => {
        let itemTot = parseInt(i.price) * i.qty; total += itemTot;
        box.innerHTML += `
            <div class="cart-item">
                <div style="flex:2;"><strong>${i.name}</strong><br><small>${i.price} Rs / each</small></div>
                <div style="flex:1; display:flex; align-items:center; gap:8px;">
                    <button class="qty-btn" onclick="changeQty(${idx}, -1)">-</button>
                    <span style="font-weight:bold;">${i.qty}</span>
                    <button class="qty-btn" onclick="changeQty(${idx}, 1)">+</button>
                </div>
                <div style="flex:1; text-align:right;"><span style="color:var(--primary-color); font-weight:bold;">${itemTot}</span><button class="remove-btn" onclick="remCart(${idx})" style="margin-left:5px;">✖</button></div>
            </div>`;
    });
    box.innerHTML += `<div class="cart-total">Cart Value: ${total} Rs</div>`;
}
function changeQty(idx, amt) { cart[idx].qty += amt; if (cart[idx].qty <= 0) cart.splice(idx, 1); updateCartUI(); openCartModal(); }
function remCart(idx) { cart.splice(idx, 1); updateCartUI(); openCartModal(); }
function closeCartModal() { document.getElementById('cartModal').style.display = 'none'; }

// --- CHECKOUT ---
function buyNow(name, price, extrasString) {
    isSingleOrder = true; singleItemData = { name, price, qty: 1 }; basePrice = parseInt(price);
    selectedExtras = []; discountAmount = 0; appliedCouponCode = ""; document.getElementById('couponInput').value = '';
    renderExtras(extrasString); calculateFinalBill(); document.getElementById('checkoutModal').style.display = 'block';
}
function proceedToCheckout() {
    if (cart.length === 0) return alert("Empty Cart!");
    isSingleOrder = false; closeCartModal(); document.getElementById('extras-container').style.display = 'none';
    discountAmount = 0; appliedCouponCode = ""; document.getElementById('couponInput').value = '';
    basePrice = cart.reduce((a, b) => a + (parseInt(b.price) * b.qty), 0);
    calculateFinalBill(); document.getElementById('checkoutModal').style.display = 'block';
}

function renderExtras(extrasStr) {
    const c = document.getElementById('extras-container'); const l = document.getElementById('extras-list'); l.innerHTML = '';
    if (!extrasStr) { c.style.display = 'none'; return; }
    c.style.display = 'block';
    extrasStr.split(',').forEach(item => {
        const p = item.split('=');
        if (p.length === 2) l.innerHTML += `<div class="extra-item"><label><input type="checkbox" onchange="toggleExtra('${p[0].trim()}', ${parseInt(p[1].trim())}, this)">${p[0].trim()} (+${parseInt(p[1].trim())} Rs)</label></div>`;
    });
}
function toggleExtra(name, price, checkbox) {
    if (checkbox.checked) selectedExtras.push({ name, price }); else selectedExtras = selectedExtras.filter(e => e.name !== name);
    calculateFinalBill();
}

function applyCoupon() {
    const code = document.getElementById('couponInput').value.toUpperCase().trim();
    if (!code) return alert("Enter coupon code!");
    db.collection('coupons').where('code', '==', code).get().then(snap => {
        if (snap.empty) { alert("Invalid Coupon!"); discountAmount = 0; appliedCouponCode = ""; }
        else { snap.forEach(doc => { discountAmount = parseInt(doc.data().discount); appliedCouponCode = code; alert(`Coupon Applied! Saved ${discountAmount} Rs 🎉`); }); }
        calculateFinalBill();
    });
}

function calculateFinalBill() {
    let subtotal = basePrice + selectedExtras.reduce((s, i) => s + i.price, 0);
    if (subtotal >= 600) { appliedDeliveryFee = 0; document.getElementById('summ-delivery').innerText = `₹0 (Free)`; document.getElementById('summ-delivery').style.color = '#2ed573'; }
    else { appliedDeliveryFee = deliveryFee; document.getElementById('summ-delivery').innerText = `₹${deliveryFee}`; document.getElementById('summ-delivery').style.color = '#ccc'; }
    document.getElementById('summ-subtotal').innerText = `₹${subtotal}`;
    document.getElementById('summ-packing').innerText = `₹${packingFee}`;
    document.getElementById('summ-discount').innerText = discountAmount > 0 ? `-₹${discountAmount}` : `₹0`;
    let finalTotal = (subtotal + packingFee + appliedDeliveryFee) - discountAmount;
    document.getElementById('final-checkout-price').innerText = `₹${finalTotal < 0 ? 0 : finalTotal}`;
}

function confirmOrder() {
    const name = document.getElementById('cusName').value;
    const phone = document.getElementById('cusPhone').value;
    const address = document.getElementById('cusAddress').value;
    const note = document.getElementById('cookingNote').value;
    if (!name || !phone) return alert("Need Name & Phone!");

    const orderId = '#ORD-' + Math.floor(100000 + Math.random() * 900000);
    let finalName = "";
    let orderedItemNames = isSingleOrder ? [singleItemData.name] : cart.map(i => i.name);
    let finalPrice = parseInt(document.getElementById('final-checkout-price').innerText.replace('₹', ''));

    if (isSingleOrder) {
        finalName = `1x ${singleItemData.name}`;
        if (selectedExtras.length > 0) finalName += ` (Extras: ${selectedExtras.map(e => e.name).join(",")})`;
    } else { finalName = cart.map(i => `${i.qty}x ${i.name}`).join(" + "); }

    let billDetails = `Packing: ₹${packingFee}, Delivery: ₹${appliedDeliveryFee}`;
    if (appliedCouponCode) billDetails += `, Coupon: ${appliedCouponCode} (-₹${discountAmount})`;

    db.collection("orders").add({
        orderId: orderId, 
        userId: currentUser ? currentUser.uid : "guest",
        orderedItemNames: orderedItemNames,
        customerName: name, phone, address, foodName: finalName, price: finalPrice, billDetails,
        status: "Pending", cancelReason: "", note: note || "", rating: 0, 
        orderTime: firebase.firestore.FieldValue.serverTimestamp()
    }).then((doc) => {
        alert(`Order Placed Successfully! ID: ${orderId} 🚀`);
        if (!isSingleOrder) { cart = []; updateCartUI(); }
        myOrderIds.push(doc.id); sessionStorage.setItem('myOrderIds', JSON.stringify(myOrderIds));
        closeCheckoutModal();
        if(!currentUser) { document.getElementById('cusName').value = ''; document.getElementById('cusPhone').value = ''; document.getElementById('cusAddress').value = ''; }
        document.getElementById('cookingNote').value = '';
        if(currentUser) window.location.href = 'profile.html'; else openMyOrders();
    });
}
function closeCheckoutModal() { document.getElementById('checkoutModal').style.display = 'none'; }

// --- 🔥 NORMAL HISTORY & RATING FIX (For Modal) ---
function validateAndFetchOrders() { if (sessionStorage.getItem('myOrderIds')) myOrderIds = JSON.parse(sessionStorage.getItem('myOrderIds')); }
function openMyOrders() {
    document.getElementById('myOrdersModal').style.display = 'block';
    const box = document.getElementById('order-history-list'); box.innerHTML = '<p>Loading...</p>';
    Promise.all(myOrderIds.map(id => db.collection("orders").doc(id).get())).then(docs => {
        box.innerHTML = '';
        docs.forEach(doc => {
            if (doc.exists) {
                const d = doc.data(); const st = d.status; const oid = d.orderId || 'N/A';
                let col = 'orange'; if(st === 'Delivered' || st === 'Accepted') col = '#2ed573'; if(st === 'Cancelled') col = '#ff4757'; if(st === 'Cancel Requested') col = '#e1b12c'; 

                let html = `<div class="order-item" style="display:block; text-align:left;"><div><small style="color:#aaa;">${oid}</small><br><b>${d.foodName}</b><br><span style="color:${col}; font-weight:bold;">${st} - ₹${d.price}</span>`;
                if (d.note) html += `<br><small style="color:orange;">📝 ${d.note}</small>`;
                if (d.cancelReason) html += `<br><small style="color:red;">❌ Reason: ${d.cancelReason}</small>`;
                
                // Rating System inside Modal (Fixed for 'Delivered')
                let itemsStr = d.orderedItemNames ? d.orderedItemNames.join(',') : '';
                if (st === 'Delivered' && (!d.rating || d.rating === 0)) {
                    let starHTML = '';
                    for (let i = 1; i <= 5; i++) {
                        starHTML += `<span class="star-input" style="font-size:25px; cursor:pointer;" onclick="rateFoodItems('${doc.id}', ${i}, '${itemsStr}', true)">★</span>`;
                    }
                    html += `<div style="margin-top:10px;"><small style="color:gold;">Rate this order:</small><div class="star-rating">${starHTML}</div></div>`;
                } else if (d.rating > 0) {
                    html += `<div style="color:gold; margin-top:5px;">⭐ Rated ${d.rating} Stars</div>`;
                }

                html += `</div>`;
                if (st === 'Pending') html += `<button onclick="initiateCancel('${doc.id}')" style="color:red;border:none;background:none;font-weight:bold; margin-top:10px;">Cancel Order</button>`;
                box.innerHTML += html + '</div>';
            }
        });
    });
}
function closeMyOrders() { document.getElementById('myOrdersModal').style.display = 'none'; }

function initiateCancel(id) {
    orderToCancelId = id; document.getElementById('cancelModal').style.display = 'block';
    document.querySelectorAll('input[name="cancelReason"]').forEach(radio => {
        radio.addEventListener('change', function () { document.getElementById('customCancelReason').style.display = this.value === 'Other' ? 'block' : 'none'; });
    });
}
function submitCancellation() {
    if (!orderToCancelId) return;
    let reason = ""; const radios = document.getElementsByName('cancelReason');
    for (let r of radios) { if (r.checked) { reason = r.value; break; } }
    if (reason === 'Other') reason = document.getElementById('customCancelReason').value;
    if (!reason) return alert("Please select a reason!");

    db.collection("orders").doc(orderToCancelId).update({ status: "Cancel Requested", cancelReason: reason }).then(() => {
        alert("Cancellation request sent to manager. ⏳"); closeCancelModal();
        if(document.getElementById('live-orders-container')) { /* Profile auto updates */ } else { openMyOrders(); }
    });
}
function closeCancelModal() { document.getElementById('cancelModal').style.display = 'none'; }

// --- LIVE TRACKING (For Logged in Profile) ---
function fetchLiveTrackingOrders(uid) {
    const box = document.getElementById('live-orders-container');
    db.collection("orders").where("userId", "==", uid).orderBy("orderTime", "desc").onSnapshot(snap => {
        box.innerHTML = '';
        if(snap.empty) { box.innerHTML = '<p style="color:#aaa;">No orders placed yet.</p>'; return; }

        snap.forEach(doc => {
            const d = doc.data(); const st = d.status;
            let s1='', s2='', s3='', s4='';
            let isCancelled = (st === 'Cancelled' || st === 'Cancel Requested');
            
            if(!isCancelled) {
                if (st === 'Pending') s1='active';
                else if (st === 'Preparing') { s1='completed'; s2='active'; }
                else if (st === 'Out for Delivery') { s1='completed'; s2='completed'; s3='active'; }
                else if (st === 'Delivered') { s1='completed'; s2='completed'; s3='completed'; s4='completed'; }
            }

            let timelineHTML = isCancelled ? `<p style="color:#ff4757; font-weight:bold; margin-top:10px;">Order ${st}</p>` : `
            <div class="timeline">
                <div class="timeline-step ${s1}"><b>Order Received</b><small>We have received your order</small></div>
                <div class="timeline-step ${s2}"><b>Preparing Food</b><small>Your food is being cooked 👨‍🍳</small></div>
                <div class="timeline-step ${s3}"><b>On the way</b><small>Delivery partner is on the way 🛵</small></div>
                <div class="timeline-step ${s4}"><b>Delivered</b><small>Enjoy your meal! 🎉</small></div>
            </div>`;

            let ratingHTML = '';
            let itemsStr = d.orderedItemNames ? d.orderedItemNames.join(',') : '';
            if (st === 'Delivered' && (!d.rating || d.rating === 0)) {
                let starHTML = '';
                for (let i = 1; i <= 5; i++) { starHTML += `<span class="star-input" style="font-size:25px; cursor:pointer;" onclick="rateFoodItems('${doc.id}', ${i}, '${itemsStr}')">★</span>`; }
                ratingHTML = `<div style="margin-top:15px; border-top:1px solid #444; padding-top:10px;"><p style="color:gold;">Rate this order:</p><div class="star-rating">${starHTML}</div></div>`;
            } else if (d.rating > 0) { ratingHTML = `<p style="color:gold; margin-top:10px;">⭐ You rated this ${d.rating} stars</p>`; }

            let cancelBtn = (st === 'Pending') ? `<button onclick="initiateCancel('${doc.id}')" style="background:#ff4757; color:white; border:none; padding:5px 10px; border-radius:5px; margin-top:10px; cursor:pointer;">Cancel Order</button>` : '';

            box.innerHTML += `
            <div class="live-track-box">
                <div style="display:flex; justify-content:space-between;"><b>${d.orderId || 'N/A'}</b> <b>₹${d.price}</b></div>
                <p style="color:#aaa; font-size:13px;">${d.foodName}</p>
                ${timelineHTML}
                ${ratingHTML}
                ${cancelBtn}
            </div>`;
        });
    });
}

// 🔥 GLOBAL RATING FUNCTION FIXED
window.rateFoodItems = function(orderId, rating, itemNamesStr, isFromModal = false) {
    db.collection('orders').doc(orderId).update({ rating: rating }).then(() => { 
        alert(`Thanks for rating ${rating} Stars! ⭐`); 
        if(isFromModal) openMyOrders();
    });
    if(itemNamesStr) {
        itemNamesStr.split(',').forEach(name => {
            if(!name) return;
            db.collection('menu_items').where('name', '==', name.trim()).get().then(snap => {
                snap.forEach(doc => {
                    db.collection('menu_items').doc(doc.id).update({
                        ratingSum: firebase.firestore.FieldValue.increment(rating),
                        ratingCount: firebase.firestore.FieldValue.increment(1)
                    });
                });
            });
        });
    }
};

function openAboutModal() { document.getElementById('aboutModal').style.display = 'block'; }
function closeAboutModal() { document.getElementById('aboutModal').style.display = 'none'; }
window.onclick = function (e) { if (e.target.className === 'modal') e.target.style.display = "none"; }