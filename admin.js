// admin.js - Complete Version (Stock Control + Orders + Theme)

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

// পেজ লোড হলে যা যা হবে
window.onload = function() {
    // থিম চেক
    if(localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-mode');
    }
    renderOrders();     // অর্ডার লোড হবে
    renderFoodTable();  // ফুড লিস্ট লোড হবে (এটা আগেরবার মিসিং ছিল)
};

// --- Theme Logic ---
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    if(document.body.classList.contains('light-mode')) {
        localStorage.setItem('theme', 'light');
    } else {
        localStorage.setItem('theme', 'dark');
    }
}

// --- 1. Order Management ---
function renderOrders() {
    const orderTable = document.getElementById('admin-order-list');
    db.collection("orders").orderBy("orderTime", "desc").onSnapshot((snapshot) => {
        orderTable.innerHTML = '';
        if(snapshot.empty) { 
            orderTable.innerHTML = '<tr><td colspan="5" style="text-align:center">No Orders</td></tr>'; 
            return; 
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.orderTime ? new Date(data.orderTime.toDate()).toLocaleString() : '';
            
            let color = 'orange';
            if(data.status === 'Accepted') color = 'green';
            if(data.status === 'Cancelled') color = 'red';

            const row = `
                <tr>
                    <td>
                        <strong>${data.customerName}</strong><br>
                        <small>${data.phone}</small>
                    </td>
                    <td>
                        ${data.foodName} (${data.price} Rs)<br>
                        <small style="color:var(--text-color); opacity:0.7;">${date}</small>
                    </td>
                    <td><small>${data.address}</small></td>
                    <td><span style="color:${color}; font-weight:bold;">${data.status}</span></td>
                    <td>
                        ${data.status === 'Pending' ? `
                            <button onclick="updateStatus('${doc.id}', 'Accepted')" style="background:#2ed573; color:white; border:none; padding:5px; border-radius:5px; cursor:pointer;">✔ Accept</button>
                            <button onclick="updateStatus('${doc.id}', 'Cancelled')" style="background:#ff4757; color:white; border:none; padding:5px; border-radius:5px; cursor:pointer;">✖ Cancel</button>
                        ` : ''}
                        <button onclick="deleteOrder('${doc.id}')" style="background:#555; border:none; padding:5px; border-radius:5px; cursor:pointer;">🗑️</button>
                    </td>
                </tr>`;
            orderTable.innerHTML += row;
        });
    });
}

function updateStatus(id, status) {
    let updateData = { status: status };
    if(status === 'Cancelled') {
        updateData.cancelledBy = 'admin';
    }
    db.collection("orders").doc(id).update(updateData);
}

function deleteOrder(id) {
    if(confirm("Delete permanently?")) db.collection("orders").doc(id).delete();
}

// --- 2. Food List & Stock Control (Restored) ---
function renderFoodTable() {
    const tableBody = document.getElementById('admin-food-list');
    
    db.collection("menu_items").orderBy("createdAt", "desc").onSnapshot((querySnapshot) => {
        tableBody.innerHTML = '';

        querySnapshot.forEach((doc) => {
            const food = doc.data();
            const id = doc.id;
            const statusText = food.available ? "In Stock" : "Out of Stock";
            const statusClass = food.available ? "in-stock" : "out-stock";
            const imageUrl = food.image ? food.image : 'https://via.placeholder.com/100';

            const row = `
                <tr>
                    <td><img src="${imageUrl}" width="50" style="border-radius:5px;"></td>
                    <td>${food.name}</td>
                    <td>${food.price} Rs</td>
                    <td>
                        <button class="stock-btn ${statusClass}" onclick="toggleStock('${id}', ${food.available})">${statusText}</button>
                    </td>
                    <td><button onclick="deleteFood('${id}')" style="color:red; border:none; background:none; cursor:pointer; font-size:18px;">❌</button></td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    });
}

function addNewFood() {
    const name = document.getElementById('foodName').value;
    const price = document.getElementById('foodPrice').value;
    const image = document.getElementById('foodImage').value;
    const category = document.getElementById('foodCategory').value;

    if(!name || !price || category === 'all') {
        alert("Please fill all fields!");
        return;
    }

    db.collection("menu_items").add({
        name: name,
        price: price,
        image: image,
        category: category,
        available: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert("Food Added!");
        document.getElementById('foodName').value = '';
        document.getElementById('foodPrice').value = '';
        document.getElementById('foodImage').value = '';
        document.getElementById('foodCategory').value = 'all';
    });
}

function toggleStock(id, currentStatus) {
    db.collection("menu_items").doc(id).update({ available: !currentStatus });
}

function deleteFood(id) {
    if(confirm("Delete item?")) {
        db.collection("menu_items").doc(id).delete();
    }
}