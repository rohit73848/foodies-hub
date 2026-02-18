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

// থিম সেটআপ
window.onload = function() {
    if(localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-mode');
    }
    renderFoodTable();
    renderOrders();
};

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    if(document.body.classList.contains('light-mode')) {
        localStorage.setItem('theme', 'light');
    } else {
        localStorage.setItem('theme', 'dark');
    }
}

// টেবিল রেন্ডার
function renderFoodTable() {
    const tableBody = document.getElementById('admin-food-list');
    db.collection("menu_items").onSnapshot((querySnapshot) => {
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
                    <td><button onclick="deleteFood('${id}')" style="color:red; border:none; background:none; cursor:pointer;">❌</button></td>
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

// অর্ডার ম্যানেজমেন্ট
function renderOrders() {
    const orderTable = document.getElementById('admin-order-list');
    db.collection("orders").orderBy("orderTime", "desc").onSnapshot((querySnapshot) => {
        orderTable.innerHTML = '';
        if (querySnapshot.empty) {
            orderTable.innerHTML = '<tr><td colspan="5" style="text-align:center;">No Orders Yet.</td></tr>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const order = doc.data();
            const id = doc.id;
            let statusColor = 'orange';
            if (order.status === 'Accepted') statusColor = 'green';
            if (order.status === 'Cancelled') statusColor = 'red';

            const row = `
                <tr>
                    <td><strong>${order.customerName}</strong><br><small>📞 ${order.phone}</small></td>
                    <td>${order.foodName}<br><span style="color:var(--primary-color); font-weight:bold;">${order.price} Rs</span></td>
                    <td><small>${order.address}</small></td>
                    <td><span style="color:${statusColor}; font-weight:bold;">${order.status}</span></td>
                    <td>
                        ${order.status === 'Pending' ? `
                            <button onclick="updateOrderStatus('${id}', 'Accepted')" style="background:#2ed573; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:5px;">✔</button>
                            <button onclick="updateOrderStatus('${id}', 'Cancelled')" style="background:#ff4757; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:5px;">✖</button>
                        ` : ''}
                        <button onclick="deleteOrder('${id}')" style="margin-left:5px; background:#555; color:white; border:none; cursor:pointer; padding:5px; border-radius:5px;">🗑️</button>
                    </td>
                </tr>
            `;
            orderTable.innerHTML += row;
        });
    });
}

function updateOrderStatus(id, newStatus) {
    db.collection("orders").doc(id).update({ status: newStatus });
}

function deleteOrder(id) {
    if(confirm("Delete order record?")) {
        db.collection("orders").doc(id).delete();
    }
}