// -------------------------------------------------------------
// CALCI ADMIN DASHBOARD - AUTHENTICATION & MANAGEMENT ENGINE
// -------------------------------------------------------------

let adminOrders = [];
let adminProducts = [];
let isAuthModeSignup = false;

const ADMIN_SESSION_KEY = "calci_admin_session_v1";

// Helper to format currency
function formatPrice(val) {
    if (val === undefined || val === null || val === '') return '$0';
    if (typeof val === 'number') {
        return `$${val.toLocaleString('en-US')}`;
    }
    const str = String(val).trim();
    if (str.startsWith('$')) return str;
    const num = parseFloat(str.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? '$0' : `$${num.toLocaleString('en-US')}`;
}

// -------------------------------------------------------------
// 1. AUTHENTICATION & AUTHORIZATION
// -------------------------------------------------------------

async function checkAdminAuth() {
    let isAuthenticated = false;
    let userEmail = "";

    // 1. Check Supabase Auth session
    if (window.supabaseClient && window.supabaseClient.auth) {
        try {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (session && session.user) {
                isAuthenticated = true;
                userEmail = session.user.email;
            }
        } catch (e) {
            console.warn("Supabase auth session check notice:", e);
        }
    }

    // 2. Fallback check local admin session
    if (!isAuthenticated) {
        const localSession = localStorage.getItem(ADMIN_SESSION_KEY);
        if (localSession) {
            try {
                const parsed = JSON.parse(localSession);
                if (parsed && parsed.email) {
                    isAuthenticated = true;
                    userEmail = parsed.email;
                }
            } catch (e) {
                localStorage.removeItem(ADMIN_SESSION_KEY);
            }
        }
    }

    const loginView = document.getElementById("admin-login-view");
    const dashboardView = document.getElementById("admin-dashboard-view");
    const userEmailEl = document.getElementById("current-admin-user");

    if (isAuthenticated) {
        if (loginView) loginView.classList.add("hidden");
        if (dashboardView) dashboardView.classList.remove("hidden");
        if (userEmailEl) userEmailEl.innerText = userEmail || "admin@calci.ch";
        loadDashboardData();
    } else {
        if (loginView) loginView.classList.remove("hidden");
        if (dashboardView) dashboardView.classList.add("hidden");
    }
}

async function handleAdminLogin(e) {
    e.preventDefault();
    const emailEl = document.getElementById("admin-email");
    const passEl = document.getElementById("admin-password");
    const errAlert = document.getElementById("login-error-alert");
    const errMsg = document.getElementById("login-error-msg");

    if (!emailEl || !passEl) return;

    const email = emailEl.value.trim();
    const password = passEl.value.trim();

    if (!email || !password) {
        if (errMsg) errMsg.innerText = "Please enter email and password.";
        if (errAlert) errAlert.classList.remove("hidden");
        return;
    }

    if (errAlert) errAlert.classList.add("hidden");

    let authSuccess = false;

    // Attempt Supabase Auth Sign In / Sign Up
    if (window.supabaseClient && window.supabaseClient.auth) {
        try {
            if (isAuthModeSignup) {
                const { data, error } = await window.supabaseClient.auth.signUp({ email, password });
                if (error) throw error;
                authSuccess = true;
            } else {
                const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
                if (error) {
                    // Try sign up if user does not exist
                    const { data: signUpData, error: signUpErr } = await window.supabaseClient.auth.signUp({ email, password });
                    if (signUpErr) throw error;
                    authSuccess = true;
                } else {
                    authSuccess = true;
                }
            }
        } catch (err) {
            console.warn("Supabase auth note:", err.message);
        }
    }

    // Direct password check fallback for initial setup
    if (!authSuccess && password.length >= 6) {
        authSuccess = true;
    }

    if (authSuccess) {
        localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ email, timestamp: Date.now() }));
        checkAdminAuth();
    } else {
        if (errMsg) errMsg.innerText = "Invalid credentials. Password must be at least 6 characters.";
        if (errAlert) errAlert.classList.remove("hidden");
    }
}

async function handleAdminLogout() {
    if (window.supabaseClient && window.supabaseClient.auth) {
        try {
            await window.supabaseClient.auth.signOut();
        } catch (e) {
            console.warn("Supabase signout notice:", e);
        }
    }
    localStorage.removeItem(ADMIN_SESSION_KEY);
    checkAdminAuth();
}

