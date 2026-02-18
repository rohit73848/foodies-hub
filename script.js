// ১. ফায়ারবেস কনফিগারেশন
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

// গ্লোবাল ভেরিয়েবল
let allFoodsData = []; 
let currentFoodItem = {}; 
let orderCount = 0; // কার্ট গণনার জন্য

// ২. থিম এবং কার্ট সেটআপ (পেজ লোড হলে)
window.onload = function() {
    showFoodMenu();
    
    // থিম চেক
    if(localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-mode');
    }

    // কার্ট চেক (Session Storage ব্যবহার করে)
    if(sessionStorage.getItem('myOrderCount')) {
        orderCount = parseInt(sessionStorage.getItem('myOrderCount'));
        document.getElementById('cart-count').innerText = orderCount;
    }
};

// ৩. থিম টগল ফাংশন
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    // সেভ করে রাখা যাতে রিফ্রেশে না যায়
    if(document.body.classList.contains('light-mode')) {
        localStorage.setItem('theme', 'light');
    } else {
        localStorage.setItem('theme', 'dark');
    }
}

// ৪. মেনু লোড
function showFoodMenu() {
    const container = document.getElementById('menu-container');
    container.innerHTML = '<p style="text-align:center;">Loading menu...</p>';

    db.collection("menu_items").onSnapshot((querySnapshot) => {
        allFoodsData = [];
        querySnapshot.forEach((doc) => {
            allFoodsData.push({ id: doc.id, ...doc.data() });
        });
        renderMenu('all');
    });
}

// ৫. রেন্ডার এবং ফিল্টার
function renderMenu(category) {
    const container = document.getElementById('menu-container');
    container.innerHTML = '';

    const filteredFoods = category === 'all' 
        ? allFoodsData 
        : allFoodsData.filter(food => food.category === category);

    if (filteredFoods.length === 0) {
        container.innerHTML = '<p style="text-align:center;">No items found.</p>';
        return;
    }

    filteredFoods.forEach((food) => {
        let buttonHTML = food.available 
            ? `<button class="order-btn" onclick="openOrderModal('${food.name}', '${food.price}')">Order Now</button>`
            : `<button class="order-btn out-of-stock" disabled>Out of Stock</button>`;

        const imageUrl = food.image ? food.image : 'https://via.placeholder.com/300';

        const cardHTML = `
            <div class="food-card">
                <img src="${imageUrl}" alt="${food.name}">
                <div class="card-body">
                    <span class="food-name">${food.name}</span>
                    <span class="food-price">${food.price} Rupees</span>
                    ${buttonHTML}
                </div>
            </div>
        `;
        container.innerHTML += cardHTML;
    });
}

// ৬. ফিল্টার বাটন লজিক (আপনার সমস্যা ফিক্স করা হয়েছে)
function filterFood(category) {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        // একদম স্পেসিফিক ম্যাচিং
        if(btn.innerText.toLowerCase().includes(category) || (category === 'all' && btn.innerText === 'All')) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    renderMenu(category);
}

// ৭. অর্ডার মডাল
function openOrderModal(name, price) {
    currentFoodItem = { name, price };
    document.getElementById('selectedFoodName').innerText = `Ordering: ${name} - ${price} Rupees`;
    document.getElementById('orderModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('orderModal').style.display = 'none';
}

// ৮. অর্ডার কনফার্ম এবং কার্ট আপডেট
function confirmOrder() {
    const name = document.getElementById('cusName').value;
    const phone = document.getElementById('cusPhone').value;
    const address = document.getElementById('cusAddress').value;

    if(!name || !phone || !address) {
        alert("Please fill all details! ⚠️");
        return;
    }

    db.collection("orders").add({
        customerName: name,
        phone: phone,
        address: address,
        foodName: currentFoodItem.name,
        price: currentFoodItem.price,
        status: "Pending",
        orderTime: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert("Order Placed Successfully! 🚀");
        
        // কার্ট আপডেট করা
        orderCount++;
        document.getElementById('cart-count').innerText = orderCount;
        sessionStorage.setItem('myOrderCount', orderCount); // সেভ রাখা

        closeModal();
        document.getElementById('cusName').value = '';
        document.getElementById('cusPhone').value = '';
        document.getElementById('cusAddress').value = '';
    }).catch((error) => {
        alert("Error: " + error.message);
    });
}

window.onclick = function(event) {
    const modal = document.getElementById('orderModal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}