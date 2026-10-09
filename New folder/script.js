const API = "http://localhost:5000";

// =====================================
// ELEMENTS
// =====================================

const packageCards = document.querySelectorAll(".package-card");

const playerUID = document.getElementById("playerUID");
const username = document.getElementById("username");

const minusBtn = document.getElementById("minusBtn");
const plusBtn = document.getElementById("plusBtn");
const quantityDisplay = document.getElementById("quantityDisplay");

const totalPrice = document.getElementById("totalPrice");
const startingPrice = document.getElementById("startingPrice");

const addToCartBtn = document.getElementById("addToCartBtn");

const openCartBtn = document.getElementById("openCartBtn");
const closeCartBtn = document.getElementById("closeCartBtn");

const cartOverlay = document.getElementById("cartOverlay");
const cartItems = document.getElementById("cartItems");
const cartGrandTotal = document.getElementById("cartGrandTotal");

const checkoutBtn = document.getElementById("checkoutBtn");
const cartCount = document.getElementById("cartCount");

// =====================================
// VARIABLES
// =====================================

let selectedPackage = null;
let basePrice = 0;
let quantity = 1;

let cart = JSON.parse(
    localStorage.getItem("topUpCart")
) || [];

// =====================================
// CUSTOMER ORDER HISTORY
// =====================================

function getCustomerOrderHistory() {

    try {

        return JSON.parse(
            localStorage.getItem("topUpOrderHistory")
        ) || [];

    } catch (error) {

        console.error(
            "Order history read error:",
            error
        );

        return [];

    }

}

function saveCustomerOrderHistory(history) {

    localStorage.setItem(
        "topUpOrderHistory",
        JSON.stringify(history)
    );

}

function saveOrderToCustomerHistory(order) {

    if (!order || !order.orderId) {
        return;
    }

    let history =
        getCustomerOrderHistory();

    // Prevent duplicate order
    const alreadyExists =
        history.some(
            item =>
                String(item.orderId) ===
                String(order.orderId)
        );

    if (alreadyExists) {
        return;
    }

    history.push({

        orderId:
            order.orderId,

        items:
            Array.isArray(order.items)
                ? order.items
                : [],

        total:
            Number(order.total || 0),

        status:
            order.status || "Pending",

        createdAt:
            order.createdAt ||
            new Date().toISOString(),

        paymentMethod:
            order.paymentMethod ||
            "eSewa"

    });

    // Newest order first
    history.sort(
        (a, b) =>
            new Date(b.createdAt) -
            new Date(a.createdAt)
    );

    saveCustomerOrderHistory(history);

}

// =====================================
// LOAD PACKAGE PRICES
// =====================================

async function loadPackages() {

    try {

        const response = await fetch(
            API + "/api/packages?t=" + Date.now(),
            {
                cache: "no-store"
            }
        );

        const data = await response.json();

        if (!data.success) {
            console.error("Package loading failed.");
            return;
        }

        packageCards.forEach(card => {

            const nameElement =
                card.querySelector("h3");

            const priceElement =
                card.querySelector(".price");

            if (!nameElement || !priceElement) {
                return;
            }

            const packageName =
                nameElement.textContent.trim();

            const packageData =
                data.packages.find(item =>
                    item.name.toLowerCase() ===
                    packageName.toLowerCase()
                );

            if (!packageData) {
                return;
            }

            priceElement.textContent =
                "Rs." + packageData.price;

            card.dataset.price =
                packageData.price;

            if (card.classList.contains("active")) {

                selectedPackage = {

                    id:
                        packageData.id,

                    name:
                        packageData.name,

                    price:
                        Number(packageData.price)

                };

                basePrice =
                    Number(packageData.price);

                updateTotal();

            }

        });

        if (
            !selectedPackage &&
            packageCards.length > 0
        ) {

            packageCards[0].click();

        }

        if (
            data.packages.length > 0 &&
            startingPrice
        ) {

            startingPrice.textContent =
                "Starting from Rs." +
                data.packages[0].price;

        }

    } catch (error) {

        console.error(
            "Package loading error:",
            error
        );

    }

}

