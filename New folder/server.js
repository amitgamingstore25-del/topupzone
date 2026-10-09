const express = require("express");
const cors = require("cors");
const session = require("express-session");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();

const PORT = 5000;


/* =========================================
   ADMIN
========================================= */

const ADMIN_USERNAME = "admin";

const DEFAULT_ADMIN_PASSWORD =
    "admin123";

const AUTH_FILE =
    path.join(
        __dirname,
        "admin-auth.json"
    );


/* =========================================
   PASSWORD HASH
========================================= */

function hashPassword(password) {

    return crypto
        .createHash("sha256")
        .update(String(password))
        .digest("hex");

}


/* =========================================
   AUTH FILE
========================================= */

function loadAdminAuth() {

    try {

        if (!fs.existsSync(AUTH_FILE)) {

            const initialAuth = {

                secret: null,

                setupSecret: null,

                twoFactorEnabled: false,

                passwordHash:
                    hashPassword(
                        DEFAULT_ADMIN_PASSWORD
                    )

            };

            fs.writeFileSync(
                AUTH_FILE,
                JSON.stringify(
                    initialAuth,
                    null,
                    4
                )
            );

            return initialAuth;

        }


        const data =
            JSON.parse(
                fs.readFileSync(
                    AUTH_FILE,
                    "utf8"
                )
            );


        /*
         * Existing admin-auth.json
         * compatibility
         */

        if (
            !data.passwordHash
        ) {

            data.passwordHash =
                hashPassword(
                    DEFAULT_ADMIN_PASSWORD
                );

            saveAdminAuth(data);

        }


        if (
            typeof data.twoFactorEnabled !==
            "boolean"
        ) {

            data.twoFactorEnabled = false;

        }


        return data;

    } catch (error) {

        console.error(
            "Unable to load admin-auth.json:",
            error
        );

        return {

            secret: null,

            setupSecret: null,

            twoFactorEnabled: false,

            passwordHash:
                hashPassword(
                    DEFAULT_ADMIN_PASSWORD
                )

        };

    }

}


function saveAdminAuth(data) {

    fs.writeFileSync(
        AUTH_FILE,
        JSON.stringify(
            data,
            null,
            4
        )
    );

}


let adminAuth =
    loadAdminAuth();


/* =========================================
   CORS
========================================= */

app.use(
    cors({

        origin: function(
            origin,
            callback
        ) {

            if (!origin) {

                callback(
                    null,
                    true
                );

                return;

            }


            const allowedOrigins = [

                "http://localhost",
                "http://127.0.0.1",

                "http://localhost:5500",
                "http://127.0.0.1:5500",

                "http://localhost:5501",
                "http://127.0.0.1:5501",

                "http://localhost:5000",
                "http://127.0.0.1:5000"

            ];


            if (
                allowedOrigins.includes(
                    origin
                )
            ) {

                callback(
                    null,
                    true
                );

            } else {

                callback(
                    null,
                    true
                );

            }

        },

        credentials: true

    })
);


/* =========================================
   BODY
========================================= */

app.use(
    express.json({
        limit: "12mb"
    })
);


/* =========================================
   SESSION
========================================= */

app.use(
    session({

        secret:
            "top-up-zone-admin-session-secret",

        resave: false,

        saveUninitialized: false,

        cookie: {

            httpOnly: true,

            secure: false,

            maxAge:
                8 * 60 * 60 * 1000

        }

    })
);


/* =========================================
   PACKAGES
========================================= */

let packages = [

    {
        id: "115",
        name: "115 Diamonds",
        price: 105
    },

    {
        id: "240",
        name: "240 Diamonds",
        price: 210
    },

    {
        id: "355",
        name: "355 Diamonds",
        price: 315
    },

    {
        id: "480",
        name: "480 Diamonds",
        price: 420
    },

    {
        id: "610",
        name: "610 Diamonds",
        price: 525
    },

    {
        id: "725",
        name: "725 Diamonds",
        price: 625
    }

];


/* =========================================
   ORDERS
========================================= */

let orders = [];


/* =========================================
   HOME
========================================= */

