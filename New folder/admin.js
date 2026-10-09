/* =========================================
   API URL
========================================= */

const API =
    location.hostname === "127.0.0.1"
        ? "http://127.0.0.1:5000"
        : "http://localhost:5000";


/* =========================================
   AUTH ELEMENTS
========================================= */

const adminAuthOverlay =
    document.getElementById("adminAuthOverlay");

const adminDashboard =
    document.getElementById("adminDashboard");

const loginStep =
    document.getElementById("loginStep");

const setupStep =
    document.getElementById("setupStep");

const twoFactorStep =
    document.getElementById("twoFactorStep");

const adminUsername =
    document.getElementById("adminUsername");

const adminPassword =
    document.getElementById("adminPassword");

const loginBtn =
    document.getElementById("loginBtn");

const setupCode =
    document.getElementById("setupCode");

const setupVerifyBtn =
    document.getElementById("setupVerifyBtn");

const twoFactorCode =
    document.getElementById("twoFactorCode");

const twoFactorVerifyBtn =
    document.getElementById("twoFactorVerifyBtn");

const authMessage =
    document.getElementById("authMessage");

const qrWrapper =
    document.getElementById("qrWrapper");

const authQr =
    document.getElementById("authQr");

const secretKey =
    document.getElementById("secretKey");

let ordersRefreshTimer = null;


/* =========================================
   AUTH FLOW LOCK
========================================= */

let authFlowActive = false;


/* =========================================
   AUTH MESSAGE
========================================= */

function showAuthMessage(message) {

    if (!authMessage) return;

    authMessage.textContent = message;

    authMessage.classList.add("show");

}


function hideAuthMessage() {

    if (!authMessage) return;

    authMessage.textContent = "";

    authMessage.classList.remove("show");

}


/* =========================================
   SHOW LOGIN
========================================= */

function showLoginStep() {

    if (loginStep)
        loginStep.classList.remove("hidden");

    if (setupStep)
        setupStep.classList.add("hidden");

    if (twoFactorStep)
        twoFactorStep.classList.add("hidden");

}


/* =========================================
   SHOW SETUP
========================================= */

function showSetupStep() {

    if (loginStep)
        loginStep.classList.add("hidden");

    if (setupStep)
        setupStep.classList.remove("hidden");

    if (twoFactorStep)
        twoFactorStep.classList.add("hidden");

}


/* =========================================
   SHOW 2FA
========================================= */

function showTwoFactorStep() {

    if (loginStep)
        loginStep.classList.add("hidden");

    if (setupStep)
        setupStep.classList.add("hidden");

    if (twoFactorStep)
        twoFactorStep.classList.remove("hidden");

}


/* =========================================
   SHOW DASHBOARD
========================================= */

function showDashboard() {

    authFlowActive = false;

    if (adminAuthOverlay) {
        adminAuthOverlay.style.display = "none";
    }

    if (adminDashboard) {
        adminDashboard.style.display = "block";
    }

    startAdminDashboard();

}


/* =========================================
   SHOW LOGIN SCREEN
========================================= */

function showLoginScreen() {

    if (authFlowActive) {
        return;
    }

    if (ordersRefreshTimer) {

        clearInterval(ordersRefreshTimer);

        ordersRefreshTimer = null;

    }

    if (adminDashboard) {
        adminDashboard.style.display = "none";
    }

    if (adminAuthOverlay) {
        adminAuthOverlay.style.display = "flex";
    }

    showLoginStep();

}


/* =========================================
   CHECK SESSION
========================================= */

async function checkAdminSession() {

    if (authFlowActive) {
        return;
    }

    try {

        const response =
            await fetch(
                API +
                "/api/admin/session?t=" +
                Date.now(),
                {
                    method: "GET",
                    credentials: "include",
                    cache: "no-store"
                }
            );

        const data =
            await response.json();

        if (authFlowActive) {
            return;
        }


        if (
            data.authenticated === true ||
            data.loggedIn === true ||
            data.isAuthenticated === true
        ) {

            showDashboard();

            return;

        }


        if (data.pendingSetup === true) {

            authFlowActive = true;

            await startTwoFactorSetup();

            return;

        }


        if (data.pending2FA === true) {

            authFlowActive = true;

            showTwoFactorStep();

            showAuthMessage(
                "Google Authenticator code डालें."
            );

            return;

        }


        showLoginScreen();

    } catch (error) {

        console.error(
            "Session check error:",
            error
        );

        if (!authFlowActive) {
            showLoginScreen();
        }

    }

}