// =====================================
// PACKAGE SELECT
// =====================================

packageCards.forEach(card => {

    card.addEventListener("click", () => {

        packageCards.forEach(item => {

            item.classList.remove("active");
            item.classList.remove("selected");

        });

        card.classList.add("active");

        const packageNameElement =
            card.querySelector("h3");

        const packageName =
            packageNameElement
                ? packageNameElement.textContent.trim()
                : "";

        const priceElement =
            card.querySelector(".price");

        const priceText =
            priceElement
                ? priceElement.textContent
                : "0";

        const price =
            parseFloat(
                priceText
                    .replace("Rs.", "")
                    .replace("Rs", "")
                    .replace(",", "")
                    .trim()
            );

        if (
            !packageName ||
            !Number.isFinite(price)
        ) {

            console.error(
                "Package data error:",
                {
                    packageName,
                    price
                }
            );

            return;

        }

        selectedPackage = {

            id:
                packageName
                    .toLowerCase()
                    .replace(" diamonds", ""),

            name:
                packageName,

            price:
                price

        };

        basePrice = price;

        quantity = 1;

        if (quantityDisplay) {

            quantityDisplay.textContent =
                quantity;

        }

        updateTotal();

    });

});

// =====================================
// QUANTITY PLUS
// =====================================

if (plusBtn) {

    plusBtn.addEventListener(
        "click",
        () => {

            quantity++;

            if (quantityDisplay) {

                quantityDisplay.textContent =
                    quantity;

            }

            updateTotal();

        }
    );

}

// =====================================
// QUANTITY MINUS
// =====================================

if (minusBtn) {

    minusBtn.addEventListener(
        "click",
        () => {

            if (quantity > 1) {
                quantity--;
            }

            if (quantityDisplay) {

                quantityDisplay.textContent =
                    quantity;

            }

            updateTotal();

        }
    );

}

// =====================================
// UPDATE TOTAL
// =====================================

function updateTotal() {

    const total =
        basePrice * quantity;

    if (totalPrice) {

        totalPrice.textContent =
            "Rs." + total;

    }

}

// =====================================
// SAVE CART
// =====================================

function saveCart() {

    localStorage.setItem(
        "topUpCart",
        JSON.stringify(cart)
    );

}

// =====================================
// ADD TO CART
// =====================================

if (addToCartBtn) {

    addToCartBtn.addEventListener(
        "click",
        () => {

            if (!selectedPackage) {

                alert(
                    "Please select a diamond package."
                );

                return;

            }

            const uid =
                playerUID?.value.trim() || "";

            const user =
                username?.value.trim() || "";

            if (!uid) {

                alert(
                    "Please enter Player UID."
                );

                playerUID?.focus();

                return;

            }

            if (!user) {

                alert(
                    "Please enter Username."
                );

                username?.focus();

                return;

            }

            const item = {

                package:
                    selectedPackage.name,

                packageId:
                    selectedPackage.id,

                price:
                    selectedPackage.price,

                quantity:
                    quantity,

                uid:
                    uid,

                username:
                    user

            };

            cart.push(item);

            saveCart();

            renderCart();

            alert(
                "Added to cart successfully!"
            );

            openCart();

        }
    );

}

// =====================================
// CART COUNT
// =====================================

function updateCartCount() {

    const count =
        cart.reduce(
            (total, item) =>
                total +
                Number(item.quantity || 1),
            0
        );

    if (cartCount) {

        cartCount.textContent =
            count;

    }

}

// =====================================
// RENDER CART
// =====================================