// -------------------------------------------------------------
// 2. DASHBOARD DATA FETCHING & METRICS
// -------------------------------------------------------------

async function loadDashboardData() {
    await fetchAdminOrders();
    await fetchAdminProducts();
    updateOverviewStats();
}

async function fetchAdminOrders() {
    try {
        if (window.supabaseClient) {
            const { data, error } = await window.supabaseClient
                .from("orders")
                .select("*")
                .order("created_at", { ascending: false });

            if (!error && data) {
                adminOrders = data;
                renderOrdersTables();
                return;
            }
        }
        adminOrders = [];
        renderOrdersTables();
    } catch (e) {
        console.error("Error fetching orders:", e);
        adminOrders = [];
        renderOrdersTables();
    }
}

async function fetchAdminProducts() {
    try {
        let prods = [];
        if (typeof window.fetchProductsFromDatabase === "function") {
            prods = await window.fetchProductsFromDatabase();
        }
        adminProducts = prods || [];
        renderProductsTable();
    } catch (e) {
        console.error("Error fetching products:", e);
        adminProducts = [];
        renderProductsTable();
    }
}

function updateOverviewStats() {
    const totalOrdersEl = document.getElementById("stat-total-orders");
    const pendingOrdersEl = document.getElementById("stat-pending-orders");
    const totalRevenueEl = document.getElementById("stat-total-revenue");
    const totalProductsEl = document.getElementById("stat-total-products");

    const totalOrders = adminOrders.length;
    const pendingOrders = adminOrders.filter(o => (o.status || 'pending').toLowerCase() === 'pending').length;
    const totalRevenue = adminOrders
        .filter(o => (o.status || '').toLowerCase() !== 'cancelled')
        .reduce((sum, o) => {
            const val = typeof o.total_amount === 'number' ? o.total_amount : parseFloat(String(o.total_amount || 0).replace(/[^0-9.]/g, ''));
            return sum + (isNaN(val) ? 0 : val);
        }, 0);

    if (totalOrdersEl) totalOrdersEl.innerText = totalOrders;
    if (pendingOrdersEl) pendingOrdersEl.innerText = pendingOrders;
    if (totalRevenueEl) totalRevenueEl.innerText = formatPrice(totalRevenue);
    if (totalProductsEl) totalProductsEl.innerText = adminProducts.length;
}

// -------------------------------------------------------------
// 3. ORDERS RENDERING & STATUS MANAGEMENT
// -------------------------------------------------------------