/* =========================================
   ADMIN LOGIN
========================================= */

async function adminLogin() {

    authFlowActive = true;

    hideAuthMessage();

    const username =
        adminUsername
            ? adminUsername.value.trim()
            : "";

    const password =
        adminPassword
            ? adminPassword.value
            : "";

    if (!username || !password) {

        authFlowActive = false;

        showAuthMessage(
            "Username और password दोनों डालें."
        );

        return;

    }

    if (loginBtn) {

        loginBtn.disabled = true;

        loginBtn.textContent =
            "Logging in...";

    }

    try {

        const response =
            await fetch(
                API +
                "/api/admin/login",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body:
                        JSON.stringify({
                            username: username,
                            password: password
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
                "Invalid username or password."
            );

        }


        if (
            data.setupRequired === true ||
            data.pendingSetup === true
        ) {

            await startTwoFactorSetup();

            return;

        }


        if (
            data.requires2FA === true ||
            data.pending2FA === true
        ) {

            showTwoFactorStep();

            showAuthMessage(
                "Google Authenticator code डालें."
            );

            return;

        }


        showDashboard();

    } catch (error) {

        console.error(
            "Admin login error:",
            error
        );

        authFlowActive = false;

        showAuthMessage(
            error.message ||
            "Login failed."
        );

    } finally {

        if (loginBtn) {

            loginBtn.disabled = false;

            loginBtn.textContent =
                "Login";

        }

    }

}


/* =========================================
   START GOOGLE AUTHENTICATOR SETUP
========================================= */

async function startTwoFactorSetup() {

    authFlowActive = true;

    hideAuthMessage();

    try {

        const username =
            adminUsername
                ? adminUsername.value.trim()
                : "";

        const password =
            adminPassword
                ? adminPassword.value
                : "";

        const response =
            await fetch(
                API +
                "/api/admin/setup-2fa",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body:
                        JSON.stringify({
                            username: username,
                            password: password
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
                "2FA setup शुरू नहीं हो सका."
            );

        }

        const qr =
            data.qrCode ||
            data.qr ||
            data.qrDataURL ||
            data.qrCodeDataURL;

        const secret =
            data.secret || "";

        if (!qr) {

            throw new Error(
                "QR code server से प्राप्त नहीं हुआ."
            );

        }

        if (authQr) {

            authQr.src = qr;

            authQr.style.display =
                "block";

        }

        if (qrWrapper) {

            qrWrapper.classList.add("show");

            qrWrapper.style.display =
                "block";

        }

        if (secretKey) {

            secretKey.textContent =
                secret
                    ? "Manual Secret Key: " + secret
                    : "QR code scan करें.";

        }

        showSetupStep();

        showAuthMessage(
            "QR scan करें और 6-digit code डालें."
        );

    } catch (error) {

        console.error(
            "2FA setup error:",
            error
        );

        authFlowActive = false;

        showLoginStep();

        showAuthMessage(
            error.message ||
            "2FA setup failed."
        );

    }

}


/* =========================================
   VERIFY FIRST 2FA SETUP
========================================= */

async function verifySetupCode() {

    hideAuthMessage();

    const code =
        setupCode
            ? setupCode.value.trim()
            : "";

    if (!/^\d{6}$/.test(code)) {

        showAuthMessage(
            "6-digit Google Authenticator code डालें."
        );

        return;

    }

    if (setupVerifyBtn) {

        setupVerifyBtn.disabled = true;

        setupVerifyBtn.textContent =
            "Verifying...";

    }

    try {

        const response =
            await fetch(
                API +
                "/api/admin/setup-2fa/verify",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body:
                        JSON.stringify({
                            token: code
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
                "Invalid verification code."
            );

        }

        authFlowActive = false;

        showDashboard();

    } catch (error) {

        console.error(
            "2FA verification error:",
            error
        );

        showAuthMessage(
            error.message ||
            "Invalid verification code."
        );

    } finally {

        if (setupVerifyBtn) {

            setupVerifyBtn.disabled = false;

            setupVerifyBtn.textContent =
                "Verify & Enable 2FA";

        }

    }

}


/* =========================================
   NORMAL 2FA LOGIN
========================================= */

async function verifyTwoFactorLogin() {

    hideAuthMessage();

    const code =
        twoFactorCode
            ? twoFactorCode.value.trim()
            : "";

    if (!/^\d{6}$/.test(code)) {

        showAuthMessage(
            "6-digit Google Authenticator code डालें."
        );

        return;

    }

    if (twoFactorVerifyBtn) {

        twoFactorVerifyBtn.disabled = true;

        twoFactorVerifyBtn.textContent =
            "Verifying...";

    }

    try {

        const response =
            await fetch(
                API +
                "/api/admin/verify-2fa",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body:
                        JSON.stringify({
                            token: code
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
                "Invalid Google Authenticator code."
            );

        }

        authFlowActive = false;

        showDashboard();

    } catch (error) {

        console.error(
            "2FA login error:",
            error
        );

        showAuthMessage(
            error.message ||
            "Invalid Google Authenticator code."
        );

    } finally {

        if (twoFactorVerifyBtn) {

            twoFactorVerifyBtn.disabled = false;

            twoFactorVerifyBtn.textContent =
                "Verify Code";

        }

    }

}


/* =========================================
   LOGIN EVENTS
========================================= */

if (loginBtn) {
    loginBtn.addEventListener(
        "click",
        adminLogin
    );
}

if (setupVerifyBtn) {
    setupVerifyBtn.addEventListener(
        "click",
        verifySetupCode
    );
}

if (twoFactorVerifyBtn) {
    twoFactorVerifyBtn.addEventListener(
        "click",
        verifyTwoFactorLogin
    );
}


/* =========================================
   ENTER KEY
========================================= */

if (adminUsername) {

    adminUsername.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {
                adminLogin();
            }

        }
    );

}

if (adminPassword) {

    adminPassword.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {
                adminLogin();
            }

        }
    );

}