function renderCart() {

    if (!cartItems) {
        return;
    }

    cartItems.innerHTML = "";

    let grandTotal = 0;

    if (cart.length === 0) {

        cartItems.innerHTML = `
            <div style="
                text-align:center;
                padding:30px;
                color:#aaa;
            ">
                Your cart is empty.
            </div>
        `;

        if (cartGrandTotal) {

            cartGrandTotal.textContent =
                "Rs.0";

        }

        updateCartCount();

        return;

    }

    cart.forEach(
        (item, index) => {

            const itemTotal =
                Number(item.price) *
                Number(item.quantity || 1);

            grandTotal += itemTotal;

            const div =
                document.createElement("div");

            div.className =
                "cart-item";

            div.innerHTML = `

                <div>

                    <strong>
                        ${escapeHtml(item.package)}
                    </strong>

                    <div style="
                        font-size:13px;
                        color:#aaa;
                        margin-top:4px;
                    ">
                        UID:
                        ${escapeHtml(item.uid)}
                    </div>

                    <div style="
                        font-size:13px;
                        color:#aaa;
                    ">
                        Username:
                        ${escapeHtml(item.username)}
                    </div>

                    <div style="
                        margin-top:5px;
                        font-weight:bold;
                    ">
                        Rs.${itemTotal}
                    </div>

                </div>

                <button
                    onclick="removeCartItem(${index})"
                    style="
                        background:#ff4757;
                        color:white;
                        border:0;
                        padding:7px 10px;
                        border-radius:7px;
                        cursor:pointer;
                    "
                >
                    Remove
                </button>

            `;

            cartItems.appendChild(div);

        }
    );

    if (cartGrandTotal) {

        cartGrandTotal.textContent =
            "Rs." + grandTotal;

    }

    updateCartCount();

}

// =====================================
// REMOVE CART ITEM
// =====================================

window.removeCartItem =
    function(index) {

        cart.splice(index, 1);

        saveCart();

        renderCart();

    };

// =====================================
// OPEN CART
// =====================================

function openCart() {

    if (!cartOverlay) {
        return;
    }

    cartOverlay.classList.add("show");

    cartOverlay.style.display =
        "flex";

}

window.openCart =
    openCart;

// =====================================
// CLOSE CART
// =====================================

function closeCart() {

    if (!cartOverlay) {
        return;
    }

    cartOverlay.classList.remove("show");

    cartOverlay.style.display =
        "none";

}

window.closeCart =
    closeCart;

if (openCartBtn) {

    openCartBtn.addEventListener(
        "click",
        openCart
    );

}

if (closeCartBtn) {

    closeCartBtn.addEventListener(
        "click",
        closeCart
    );

}

// =====================================
// ESCAPE HTML
// =====================================

function escapeHtml(text) {

    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}

// =====================================
// ESEWA PAYMENT MODAL
// =====================================