app.get(
    "/",
    (req, res) => {

        res.json({

            success: true,

            message:
                "Top Up Zone API is running."

        });

    }
);


/* =========================================
   ADMIN AUTH MIDDLEWARE
========================================= */

function requireAdmin(
    req,
    res,
    next
) {

    if (
        req.session &&
        req.session.adminAuthenticated ===
            true
    ) {

        return next();

    }


    return res.status(401).json({

        success: false,

        message:
            "Admin authentication required."

    });

}


/* =========================================
   ADMIN SESSION
========================================= */

app.get(
    "/api/admin/session",
    (req, res) => {

        if (
            req.session &&
            req.session.adminAuthenticated ===
                true
        ) {

            return res.json({

                success: true,

                authenticated: true,

                loggedIn: true,

                isAuthenticated: true

            });

        }


        return res.json({

            success: true,

            authenticated: false,

            loggedIn: false,

            isAuthenticated: false

        });

    }
);


/* =========================================
   ADMIN LOGIN
========================================= */

app.post(
    "/api/admin/login",
    (req, res) => {

        const username =
            String(
                req.body?.username || ""
            ).trim();

        const password =
            String(
                req.body?.password || ""
            );


        if (
            username !==
            ADMIN_USERNAME
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid username or password."

            });

        }


        if (
            hashPassword(password) !==
            adminAuth.passwordHash
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid username or password."

            });

        }


        req.session.pending2FA = false;

        req.session.pendingSetup = false;

        req.session.adminAuthenticated = true;


        return res.json({

            success: true,

            message: "Login successful."

        });

    }
);


/* =========================================
   START 2FA SETUP
========================================= */

app.post(
    "/api/admin/setup-2fa",
    async (
        req,
        res
    ) => {

        const username =
            String(
                req.body?.username || ""
            ).trim();

        const password =
            String(
                req.body?.password || ""
            );


        if (
            username !==
            ADMIN_USERNAME
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid username."

            });

        }


        if (
            hashPassword(password) !==
            adminAuth.passwordHash
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid password."

            });

        }


        try {

            const secret =
                speakeasy.generateSecret({

                    name:
                        "Top Up Zone Admin",

                    issuer:
                        "Top Up Zone",

                    length: 20

                });


            adminAuth.setupSecret =
                secret.base32;

            saveAdminAuth(
                adminAuth
            );


            req.session.pendingSetup =
                true;


            const qrCode =
                await QRCode.toDataURL(
                    secret.otpauth_url
                );


            return res.json({

                success: true,

                qrCode: qrCode,

                secret:
                    secret.base32

            });

        } catch (error) {

            console.error(
                "2FA setup error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to create 2FA setup."

            });

        }

    }
);


/* =========================================
   VERIFY FIRST 2FA SETUP
========================================= */

app.post(
    "/api/admin/setup-2fa/verify",
    (req, res) => {

        const token =
            String(
                req.body?.token || ""
            ).trim();


        if (
            !adminAuth.setupSecret
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "2FA setup session not found."

            });

        }


        const verified =
            speakeasy.totp.verify({

                secret:
                    adminAuth.setupSecret,

                encoding:
                    "base32",

                token:
                    token,

                window:
                    2

            });


        if (!verified) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid verification code."

            });

        }


        adminAuth.secret =
            adminAuth.setupSecret;

        adminAuth.setupSecret =
            null;

        adminAuth.twoFactorEnabled =
            true;

        saveAdminAuth(
            adminAuth
        );


        req.session.pendingSetup =
            false;

        req.session.pending2FA =
            false;

        req.session.adminAuthenticated =
            true;


        return res.json({

            success: true,

            message:
                "2FA enabled successfully."

        });

    }
);


/* =========================================
   VERIFY NORMAL 2FA
========================================= */