if (setupCode) {

    setupCode.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {
                verifySetupCode();
            }

        }
    );

}

if (twoFactorCode) {

    twoFactorCode.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {
                verifyTwoFactorLogin();
            }

        }
    );

}


/* =========================================
   DASHBOARD ELEMENTS
========================================= */

const packageList =
    document.getElementById("packageList");

const ordersContainer =
    document.getElementById("ordersContainer");

const totalOrders =
    document.getElementById("totalOrders");

const pendingOrders =
    document.getElementById("pendingOrders");

const successfulOrders =
    document.getElementById("successfulOrders");

const cancelledOrders =
    document.getElementById("cancelledOrders");

const totalSales =
    document.getElementById("totalSales");

const refreshOrdersBtn =
    document.getElementById("refreshOrdersBtn");

const screenshotModal =
    document.getElementById("screenshotModal");

const screenshotImage =
    document.getElementById("screenshotImage");

const screenshotInfo =
    document.getElementById("screenshotInfo");

const closeScreenshotBtn =
    document.getElementById("closeScreenshotBtn");


/* =========================================
   CHANGE PASSWORD ELEMENTS
========================================= */

const changePasswordBtn =
    document.getElementById(
        "changePasswordBtn"
    );

const changePasswordModal =
    document.getElementById(
        "changePasswordModal"
    );

const closeChangePasswordBtn =
    document.getElementById(
        "closeChangePasswordBtn"
    );

const saveNewPasswordBtn =
    document.getElementById(
        "saveNewPasswordBtn"
    );

const currentAdminPassword =
    document.getElementById(
        "currentAdminPassword"
    );

const newAdminPassword =
    document.getElementById(
        "newAdminPassword"
    );

const confirmAdminPassword =
    document.getElementById(
        "confirmAdminPassword"
    );

const changePasswordMessage =
    document.getElementById(
        "changePasswordMessage"
    );


/* =========================================
   CHANGE PASSWORD MESSAGE
========================================= */

function showChangePasswordMessage(
    message,
    type = "error"
) {

    if (!changePasswordMessage)
        return;

    changePasswordMessage.textContent =
        message;

    changePasswordMessage.className =
        "show " + type;

}


function hideChangePasswordMessage() {

    if (!changePasswordMessage)
        return;

    changePasswordMessage.textContent =
        "";

    changePasswordMessage.className =
        "";

}