function createPaymentModal() {

    if (
        document.getElementById(
            "esewaPaymentModal"
        )
    ) {

        return;

    }

    const modal =
        document.createElement("div");

    modal.id =
        "esewaPaymentModal";

    modal.innerHTML = `

        <div style="
            position:fixed;
            inset:0;
            background:rgba(0,0,0,0.82);
            display:flex;
            align-items:center;
            justify-content:center;
            z-index:99999;
            padding:15px;
        ">

            <div style="
                width:100%;
                max-width:450px;
                max-height:92vh;
                overflow-y:auto;
                background:#1a1d24;
                border-radius:18px;
                padding:22px;
                box-sizing:border-box;
                color:white;
                box-shadow:0 20px 60px rgba(0,0,0,0.6);
                border:1px solid #30343d;
            ">

                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    margin-bottom:15px;
                ">

                    <h2 style="
                        margin:0;
                        color:#5eead4;
                    ">
                        eSewa Payment
                    </h2>

                    <button
                        id="closeEsewaBtn"
                        style="
                            background:#ff4757;
                            border:0;
                            color:white;
                            width:34px;
                            height:34px;
                            border-radius:50%;
                            font-size:20px;
                            cursor:pointer;
                        "
                    >
                        ×
                    </button>

                </div>

                <div style="
                    background:#111318;
                    padding:15px;
                    border-radius:12px;
                    margin-bottom:15px;
                ">

                    <div style="
                        color:#aaa;
                        font-size:13px;
                    ">
                        Pay to eSewa Number
                    </div>

                    <div style="
                        font-size:24px;
                        font-weight:bold;
                        margin-top:5px;
                        letter-spacing:1px;
                    ">
                        9713989938
                    </div>

                </div>

                <div style="
                    text-align:center;
                    margin-bottom:15px;
                ">

                    <div style="
                        font-weight:bold;
                        margin-bottom:10px;
                    ">
                        Scan QR Code
                    </div>

                    <img
                        src="Gemini_Generated_Image_m13y91m13y91m13y copy.jpg"
                        alt="eSewa QR Code"
                        style="
                            width:230px;
                            max-width:100%;
                            border-radius:12px;
                            background:white;
                            padding:8px;
                            box-sizing:border-box;
                        "
                    >

                </div>

                <div style="
                    background:#2a2020;
                    border:1px solid #633535;
                    padding:12px;
                    border-radius:10px;
                    font-size:14px;
                    line-height:1.5;
                    margin-bottom:18px;
                ">

                    <strong>Important:</strong><br>

                    Pay the exact order amount to the eSewa
                    number or scan the QR code above.

                    After payment, upload your payment
                    screenshot below.

                </div>

                <label style="
                    display:block;
                    font-weight:bold;
                    margin-bottom:8px;
                ">
                    Payment Screenshot
                </label>

                <input
                    type="file"
                    id="paymentScreenshot"
                    accept="image/*"
                    style="
                        width:100%;
                        box-sizing:border-box;
                        background:#111318;
                        color:white;
                        border:1px solid #3a3f48;
                        padding:10px;
                        border-radius:8px;
                    "
                >

                <div
                    id="paymentPreview"
                    style="
                        margin-top:12px;
                        text-align:center;
                    "
                ></div>

                <button
                    id="submitPaymentBtn"
                    style="
                        width:100%;
                        margin-top:18px;
                        padding:14px;
                        border:0;
                        border-radius:10px;
                        background:#ff4757;
                        color:white;
                        font-size:16px;
                        font-weight:bold;
                        cursor:pointer;
                    "
                >
                    Submit Payment & Order
                </button>

                <div
                    id="paymentMessage"
                    style="
                        text-align:center;
                        margin-top:10px;
                        font-size:13px;
                        color:#aaa;
                    "
                ></div>

            </div>

        </div>
    `;

    document.body.appendChild(modal);

    document
        .getElementById("closeEsewaBtn")
        .addEventListener(
            "click",
            () => modal.remove()
        );

    document
        .getElementById("paymentScreenshot")
        .addEventListener(
            "change",
            previewPaymentImage
        );

    document
        .getElementById("submitPaymentBtn")
        .addEventListener(
            "click",
            submitPayment
        );

}

// =====================================
// PAYMENT IMAGE PREVIEW
// =====================================

function previewPaymentImage(event) {

    const file =
        event.target.files[0];

    const preview =
        document.getElementById(
            "paymentPreview"
        );

    if (!file || !preview) {
        return;
    }

    if (!file.type.startsWith("image/")) {

        alert(
            "Please select an image."
        );

        event.target.value = "";

        return;

    }

    const reader =
        new FileReader();

    reader.onload =
        function(e) {

            preview.innerHTML = `

                <img
                    src="${e.target.result}"
                    style="
                        max-width:100%;
                        max-height:180px;
                        border-radius:10px;
                        border:1px solid #444;
                    "
                >

            `;

        };

    reader.readAsDataURL(file);

}

// =====================================
// IMAGE TO BASE64
// =====================================