app.post(
    "/api/admin/verify-2fa",
    (req, res) => {

        const token =
            String(
                req.body?.token || ""
            ).trim();


        if (
            !adminAuth.twoFactorEnabled ||
            !adminAuth.secret
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "2FA is not configured."

            });

        }


        const verified =
            speakeasy.totp.verify({

                secret:
                    adminAuth.secret,

                encoding:
                    "base32",

                token:
                    token,

                window:
                    2

            });


        if (!verified) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid Google Authenticator code."

            });

        }


        req.session.pending2FA =
            false;

        req.session.pendingSetup =
            false;

        req.session.adminAuthenticated =
            true;


        return res.json({

            success: true,

            message:
                "Admin login successful."

        });

    }
);


/* =========================================
   CHANGE ADMIN PASSWORD
========================================= */

app.put(
    "/api/admin/change-password",
    requireAdmin,
    (req, res) => {

        const currentPassword =
            String(
                req.body?.currentPassword || ""
            );

        const newPassword =
            String(
                req.body?.newPassword || ""
            );

        const confirmPassword =
            String(
                req.body?.confirmPassword || ""
            );


        if (!currentPassword) {

            return res.status(400).json({

                success: false,

                message:
                    "Current password is required."

            });

        }


        if (!newPassword) {

            return res.status(400).json({

                success: false,

                message:
                    "New password is required."

            });

        }


        if (
            newPassword.length < 6
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "New password must be at least 6 characters."

            });

        }


        if (
            newPassword !==
            confirmPassword
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "New passwords do not match."

            });

        }


        if (
            hashPassword(
                currentPassword
            ) !==
            adminAuth.passwordHash
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Current password is incorrect."

            });

        }


        if (
            currentPassword ===
            newPassword
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "New password must be different."

            });

        }


        adminAuth.passwordHash =
            hashPassword(
                newPassword
            );

        saveAdminAuth(
            adminAuth
        );


        return res.json({

            success: true,

            message:
                "Admin password changed successfully."

        });

    }
);


/* =========================================
   ADMIN LOGOUT
========================================= */

app.post(
    "/api/admin/logout",
    (req, res) => {

        req.session.destroy(
            error => {

                if (error) {

                    return res.status(500).json({

                        success: false,

                        message:
                            "Logout failed."

                    });

                }


                res.json({

                    success: true,

                    message:
                        "Logged out successfully."

                });

            }
        );

    }
);


/* =========================================
   FREE FIRE UID CHECK
========================================= */

app.get(
    "/api/check-player",
    async (
        req,
        res
    ) => {

        try {

            const uid =
                String(
                    req.query?.uid || ""
                ).trim();


            if (!uid) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Player UID is required."

                });

            }


            const apiURL =
                "https://api2.nftoken.info/player-info?uid=" +
                encodeURIComponent(uid);


            const response =
                await fetch(
                    apiURL
                );


            if (!response.ok) {

                return res.status(502).json({

                    success: false,

                    message:
                        "Player information service unavailable."

                });

            }


            const data =
                await response.json();


            const accountInfo =
                data.AccountInfo ||
                data.accountInfo ||
                data.basicInfo ||
                data.basicinfo ||
                null;


            if (!accountInfo) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Player not found."

                });

            }


            const accountId =
                accountInfo.AccountID ||
                accountInfo.accountId ||
                accountInfo.uid ||
                uid;


            const nickname =
                accountInfo.AccountName ||
                accountInfo.accountName ||
                accountInfo.nickname ||
                "";


            const region =
                accountInfo.AccountRegion ||
                accountInfo.accountRegion ||
                accountInfo.region ||
                "";


            const level =
                accountInfo.AccountLevel ||
                accountInfo.accountLevel ||
                accountInfo.level ||
                0;


            return res.json({

                success: true,

                player: {

                    uid:
                        String(accountId),

                    username:
                        String(nickname),

                    region:
                        String(region),

                    level:
                        level

                }

            });

        } catch (error) {

            console.error(
                "Player check error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to check player."

            });

        }

    }
);


/* =========================================
   GET PACKAGES
========================================= */

app.get(
    "/api/packages",
    (req, res) => {

        return res.json({

            success: true,

            packages:
                packages

        });

    }
);


/* =========================================
   UPDATE PACKAGE PRICE
========================================= */