/* =========================================
   OPEN CHANGE PASSWORD
========================================= */

function openChangePassword() {

    if (!changePasswordModal)
        return;

    hideChangePasswordMessage();

    if (currentAdminPassword)
        currentAdminPassword.value = "";

    if (newAdminPassword)
        newAdminPassword.value = "";

    if (confirmAdminPassword)
        confirmAdminPassword.value = "";

    changePasswordModal.classList.add("show");

    if (currentAdminPassword) {
        setTimeout(
            () => currentAdminPassword.focus(),
            100
        );
    }

}


/* =========================================
   CLOSE CHANGE PASSWORD
========================================= */

function closeChangePassword() {

    if (!changePasswordModal)
        return;

    changePasswordModal.classList.remove(
        "show"
    );

    hideChangePasswordMessage();

}


/* =========================================
   CHANGE PASSWORD
========================================= */

async function changeAdminPassword() {

    hideChangePasswordMessage();

    const currentPassword =
        currentAdminPassword
            ? currentAdminPassword.value
            : "";

    const newPassword =
        newAdminPassword
            ? newAdminPassword.value
            : "";

    const confirmPassword =
        confirmAdminPassword
            ? confirmAdminPassword.value
            : "";


    if (!currentPassword) {

        showChangePasswordMessage(
            "Current password डालें."
        );

        return;

    }


    if (!newPassword) {

        showChangePasswordMessage(
            "New password डालें."
        );

        return;

    }


    if (newPassword.length < 6) {

        showChangePasswordMessage(
            "New password कम से कम 6 characters का होना चाहिए."
        );

        return;

    }


    if (newPassword !== confirmPassword) {

        showChangePasswordMessage(
            "New password और confirm password match नहीं कर रहे."
        );

        return;

    }


    if (
        newPassword === currentPassword
    ) {

        showChangePasswordMessage(
            "New password पुराना password नहीं हो सकता."
        );

        return;

    }


    if (saveNewPasswordBtn) {

        saveNewPasswordBtn.disabled = true;

        saveNewPasswordBtn.textContent =
            "Changing...";

    }


    try {

        const response =
            await fetch(
                API +
                "/api/admin/change-password",
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body:
                        JSON.stringify({
                            currentPassword:
                                currentPassword,

                            newPassword:
                                newPassword,

                            confirmPassword:
                                confirmPassword
                        })
                }
            );


        const data =
            await response.json();


        if (
            response.status === 401
        ) {

            authFlowActive = false;

            closeChangePassword();

            showLoginScreen();

            return;

        }


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Password change failed."
            );

        }


        showChangePasswordMessage(
            "Password successfully changed!",
            "success"
        );


        if (currentAdminPassword)
            currentAdminPassword.value = "";

        if (newAdminPassword)
            newAdminPassword.value = "";

        if (confirmAdminPassword)
            confirmAdminPassword.value = "";


        setTimeout(
            closeChangePassword,
            1200
        );


    } catch (error) {

        console.error(
            "Change password error:",
            error
        );

        showChangePasswordMessage(
            error.message ||
            "Password change failed."
        );

    } finally {

        if (saveNewPasswordBtn) {

            saveNewPasswordBtn.disabled =
                false;

            saveNewPasswordBtn.textContent =
                "Change Password";

        }

    }

}


/* =========================================
   CHANGE PASSWORD EVENTS
========================================= */

if (changePasswordBtn) {

    changePasswordBtn.addEventListener(
        "click",
        openChangePassword
    );

}

if (closeChangePasswordBtn) {

    closeChangePasswordBtn.addEventListener(
        "click",
        closeChangePassword
    );

}

if (saveNewPasswordBtn) {

    saveNewPasswordBtn.addEventListener(
        "click",
        changeAdminPassword
    );

}

if (changePasswordModal) {

    changePasswordModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                changePasswordModal
            ) {

                closeChangePassword();

            }

        }
    );

}

[
    currentAdminPassword,
    newAdminPassword,
    confirmAdminPassword
].forEach(input => {

    if (!input) return;

    input.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                changeAdminPassword();

            }

        }
    );

});


/* =========================================
   ESCAPE HTML
========================================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* =========================================
   LOAD PACKAGES
========================================= */