function fileToBase64(file) {

    return new Promise(
        (resolve, reject) => {

            const reader =
                new FileReader();

            reader.onload =
                () => resolve(
                    reader.result
                );

            reader.onerror =
                reject;

            reader.readAsDataURL(file);

        }
    );

}

// =====================================
// SUBMIT PAYMENT
// =====================================

async function submitPayment() {

    const fileInput =
        document.getElementById(
            "paymentScreenshot"
        );

    const submitBtn =
        document.getElementById(
            "submitPaymentBtn"
        );

    const message =
        document.getElementById(
            "paymentMessage"
        );

    if (
        !fileInput ||
        !fileInput.files.length
    ) {

        alert(
            "Please upload your payment screenshot."
        );

        return;

    }

    if (cart.length === 0) {

        alert(
            "Your cart is empty."
        );

        return;

    }

    const file =
        fileInput.files[0];

    if (!file.type.startsWith("image/")) {

        alert(
            "Please upload an image screenshot."
        );

        return;

    }

    if (
        file.size >
        8 * 1024 * 1024
    ) {

        alert(
            "Screenshot must be smaller than 8 MB."
        );

        return;

    }

    try {

        submitBtn.disabled = true;

        submitBtn.textContent =
            "Submitting...";

        if (message) {

            message.textContent =
                "Please wait...";

        }

        const screenshot =
            await fileToBase64(file);

        const cleanItems =
            cart.map(item => ({

                package:
                    String(
                        item.package || ""
                    ).trim(),

                packageId:
                    String(
                        item.packageId || ""
                    ).trim(),

                price:
                    Number(item.price || 0),

                quantity:
                    Number(
                        item.quantity || 1
                    ),

                uid:
                    String(
                        item.uid || ""
                    ).trim(),

                username:
                    String(
                        item.username || ""
                    ).trim()

            }));

        const response =
            await fetch(
                API + "/api/orders",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        items:
                            cleanItems,

                        paymentMethod:
                            "eSewa",

                        paymentNumber:
                            "9713989938",

                        paymentScreenshot:
                            screenshot,

                        paymentSubmittedAt:
                            new Date()
                                .toISOString()

                    })

                }
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Order submission failed."
            );

        }

        // =====================================
        // SAVE ORDER TO CUSTOMER HISTORY
        // =====================================

        const localOrder = {

            orderId:
                data.orderId,

            items:
                cleanItems,

            total:
                Number(
                    data.total ||
                    cleanItems.reduce(
                        (sum, item) =>
                            sum +
                            Number(item.price || 0) *
                            Number(item.quantity || 1),
                        0
                    )
                ),

            status:
                data.status ||
                "Pending",

            createdAt:
                data.createdAt ||
                new Date().toISOString(),

            paymentMethod:
                "eSewa"

        };

        saveOrderToCustomerHistory(
            localOrder
        );

        alert(
            "Payment submitted successfully!\n\n" +
            "Order ID: " +
            data.orderId
        );

        // Clear cart
        cart = [];

        saveCart();

        renderCart();

        const modal =
            document.getElementById(
                "esewaPaymentModal"
            );

        if (modal) {
            modal.remove();
        }

        closeCart();

    } catch (error) {

        console.error(
            "ORDER ERROR:",
            error
        );

        alert(
            "Order submit नहीं हुआ.\n\n" +
            error.message
        );

        if (message) {

            message.textContent =
                "Something went wrong. Please try again.";

        }

        submitBtn.disabled = false;

        submitBtn.textContent =
            "Submit Payment & Order";

    }

}

// =====================================
// CHECKOUT BUTTON
// =====================================

if (checkoutBtn) {

    checkoutBtn.addEventListener(
        "click",
        () => {

            if (cart.length === 0) {

                alert(
                    "Your cart is empty."
                );

                return;

            }

            createPaymentModal();

        }
    );

}

// =====================================
// INITIALIZE
// =====================================

loadPackages();

updateCartCount();

renderCart();

if (quantityDisplay) {

    quantityDisplay.textContent =
        quantity;

}