app.put(
    "/api/packages/:id",
    requireAdmin,
    (req, res) => {

        const packageId =
            String(
                req.params.id
            );


        const newPrice =
            Number(
                req.body?.price
            );


        if (
            !Number.isFinite(
                newPrice
            ) ||
            newPrice < 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid price."

            });

        }


        const packageItem =
            packages.find(
                item =>
                    item.id ===
                    packageId
            );


        if (!packageItem) {

            return res.status(404).json({

                success: false,

                message:
                    "Package not found."

            });

        }


        packageItem.price =
            newPrice;


        return res.json({

            success: true,

            message:
                "Package price updated.",

            package:
                packageItem

        });

    }
);


/* =========================================
   CREATE ORDER
========================================= */

app.post(
    "/api/orders",
    (req, res) => {

        try {

            const items =
                Array.isArray(
                    req.body?.items
                )
                    ? req.body.items
                    : [];


            if (
                items.length ===
                0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Order items are required."

                });

            }


            const orderId =
                "TZ-" +
                Date.now();


            const cleanItems =
                items.map(
                    item => ({

                        package:
                            String(
                                item.package ||
                                "Diamond Package"
                            ),

                        uid:
                            String(
                                item.uid || ""
                            ),

                        username:
                            String(
                                item.username || ""
                            ),

                        quantity:
                            Number(
                                item.quantity || 1
                            ),

                        price:
                            Number(
                                item.price || 0
                            )

                    })
                );


            const total =
                cleanItems.reduce(
                    (
                        sum,
                        item
                    ) =>
                        sum +
                        (
                            item.price *
                            item.quantity
                        ),
                    0
                );


            const order = {

                orderId:
                    orderId,

                items:
                    cleanItems,

                total:
                    total,

                status:
                    "Pending",

                paymentMethod:
                    req.body?.paymentMethod ||
                    "eSewa",

                paymentNumber:
                    req.body?.paymentNumber ||
                    "9713989938",

                paymentScreenshot:
                    req.body?.paymentScreenshot ||
                    "",

                createdAt:
                    new Date().toISOString()

            };


            orders.push(
                order
            );


            return res.json({

                success: true,

                orderId:
                    order.orderId,

                total:
                    order.total,

                status:
                    order.status,

                createdAt:
                    order.createdAt

            });

        } catch (error) {

            console.error(
                "Create order error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to create order."

            });

        }

    }
);


/* =========================================
   CUSTOMER ORDER LOOKUP
========================================= */

app.get(
    "/api/customer-orders/:orderId",
    (req, res) => {

        const orderId =
            String(
                req.params.orderId || ""
            );


        const order =
            orders.find(
                item =>
                    item.orderId ===
                    orderId
            );


        if (!order) {

            return res.status(404).json({

                success: false,

                message:
                    "Order not found."

            });

        }


        return res.json({

            success: true,

            order:
                order

        });

    }
);


/* =========================================
   ADMIN GET ORDERS
========================================= */

app.get(
    "/api/orders",
    requireAdmin,
    (req, res) => {

        return res.json({

            success: true,

            orders:
                orders

        });

    }
);


/* =========================================
   UPDATE ORDER STATUS
========================================= */

app.put(
    "/api/orders/:orderId/status",
    requireAdmin,
    (req, res) => {

        const orderId =
            String(
                req.params.orderId
            );


        const status =
            String(
                req.body?.status || ""
            );


        const allowedStatuses = [

            "Pending",
            "Successful",
            "Cancelled"

        ];


        if (
            !allowedStatuses.includes(
                status
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid order status."

            });

        }


        const order =
            orders.find(
                item =>
                    item.orderId ===
                    orderId
            );


        if (!order) {

            return res.status(404).json({

                success: false,

                message:
                    "Order not found."

            });

        }


        order.status =
            status;


        return res.json({

            success: true,

            message:
                "Order status updated.",

            order:
                order

        });

    }
);


/* =========================================
   START SERVER
========================================= */

app.listen(
    PORT,
    () => {

        console.log(
            "===================================="
        );

        console.log(
            "Top Up Zone Server Running"
        );

        console.log(
            "http://localhost:" +
            PORT
        );

        console.log(
            "===================================="
        );

    }
);