async function loadPackages() {

    if (!packageList)
        return;

    try {

        packageList.innerHTML =
            `<div class="loading">
                Loading packages...
            </div>`;

        const response =
            await fetch(
                API +
                "/api/packages?t=" +
                Date.now(),
                {
                    cache: "no-store",
                    credentials: "include"
                }
            );

        const data =
            await response.json();

        if (response.status === 401) {

            authFlowActive = false;

            showLoginScreen();

            return;

        }

        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Unable to load packages."
            );

        }

        packageList.innerHTML = "";

        data.packages.forEach(pkg => {

            const row =
                document.createElement("div");

            row.className =
                "package-admin-row";

            row.innerHTML = `

                <div class="package-admin-info">

                    <strong>
                        ${escapeHtml(pkg.name)}
                    </strong>

                    <span>
                        Package ID:
                        ${escapeHtml(pkg.id)}
                    </span>

                </div>

                <div class="package-admin-price">

                    <span>Rs.</span>

                    <input
                        type="number"
                        min="0"
                        step="1"
                        value="${Number(pkg.price)}"
                        id="price-${escapeHtml(pkg.id)}"
                    >

                    <button
                        class="save-price-btn"
                        onclick="updatePackagePrice('${escapeHtml(pkg.id)}')"
                    >
                        Save
                    </button>

                </div>

            `;

            packageList.appendChild(row);

        });

    } catch (error) {

        console.error(
            "Package loading error:",
            error
        );

        packageList.innerHTML =
            `<div class="error-message">
                ${escapeHtml(error.message)}
            </div>`;

    }

}


/* =========================================
   UPDATE PACKAGE PRICE
========================================= */

window.updatePackagePrice =
    async function(packageId) {

        const input =
            document.getElementById(
                "price-" + packageId
            );

        if (!input)
            return;

        const newPrice =
            Number(input.value);

        if (
            !Number.isFinite(newPrice) ||
            newPrice < 0
        ) {

            alert(
                "Please enter a valid price."
            );

            return;

        }

        try {

            const response =
                await fetch(
                    API +
                    "/api/packages/" +
                    encodeURIComponent(packageId),
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        credentials: "include",

                        body:
                            JSON.stringify({
                                price: newPrice
                            })
                    }
                );

            if (response.status === 401) {

                authFlowActive = false;

                showLoginScreen();

                return;

            }

            const data =
                await response.json();

            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(
                    data.message ||
                    "Price update failed."
                );

            }

            alert(
                "Price updated successfully."
            );

            loadPackages();

        } catch (error) {

            console.error(error);

            alert(
                "Price update failed.\n\n" +
                error.message
            );

        }

    };


/* =========================================
   LOAD ORDERS
========================================= */

async function loadOrders() {

    if (!ordersContainer)
        return;

    try {

        ordersContainer.innerHTML =
            `<div class="loading">
                Loading orders...
            </div>`;

        const response =
            await fetch(
                API +
                "/api/orders?t=" +
                Date.now(),
                {
                    cache: "no-store",
                    credentials: "include"
                }
            );

        if (response.status === 401) {

            authFlowActive = false;

            showLoginScreen();

            return;

        }

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Unable to load orders."
            );

        }

        const orders =
            Array.isArray(data.orders)
                ? data.orders
                : [];

        updateStats(orders);

        if (orders.length === 0) {

            ordersContainer.innerHTML =
                `<div class="empty-orders">
                    No orders yet.
                </div>`;

            return;

        }

        orders.sort(
            (a, b) =>
                new Date(b.createdAt) -
                new Date(a.createdAt)
        );

        ordersContainer.innerHTML = "";

        orders.forEach(order => {

            ordersContainer.appendChild(
                createOrderCard(order)
            );

        });

    } catch (error) {

        console.error(
            "Order loading error:",
            error
        );

        ordersContainer.innerHTML =
            `<div class="error-message">
                ${escapeHtml(error.message)}
            </div>`;

    }

}


/* =========================================
   CREATE ORDER CARD
========================================= */

