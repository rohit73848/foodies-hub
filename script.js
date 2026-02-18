// script.js - Final Version (All Features)

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
let currentFoodItem = {}; 
let myOrderIds = []; 

window.onload = function() {
    showFoodMenu();
    if(localStorage.getItem('theme') === 'light') document.body.classList.add('light-mode');
    validateAndFetchOrders();
};

// --- Theme Logic (New) ---
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    if(document.body.classList.contains('light-mode')) {
        localStorage.setItem('theme', 'light');
    } else {
        localStorage.setItem('theme', 'dark');
    }
}

function validateAndFetchOrders() {
    if(!sessionStorage.getItem('myOrderIds')) {
        document.getElementById('my-orders-count').innerText = 0;
        return;
    }
    let storedIds = JSON.parse(sessionStorage.getItem('myOrderIds'));
    let validIds = [];
    let count = 0;
    let promises = storedIds.map(id => db.collection("orders").doc(id).get());
    
    Promise.all(promises).then((docs) => {
        docs.forEach(doc => {
            if(doc.exists) {
                validIds.push(doc.id);
                count++;
            }
        });
        myOrderIds = validIds;
        sessionStorage.setItem('myOrderIds', JSON.stringify(myOrderIds));
        document.getElementById('my-orders-count').innerText = count;
    });
}

function showFoodMenu() {
    const container = document.getElementById('menu-container');
    container.innerHTML = '<p>Loading...</p>';
    db.collection("menu_items").onSnapshot((snapshot) => {
        allFoodsData = [];
        container.innerHTML = '';
        snapshot.forEach(doc => allFoodsData.push({ id: doc.id, ...doc.data() }));
        renderMenu('all');
    });
}

function renderMenu(category) {
    const container = document.getElementById('menu-container');
    container.innerHTML = '';
    const filtered = category === 'all' ? allFoodsData : allFoodsData.filter(f => f.category === category);
    
    filtered.forEach(food => {
        let btn = food.available 
            ? `<button class="order-btn" onclick="openOrderModal('${food.name}', '${food.price}')">Order Now</button>`
            : `<button class="order-btn" style="background:gray;" disabled>Out of Stock</button>`;
        
        const img = food.image || 'https://via.placeholder.com/300';
        container.innerHTML += `
            <div class="food-card">
                <img src="${img}">
                <div class="card-body">
                    <span class="food-name">${food.name}</span>
                    <span class="food-price">${food.price} Rs</span>
                    ${btn}
                </div>
            </div>`;
    });
}

function filterFood(cat) { 
    // Button Active Logic
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    const buttons = Array.from(document.querySelectorAll('.filter-btn'));
    const target = buttons.find(b => b.innerText.toLowerCase().includes(cat) || (cat==='all' && b.innerText==='All'));
    if(target) target.classList.add('active');
    
    renderMenu(cat); 
}

function openOrderModal(name, price) {
    currentFoodItem = { name, price };
    document.getElementById('selectedFoodName').innerText = `Item: ${name} (${price} Rs)`;
    document.getElementById('orderModal').style.display = 'block';
}

function confirmOrder() {
    const name = document.getElementById('cusName').value;
    const phone = document.getElementById('cusPhone').value;
    const address = document.getElementById('cusAddress').value;

    if(!name || !phone) return alert("Name & Phone required!");

    db.collection("orders").add({
        customerName: name, phone, address,
        foodName: currentFoodItem.name,
        price: currentFoodItem.price,
        status: "Pending",
        cancelledBy: null, 
        orderTime: firebase.firestore.FieldValue.serverTimestamp()
    }).then((doc) => {
        alert("Order Success! ✅");
        myOrderIds.push(doc.id);
        sessionStorage.setItem('myOrderIds', JSON.stringify(myOrderIds));
        validateAndFetchOrders(); 
        closeModal();
    });
}

function closeModal() { document.getElementById('orderModal').style.display = 'none'; }

function openMyOrders() {
    document.getElementById('myOrdersModal').style.display = 'block';
    const pendingList = document.getElementById('list-pending');
    const acceptedList = document.getElementById('list-accepted');
    const cancelledList = document.getElementById('list-cancelled');
    
    pendingList.innerHTML = acceptedList.innerHTML = cancelledList.innerHTML = '<p style="font-size:12px; color:gray;">Loading...</p>';

    let promises = myOrderIds.map(id => db.collection("orders").doc(id).get());
    Promise.all(promises).then((docs) => {
        pendingList.innerHTML = acceptedList.innerHTML = cancelledList.innerHTML = '';
        let pCount=0, aCount=0, cCount=0;

        docs.forEach(doc => {
            if(doc.exists) {
                const data = doc.data();
                const date = data.orderTime ? new Date(data.orderTime.toDate()).toLocaleString() : 'Just now';
                let itemHTML = `
                    <div class="order-item">
                        <strong>${data.foodName}</strong> (${data.price} Rs)<br>
                        <span class="order-time">📅 ${date}</span>
                `;

                if(data.status === 'Pending') {
                    pCount++;
                    itemHTML += `<button onclick="cancelOrder('${doc.id}')" style="background:red; color:white; border:none; padding:5px; border-radius:5px; margin-top:5px; cursor:pointer;">Cancel ❌</button></div>`;
                    pendingList.innerHTML += itemHTML;
                } else if(data.status === 'Accepted') {
                    aCount++;
                    itemHTML += `<span style="color:#2ed573; font-size:12px;">Being prepared... 🍳</span></div>`;
                    acceptedList.innerHTML += itemHTML;
                } else if(data.status === 'Cancelled') {
                    cCount++;
                    let reason = data.cancelledBy === 'admin' ? "❌ Cancelled by Restaurant" : "🗑️ Cancelled by You";
                    itemHTML += `<span class="cancel-info">${reason}</span></div>`;
                    cancelledList.innerHTML += itemHTML;
                }
            }
        });
        document.getElementById('count-pending').innerText = pCount;
        document.getElementById('count-accepted').innerText = aCount;
        document.getElementById('count-cancelled').innerText = cCount;
    });
}

function cancelOrder(id) {
    if(confirm("Cancel this order?")) {
        db.collection("orders").doc(id).update({
            status: "Cancelled",
            cancelledBy: "customer"
        }).then(() => {
            alert("Order Cancelled.");
            openMyOrders(); 
            validateAndFetchOrders(); 
        });
    }
}

function closeMyOrders() { document.getElementById('myOrdersModal').style.display = 'none'; }
window.onclick = function(e) {
    if(e.target == document.getElementById('orderModal')) closeModal();
    if(e.target == document.getElementById('myOrdersModal')) closeMyOrders();
}