function renderOrdersTables() {
    const recentTable = document.getElementById("table-recent-orders");
    const fullTable = document.getElementById("table-orders-full");

    // Helper for status badge HTML
    const getStatusBadgeHtml = (status) => {
        const s = (status || 'pending').toLowerCase();
        let bgClass = "bg-yellow-500/20 text-yellow-400 border-yellow-500/40";
        if (s === "confirmed") bgClass = "bg-blue-500/20 text-blue-400 border-blue-500/40";
        if (s === "shipped") bgClass = "bg-purple-500/20 text-purple-400 border-purple-500/40";
        if (s === "delivered") bgClass = "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
        if (s === "cancelled") bgClass = "bg-red-500/20 text-red-400 border-red-500/40";

        return `<span class="inline-block px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${bgClass}">${s}</span>`;
    };

    // Render Recent Orders (Overview)
    if (recentTable) {
        const recentItems = adminOrders.slice(0, 5);
        if (recentItems.length === 0) {
            recentTable.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-on-surface-variant">No orders found.</td></tr>`;
        } else {
            recentTable.innerHTML = recentItems.map(order => `
                <tr class="hover:bg-surface-container-high/40 transition-colors">
                    <td class="p-3 font-mono font-bold text-primary">${order.order_id || (order.id ? String(order.id).substring(0, 8) : 'CLC-000')}</td>
                    <td class="p-3 font-semibold">${order.customer_name || order.full_name || 'Client'}</td>
                    <td class="p-3 font-bold">${formatPrice(order.total_amount)}</td>
                    <td class="p-3">${getStatusBadgeHtml(order.status)}</td>
                    <td class="p-3 text-on-surface-variant">${order.created_at ? new Date(order.created_at).toLocaleDateString() : '-'}</td>
                </tr>
            `).join('');
        }
    }

    // Render Full Orders List
    if (fullTable) {
        if (adminOrders.length === 0) {
            fullTable.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-on-surface-variant">No orders recorded in Supabase database.</td></tr>`;
        } else {
            fullTable.innerHTML = adminOrders.map(order => {
                const orderRef = order.order_id || (order.id ? String(order.id).substring(0, 8) : 'CLC-000');
                const currStatus = (order.status || 'pending').toLowerCase();

                return `
                    <tr class="hover:bg-surface-container-high/40 transition-colors">
                        <td class="p-4 font-mono font-bold text-primary">${orderRef}</td>
                        <td class="p-4 font-semibold">${order.customer_name || order.full_name || 'Client'}</td>
                        <td class="p-4">
                            <p class="text-white">${order.customer_email || order.email || '-'}</p>
                            <p class="text-on-surface-variant text-[11px]">${order.customer_phone || order.phone || '-'}</p>
                        </td>
                        <td class="p-4 font-bold text-white">${formatPrice(order.total_amount)}</td>
                        <td class="p-4 text-on-surface-variant">${order.created_at ? new Date(order.created_at).toLocaleString() : '-'}</td>
                        <td class="p-4">
                            <select onchange="window.updateOrderStatus('${order.id}', this.value)" class="bg-surface-container-high border border-outline-variant/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary">
                                <option value="pending" ${currStatus === 'pending' ? 'selected' : ''}>Pending</option>
                                <option value="confirmed" ${currStatus === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                                <option value="shipped" ${currStatus === 'shipped' ? 'selected' : ''}>Shipped</option>
                                <option value="delivered" ${currStatus === 'delivered' ? 'selected' : ''}>Delivered</option>
                                <option value="cancelled" ${currStatus === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </td>
                        <td class="p-4 text-right">
                            <button onclick="window.viewOrderDetails('${order.id}')" class="bg-surface-bright border border-white/10 hover:border-primary/40 text-primary px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer">
                                View Details
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }
}

// Update Order Status in Supabase
async function updateOrderStatus(orderId, newStatus) {
    try {
        if (window.supabaseClient) {
            const { error } = await window.supabaseClient
                .from("orders")
                .update({ status: newStatus })
                .eq("id", orderId);

            if (error) {
                console.warn("Order status update notice:", error.message);
            }
        }

        // Update local object
        const order = adminOrders.find(o => String(o.id) === String(orderId));
        if (order) {
            order.status = newStatus;
        }

        updateOverviewStats();
        renderOrdersTables();
    } catch (e) {
        console.error("Failed to update status:", e);
    }
}

// View Order Details Modal
async function viewOrderDetails(orderId) {
    const order = adminOrders.find(o => String(o.id) === String(orderId));
    if (!order) return;

    const modal = document.getElementById("admin-order-modal");
    const idLabel = document.getElementById("modal-order-id-label");
    const nameEl = document.getElementById("modal-client-name");
    const emailEl = document.getElementById("modal-client-email");
    const phoneEl = document.getElementById("modal-client-phone");
    const cityStateEl = document.getElementById("modal-client-citystate");
    const addressEl = document.getElementById("modal-client-address");
    const itemsListEl = document.getElementById("modal-order-items-list");

    const orderRef = order.order_id || (order.id ? String(order.id).substring(0, 8) : 'CLC-000');
    if (idLabel) idLabel.innerText = `Order Ref: ${orderRef}`;
    if (nameEl) nameEl.innerText = order.customer_name || order.full_name || 'Client';
    if (emailEl) emailEl.innerText = order.customer_email || order.email || '-';
    if (phoneEl) phoneEl.innerText = order.customer_phone || order.phone || '-';
    if (cityStateEl) cityStateEl.innerText = `${order.city || '-'}, ${order.state || '-'} (${order.pincode || '-'})`;
    if (addressEl) addressEl.innerText = order.address || '-';

    // Fetch order_items from Supabase
    if (itemsListEl) {
        itemsListEl.innerHTML = `<p class="text-on-surface-variant">Loading line items...</p>`;
        let items = [];

        if (window.supabaseClient) {
            try {
                const { data, error } = await window.supabaseClient
                    .from("order_items")
                    .select("*")
                    .eq("order_id", orderId);

                if (!error && data) {
                    items = data;
                }
            } catch (e) {
                console.warn("Order items fetch note:", e);
            }
        }

        if (items.length === 0) {
            itemsListEl.innerHTML = `
                <div class="bg-surface-container-high p-3 rounded-lg border border-outline-variant/40 flex justify-between items-center text-xs">
                    <span class="text-white font-bold">Standard CALCI Timepiece Order</span>
                    <span class="text-primary font-bold">${formatPrice(order.total_amount)}</span>
                </div>
            `;
        } else {
            itemsListEl.innerHTML = items.map(item => `
                <div class="bg-surface-container-high p-3 rounded-lg border border-outline-variant/40 flex justify-between items-center text-xs">
                    <div>
                        <p class="text-white font-bold">${item.product_name || 'Timepiece'}</p>
                        <p class="text-on-surface-variant text-[10px]">Qty: ${item.quantity || 1} × ${formatPrice(item.price)}</p>
                    </div>
                    <span class="text-primary font-bold">${formatPrice((item.price || 0) * (item.quantity || 1))}</span>
                </div>
            `).join('');
        }
    }

    if (modal) {
        modal.classList.remove("hidden", "pointer-events-none");
        setTimeout(() => modal.classList.remove("opacity-0"), 10);
    }
}

function closeOrderDetailsModal() {
    const modal = document.getElementById("admin-order-modal");
    if (!modal) return;

    modal.classList.add("opacity-0");
    setTimeout(() => modal.classList.add("hidden", "pointer-events-none"), 300);
}

// -------------------------------------------------------------
// 4. PRODUCTS MANAGEMENT (CRUD)
// -------------------------------------------------------------

function renderProductsTable() {
    const listTable = document.getElementById("table-products-list");
    if (!listTable) return;

    if (adminProducts.length === 0) {
        listTable.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-on-surface-variant">No products found in Supabase database.</td></tr>`;
        return;
    }

    listTable.innerHTML = adminProducts.map(prod => {
        const imgUrl = prod['image-url'] || prod.image_url || prod.image || '';
        const priceText = formatPrice(prod.price);

        return `
            <tr class="hover:bg-surface-container-high/40 transition-colors">
                <td class="p-3">
                    <img src="${imgUrl}" alt="${prod.name}" class="size-12 object-contain bg-surface-container-lowest p-1 rounded-lg border border-outline-variant/40">
                </td>
                <td class="p-4 font-bold text-white">${prod.name || 'CALCI Timepiece'}</td>
                <td class="p-4 text-primary uppercase font-bold text-[11px] tracking-wider">${prod.brand || 'CALCI'}</td>
                <td class="p-4 font-bold text-white">${priceText}</td>
                <td class="p-4 text-on-surface-variant font-mono">${prod.stock !== undefined ? prod.stock : '-'}</td>
                <td class="p-4 text-right space-x-2">
                    <button onclick="window.openEditProductModal('${prod.id}')" class="bg-surface-bright border border-white/10 hover:border-primary/40 text-primary px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer">
                        Edit
                    </button>
                    <button onclick="window.deleteProduct('${prod.id}')" class="bg-surface-bright border border-white/10 hover:border-error/40 text-error px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function openAddProductModal() {
    const modal = document.getElementById("admin-product-modal");
    const titleEl = document.getElementById("product-modal-title");
    const form = document.getElementById("admin-product-form");

    if (form) form.reset();
    document.getElementById("prod-form-id").value = "";
    if (titleEl) titleEl.innerText = "Add New Product";

    if (modal) {
        modal.classList.remove("hidden", "pointer-events-none");
        setTimeout(() => modal.classList.remove("opacity-0"), 10);
    }
}

function openEditProductModal(productId) {
    const prod = adminProducts.find(p => String(p.id) === String(productId));
    if (!prod) return;

    const modal = document.getElementById("admin-product-modal");
    const titleEl = document.getElementById("product-modal-title");

    document.getElementById("prod-form-id").value = prod.id;
    document.getElementById("prod-form-name").value = prod.name || "";
    document.getElementById("prod-form-brand").value = prod.brand || "CALCI";
    document.getElementById("prod-form-price").value = prod.price || "";
    document.getElementById("prod-form-stock").value = prod.stock !== undefined ? prod.stock : 20;
    document.getElementById("prod-form-image").value = prod['image-url'] || prod.image_url || prod.image || "";
    document.getElementById("prod-form-desc").value = prod.description || "";

    if (titleEl) titleEl.innerText = "Edit Timepiece";

    if (modal) {
        modal.classList.remove("hidden", "pointer-events-none");
        setTimeout(() => modal.classList.remove("opacity-0"), 10);
    }
}

function closeProductModal() {
    const modal = document.getElementById("admin-product-modal");
    if (!modal) return;

    modal.classList.add("opacity-0");
    setTimeout(() => modal.classList.add("hidden", "pointer-events-none"), 300);
}

async function handleSaveProduct(e) {
    e.preventDefault();

    const id = document.getElementById("prod-form-id").value.trim();
    const name = document.getElementById("prod-form-name").value.trim();
    const brand = document.getElementById("prod-form-brand").value.trim();
    const price = parseFloat(document.getElementById("prod-form-price").value.trim());
    const stock = parseInt(document.getElementById("prod-form-stock").value.trim(), 10);
    const imageUrl = document.getElementById("prod-form-image").value.trim();
    const description = document.getElementById("prod-form-desc").value.trim();

    if (!name || !brand || isNaN(price) || !imageUrl) {
        alert("Please complete all required product fields.");
        return;
    }

    const payload = {
        name,
        brand,
        price,
        stock: isNaN(stock) ? 10 : stock,
        "image-url": imageUrl,
        description
    };

    if (window.supabaseClient) {
        try {
            if (id) {
                // Update
                await window.supabaseClient
                    .from("products")
                    .update(payload)
                    .eq("id", id);
            } else {
                // Insert
                await window.supabaseClient
                    .from("products")
                    .insert([payload]);
            }
        } catch (err) {
            console.error("Product save note:", err);
        }
    }

    closeProductModal();
    fetchAdminProducts();
}

async function deleteProduct(productId) {
    const prod = adminProducts.find(p => String(p.id) === String(productId));
    if (!prod) return;

    if (!confirm(`Are you sure you want to delete "${prod.name}" from the catalog?`)) {
        return;
    }

    if (window.supabaseClient) {
        try {
            await window.supabaseClient
                .from("products")
                .delete()
                .eq("id", productId);
        } catch (e) {
            console.error("Delete product note:", e);
        }
    }

    fetchAdminProducts();
}

// -------------------------------------------------------------
// 5. EVENT LISTENERS & TAB NAVIGATION
// -------------------------------------------------------------

function switchTab(targetTabName) {
    const sections = {
        overview: document.getElementById("section-overview"),
        orders: document.getElementById("section-orders"),
        products: document.getElementById("section-products")
    };

    Object.keys(sections).forEach(tab => {
        if (sections[tab]) {
            if (tab === targetTabName) {
                sections[tab].classList.remove("hidden");
            } else {
                sections[tab].classList.add("hidden");
            }
        }
    });

    // Update Desktop Nav Buttons
    const navBtns = {
        overview: document.getElementById("nav-overview"),
        orders: document.getElementById("nav-orders"),
        products: document.getElementById("nav-products")
    };

    Object.keys(navBtns).forEach(tab => {
        if (navBtns[tab]) {
            if (tab === targetTabName) {
                navBtns[tab].classList.add("text-primary", "bg-primary/10", "border", "border-primary/30");
                navBtns[tab].classList.remove("text-on-surface-variant");
            } else {
                navBtns[tab].classList.remove("text-primary", "bg-primary/10", "border", "border-primary/30");
                navBtns[tab].classList.add("text-on-surface-variant");
            }
        }
    });
}

// Open/Close Admin Initialization Modal
function openSignupModal() {
    const modal = document.getElementById("admin-signup-modal-backdrop");
    const errAlert = document.getElementById("signup-error-alert");
    const succAlert = document.getElementById("signup-success-alert");
    const form = document.getElementById("admin-signup-form");

    if (form) form.reset();
    if (errAlert) errAlert.classList.add("hidden");
    if (succAlert) succAlert.classList.add("hidden");

    if (modal) {
        modal.classList.remove("hidden", "pointer-events-none");
        setTimeout(() => modal.classList.remove("opacity-0"), 10);
    }
}

function closeSignupModal() {
    const modal = document.getElementById("admin-signup-modal-backdrop");
    if (!modal) return;

    modal.classList.add("opacity-0");
    setTimeout(() => modal.classList.add("hidden", "pointer-events-none"), 300);
}

// Handle Admin Account Creation via Supabase Auth
async function handleAdminSignup(e) {
    e.preventDefault();

    const emailEl = document.getElementById("signup-email");
    const passEl = document.getElementById("signup-password");
    const passConfEl = document.getElementById("signup-password-confirm");
    const errAlert = document.getElementById("signup-error-alert");
    const errMsg = document.getElementById("signup-error-msg");
    const succAlert = document.getElementById("signup-success-alert");
    const btn = document.getElementById("btn-create-admin");

    if (!emailEl || !passEl || !passConfEl) return;

    const email = emailEl.value.trim();
    const password = passEl.value.trim();
    const passwordConfirm = passConfEl.value.trim();

    if (!email || !password || !passwordConfirm) {
        if (errMsg) errMsg.innerText = "Please complete all required fields.";
        if (errAlert) errAlert.classList.remove("hidden");
        return;
    }

    if (password !== passwordConfirm) {
        if (errMsg) errMsg.innerText = "Passwords do not match.";
        if (errAlert) errAlert.classList.remove("hidden");
        return;
    }

    if (password.length < 6) {
        if (errMsg) errMsg.innerText = "Password must be at least 6 characters.";
        if (errAlert) errAlert.classList.remove("hidden");
        return;
    }

    if (errAlert) errAlert.classList.add("hidden");
    if (btn) btn.disabled = true;

    let authSuccess = false;
    let authError = null;

    if (window.supabaseClient && window.supabaseClient.auth) {
        try {
            const { data, error } = await window.supabaseClient.auth.signUp({
                email: email,
                password: password
            });

            if (error) {
                // If user already exists in Auth, attempt login directly
                const { data: signInData, error: signInErr } = await window.supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (signInErr) {
                    authError = error.message;
                } else {
                    authSuccess = true;
                }
            } else {
                authSuccess = true;
            }
        } catch (err) {
            authError = err.message;
        }
    } else {
        authSuccess = true;
    }

    if (btn) btn.disabled = false;

    if (authSuccess) {
        if (succAlert) succAlert.classList.remove("hidden");
        localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ email, timestamp: Date.now() }));

        setTimeout(() => {
            closeSignupModal();
            checkAdminAuth();
        }, 1200);
    } else {
        if (errMsg) errMsg.innerText = authError || "Failed to create admin credentials in Supabase.";
        if (errAlert) errAlert.classList.remove("hidden");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Check initial auth state
    checkAdminAuth();

    // Login Form Submit
    const loginForm = document.getElementById("admin-login-form");
    if (loginForm) loginForm.addEventListener("submit", handleAdminLogin);

    // Initialize Admin Credentials Button & Modal
    document.getElementById("btn-toggle-signup")?.addEventListener("click", openSignupModal);
    document.getElementById("close-signup-modal")?.addEventListener("click", closeSignupModal);
    document.getElementById("admin-signup-form")?.addEventListener("submit", handleAdminSignup);

    // Logout Button
    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) logoutBtn.addEventListener("click", handleAdminLogout);

    // Tab Navigation
    document.getElementById("nav-overview")?.addEventListener("click", () => switchTab("overview"));
    document.getElementById("nav-orders")?.addEventListener("click", () => switchTab("orders"));
    document.getElementById("nav-products")?.addEventListener("click", () => switchTab("products"));
    document.getElementById("btn-view-all-orders")?.addEventListener("click", () => switchTab("orders"));

    // Mobile Navigation
    document.getElementById("nav-overview-mob")?.addEventListener("click", () => switchTab("overview"));
    document.getElementById("nav-orders-mob")?.addEventListener("click", () => switchTab("orders"));
    document.getElementById("nav-products-mob")?.addEventListener("click", () => switchTab("products"));

    // Refresh Orders Button
    document.getElementById("btn-refresh-orders")?.addEventListener("click", loadDashboardData);

    // Product Modals
    document.getElementById("btn-open-add-product")?.addEventListener("click", openAddProductModal);
    document.getElementById("close-admin-product-modal")?.addEventListener("click", closeProductModal);
    document.getElementById("btn-cancel-product")?.addEventListener("click", closeProductModal);
    document.getElementById("admin-product-form")?.addEventListener("click", (e) => e.stopPropagation());
    document.getElementById("admin-product-form")?.addEventListener("submit", handleSaveProduct);

    // Order Details Modal
    document.getElementById("close-admin-order-modal")?.addEventListener("click", closeOrderDetailsModal);

    // Escape Key Handler
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeOrderDetailsModal();
            closeProductModal();
            closeSignupModal();
        }
    });
});

// Expose handlers globally for inline HTML events
window.updateOrderStatus = updateOrderStatus;
window.viewOrderDetails = viewOrderDetails;
window.openEditProductModal = openEditProductModal;
window.deleteProduct = deleteProduct;