function createOrderCard(order) {

    const card =
        document.createElement("div");

    card.className = "order-card";

    const status =
        order.status || "Pending";

    const statusClass =
        status.toLowerCase();

    const hasScreenshot =
        typeof order.paymentScreenshot === "string" &&
        order.paymentScreenshot.length > 0;

    const paymentMethod =
        order.paymentMethod || "eSewa";

    const paymentNumber =
        order.paymentNumber || "9713989938";

    let orderDate = "Unknown";

    if (order.createdAt) {

        const date =
            new Date(order.createdAt);

        if (!Number.isNaN(date.getTime())) {

            orderDate =
                date.toLocaleString();

        }

    }

    let itemsHtml = "";

    if (
        Array.isArray(order.items) &&
        order.items.length > 0
    ) {

        itemsHtml =
            order.items
                .map(item => {

                    const quantity =
                        Number(item.quantity || 1);

                    const price =
                        Number(item.price || 0);

                    const itemTotal =
                        price * quantity;

                    return `

                        <div class="order-item">

                            <div>

                                <strong>
                                    💎
                                    ${escapeHtml(
                                        item.package ||
                                        "Diamond Package"
                                    )}
                                </strong>

                                <div class="order-item-small">
                                    UID:
                                    ${escapeHtml(
                                        item.uid || "-"
                                    )}
                                </div>

                                <div class="order-item-small">
                                    Username:
                                    ${escapeHtml(
                                        item.username || "-"
                                    )}
                                </div>

                            </div>

                            <div class="order-item-price">

                                × ${quantity}

                                <br>

                                Rs.${itemTotal.toFixed(2)}

                            </div>

                        </div>

                    `;

                })
                .join("");

    } else {

        itemsHtml =
            `<div class="order-item-small">
                No item information.
            </div>`;

    }

    let screenshotButton = "";

    if (hasScreenshot) {

        screenshotButton =
            `<button
                type="button"
                class="view-screenshot-btn"
            >
                🖼️ View Payment Screenshot
            </button>`;

    } else {

        screenshotButton =
            `<div class="no-screenshot">
                Payment screenshot not uploaded.
            </div>`;

    }

    card.innerHTML = `

        <div class="order-top">

            <div>

                <div class="order-id">
                    ${escapeHtml(
                        order.orderId ||
                        "Unknown Order"
                    )}
                </div>

                <div class="order-date">
                    ${escapeHtml(orderDate)}
                </div>

            </div>

            <span
                class="status-badge ${escapeHtml(statusClass)}"
            >
                ${escapeHtml(status)}
            </span>

        </div>

        <div class="order-total">
            Rs.${Number(
                order.total || 0
            ).toFixed(2)}
        </div>

        <div class="order-items">
            ${itemsHtml}
        </div>

        <div class="payment-section">

            <h3>
                💳 Payment Details
            </h3>

            <div class="payment-detail">

                <span>
                    Payment Method
                </span>

                <strong>
                    ${escapeHtml(paymentMethod)}
                </strong>

            </div>

            <div class="payment-detail">

                <span>
                    Payment Number
                </span>

                <strong>
                    ${escapeHtml(paymentNumber)}
                </strong>

            </div>

            <div class="payment-detail">

                <span>
                    Screenshot
                </span>

                <strong>
                    ${
                        hasScreenshot
                            ? "✅ Uploaded"
                            : "❌ Not Uploaded"
                    }
                </strong>

            </div>

            ${screenshotButton}

        </div>

        <div class="order-actions">

            <label>
                Order Status
            </label>

            <select
                class="status-select"
                onchange="changeOrderStatus(
                    '${escapeHtml(
                        order.orderId || ""
                    )}',
                    this.value
                )"
            >

                <option
                    value="Pending"
                    ${
                        status === "Pending"
                            ? "selected"
                            : ""
                    }
                >
                    Pending
                </option>

                <option
                    value="Successful"
                    ${
                        status === "Successful"
                            ? "selected"
                            : ""
                    }
                >
                    Successful
                </option>

                <option
                    value="Cancelled"
                    ${
                        status === "Cancelled"
                            ? "selected"
                            : ""
                    }
                >
                    Cancelled
                </option>

            </select>

        </div>

    `;

    const viewButton =
        card.querySelector(
            ".view-screenshot-btn"
        );

    if (viewButton) {

        viewButton.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                event.stopPropagation();

                viewScreenshot(
                    order.orderId || "",
                    order.total || 0,
                    order.paymentScreenshot || ""
                );

            }
        );

    }

    return card;

}


/* =========================================
   VIEW SCREENSHOT
========================================= */

window.viewScreenshot =
    function(
        orderId,
        total,
        screenshot
    ) {

        if (!screenshot) {

            alert(
                "Payment screenshot not available."
            );

            return;

        }

        if (!screenshotModal) {

            alert(
                "Screenshot viewer not found."
            );

            return;

        }

        if (!screenshotImage) {

            alert(
                "Screenshot image element not found."
            );

            return;

        }

        screenshotImage.src =
            screenshot;

        if (screenshotInfo) {

            screenshotInfo.innerHTML = `

                <div>

                    <strong>
                        Order ID:
                    </strong>

                    ${escapeHtml(orderId)}

                </div>

                <div>

                    <strong>
                        Amount:
                    </strong>

                    Rs.${Number(total).toFixed(2)}

                </div>

            `;

        }

        screenshotModal.classList.add("show");

        screenshotModal.style.display = "flex";

    };


/* =========================================
   CLOSE SCREENSHOT
========================================= */

function closeScreenshot() {

    if (!screenshotModal)
        return;

    screenshotModal.classList.remove("show");

    screenshotModal.style.display = "none";

    if (screenshotImage) {
        screenshotImage.src = "";
    }

}


if (closeScreenshotBtn) {

    closeScreenshotBtn.addEventListener(
        "click",
        closeScreenshot
    );

}


if (screenshotModal) {

    screenshotModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                screenshotModal
            ) {

                closeScreenshot();

            }

        }
    );

}


document.addEventListener(
    "keydown",
    event => {

        if (event.key === "Escape") {

            closeScreenshot();

            if (
                changePasswordModal &&
                changePasswordModal.classList.contains("show")
            ) {

                closeChangePassword();

            }

        }

    }
);


/* =========================================
   CHANGE ORDER STATUS
========================================= */

window.changeOrderStatus =
    async function(
        orderId,
        status
    ) {

        if (!orderId)
            return;

        try {

            const response =
                await fetch(
                    API +
                    "/api/orders/" +
                    encodeURIComponent(orderId) +
                    "/status",
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        credentials: "include",

                        body:
                            JSON.stringify({
                                status: status
                            })
                    }
                );

            if (response.status === 401) {

                authFlowActive = false;

                showLoginScreen();

                return;

            }

            const data =
                await response.json();

            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(
                    data.message ||
                    "Status update failed."
                );

            }

            await loadOrders();

        } catch (error) {

            console.error(error);

            alert(
                "Status update failed.\n\n" +
                error.message
            );

            loadOrders();

        }

    };


/* =========================================
   UPDATE STATS
========================================= */

function updateStats(orders) {

    const total =
        orders.length;

    const pending =
        orders.filter(
            order =>
                order.status === "Pending"
        ).length;

    const successful =
        orders.filter(
            order =>
                order.status === "Successful"
        ).length;

    const cancelled =
        orders.filter(
            order =>
                order.status === "Cancelled"
        ).length;

    const sales =
        orders
            .filter(
                order =>
                    order.status === "Successful"
            )
            .reduce(
                (sum, order) =>
                    sum +
                    Number(order.total || 0),
                0
            );

    if (totalOrders) {
        totalOrders.textContent = total;
    }

    if (pendingOrders) {
        pendingOrders.textContent = pending;
    }

    if (successfulOrders) {
        successfulOrders.textContent = successful;
    }

    if (cancelledOrders) {
        cancelledOrders.textContent = cancelled;
    }

    if (totalSales) {

        totalSales.textContent =
            "Rs." +
            sales.toFixed(2);

    }

}


/* =========================================
   REFRESH
========================================= */

if (refreshOrdersBtn) {

    refreshOrdersBtn.addEventListener(
        "click",
        loadOrders
    );

}


/* =========================================
   START DASHBOARD
========================================= */

function startAdminDashboard() {

    loadPackages();

    loadOrders();

    if (!ordersRefreshTimer) {

        ordersRefreshTimer =
            setInterval(
                loadOrders,
                10000
            );

    }

}


/* =========================================
   START
========================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            setTimeout(
                checkAdminSession,
                100
            );

        }
    );

} else {

    setTimeout(
        checkAdminSession,
        100
    );

}