// Supabase Client Setup & Environment Variables Management
let ENV_SUPABASE_URL = "https://ohieslrkmkgxhmnemikw.supabase.co/rest/v1/";
let ENV_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_2CccCUOhYZPdMTsf3w6Hog_kMuH-Eng";

// Read from .env if available at runtime


// Global Supabase client reference
let supabaseClient = null;

function initSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    if (window.supabaseClient) {
        supabaseClient = window.supabaseClient;
        return supabaseClient;
    }

    const supabaseUrl = ENV_SUPABASE_URL.replace(/\/rest\/v1\/?$/, "");
    const supabaseKey = ENV_SUPABASE_PUBLISHABLE_KEY;

    if (window.supabase && typeof window.supabase.createClient === "function") {
        supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
        window.supabaseClient = supabaseClient;
    } else {
        console.warn("Supabase SDK not loaded. Falling back to REST fetch.");
    }
    return supabaseClient;
}

// Initial setup
initSupabaseClient();

/**
 * Fetch products from the Supabase database products table
 */
async function fetchProductsFromDatabase() {

    initSupabaseClient();

    try {
        if (supabaseClient) {
            const { data, error } = await supabaseClient
                .from("products")
                .select("*");

            if (error) {
                console.error("Supabase query error:", error);
                return await fetchProductsViaRest();
            }
            return data;
        } else {
            return await fetchProductsViaRest();
        }
    } catch (err) {
        console.error("Error fetching products from database:", err);
        return await fetchProductsViaRest();
    }
}

/**
 * Direct REST API query fallback
 */
async function fetchProductsViaRest() {
    try {
        const baseUrl = ENV_SUPABASE_URL.endsWith("/") ? ENV_SUPABASE_URL : `${ENV_SUPABASE_URL}/`;
        const response = await fetch(`${baseUrl}products?select=*`, {
            headers: {
                "apikey": ENV_SUPABASE_PUBLISHABLE_KEY,
                "Authorization": `Bearer ${ENV_SUPABASE_PUBLISHABLE_KEY}`
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (err) {
        console.error("REST API fetch error:", err);
        return [];
    }
}

/**
 * Helper to generate a unique order_reference code (e.g. CLC-AC6225E3)
 */
function generateOrderReference() {
    const chars = '0123456789ABCDEF';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `CLC-${code}`;
}

/**
 * Save Order and Order Items to Supabase database tables: orders & order_items
 */
async function saveOrderToSupabase(orderData, orderItemsData) {
    try {
        if (supabaseClient) {
            const refCode = orderData.order_reference || orderData.order_ref || generateOrderReference();
            const payload = {
                order_reference: refCode,
                customer_name: orderData.customer_name || orderData.full_name || 'Client',
                customer_email: orderData.customer_email || orderData.email || '',
                customer_phone: orderData.customer_phone || orderData.phone || '',
                address: orderData.address || '',
                city: orderData.city || '',
                state: orderData.state || '',
                pincode: orderData.pincode || '',
                total_amount: orderData.total_amount || 0,
                status: orderData.status || 'pending'
            };

            // Insert into orders table
            let { data: orderResult, error: orderErr } = await supabaseClient
                .from("orders")
                .insert([payload])
                .select();

            // If order_reference column doesn't exist yet on backend, retry without order_reference column in payload
            if (orderErr && orderErr.message && orderErr.message.includes("order_reference")) {
                const fallbackPayload = { ...payload };
                delete fallbackPayload.order_reference;
                const retryRes = await supabaseClient.from("orders").insert([fallbackPayload]).select();
                orderResult = retryRes.data;
                orderErr = retryRes.error;
            }

            if (orderErr) {
                console.warn("Supabase orders table insert status:", orderErr.message);
                return { success: true, orderId: refCode, orderRef: refCode };
            }

            const insertedOrder = orderResult && orderResult[0];
            const parentOrderId = insertedOrder ? insertedOrder.id : (orderData.order_id || orderData.id);
            const displayRef = (insertedOrder && insertedOrder.order_reference) ? insertedOrder.order_reference : refCode;

            // Map order items to parent order ID
            const itemsToInsert = (orderItemsData || []).map(item => ({
                order_id: parentOrderId,
                product_id: item.product_id || null,
                product_name: item.product_name || 'Timepiece',
                quantity: item.quantity || 1,
                price: item.price || 0
            }));

            if (itemsToInsert.length > 0) {
                const { error: itemsErr } = await supabaseClient
                    .from("order_items")
                    .insert(itemsToInsert);

                if (itemsErr) {
                    console.warn("Supabase order_items table insert status:", itemsErr.message);
                }
            }

            // Automatic Inventory Stock Reduction
            if (supabaseClient && orderItemsData && orderItemsData.length > 0) {
                for (const item of orderItemsData) {
                    const targetId = item.product_id || item.id;
                    if (!targetId) continue;

                    let { data: prodData, error: fetchErr } = await supabaseClient
                        .from("products")
                        .select("id, stock")
                        .eq("id", targetId)
                        .maybeSingle();

                    if (!prodData && !isNaN(targetId)) {
                        const { data: numProd } = await supabaseClient
                            .from("products")
                            .select("id, stock")
                            .eq("id", Number(targetId))
                            .maybeSingle();
                        if (numProd) prodData = numProd;
                    }

                    if (prodData) {
                        const currentStock = prodData.stock !== undefined && prodData.stock !== null ? parseInt(prodData.stock) : 0;
                        const qty = parseInt(item.quantity || 1);
                        const newStock = Math.max(0, currentStock - qty);

                        const { error: updateErr } = await supabaseClient
                            .from("products")
                            .update({ stock: newStock })
                            .eq("id", prodData.id);

                        if (updateErr) {
                            console.error(`Failed to update stock for product ${targetId}:`, updateErr.message);
                            return { success: false, error: `Failed to update inventory stock for ${item.product_name || 'timepiece'}.` };
                        }
                    }
                }
            }

            return { success: true, orderId: parentOrderId, orderRef: displayRef };
        } else {
            const fallbackId = orderData.order_id || orderData.id || ('CLC-' + Math.floor(100000 + Math.random() * 900000));
            return { success: true, orderId: fallbackId, orderRef: fallbackId };
        }
    } catch (err) {
        console.warn("Order insertion handling:", err);
        return { success: false, error: "An unexpected error occurred while placing your order." };
    }
}

window.supabaseClient = supabaseClient;
window.fetchProductsFromDatabase = fetchProductsFromDatabase;
window.saveOrderToSupabase = saveOrderToSupabase;

/**
 * Fetch reviews for a product from Supabase table `public.reviews`
 */
async function fetchReviewsFromDatabase(productId) {
    initSupabaseClient();
    if (!productId) return [];

    try {
        if (supabaseClient) {
            // 1. Try querying with string product_id
            let { data, error } = await supabaseClient
                .from("reviews")
                .select("*")
                .eq("product_id", String(productId))
                .order("created_at", { ascending: false });

            if (data && data.length > 0) return data;

            // 2. If empty and productId is numeric, try integer query
            if ((!data || data.length === 0) && !isNaN(productId)) {
                const { data: numData } = await supabaseClient
                    .from("reviews")
                    .select("*")
                    .eq("product_id", Number(productId))
                    .order("created_at", { ascending: false });
                if (numData && numData.length > 0) return numData;
            }

            if (error) {
                console.warn("Supabase SDK reviews query warning:", error.message);
                return await fetchReviewsViaRest(productId);
            }
            return data || [];
        }
        return await fetchReviewsViaRest(productId);
    } catch (e) {
        console.warn("Failed to fetch reviews via SDK, using REST fallback:", e);
        return await fetchReviewsViaRest(productId);
    }
}

async function fetchReviewsViaRest(productId) {
    try {
        const cleanUrl = ENV_SUPABASE_URL.replace(/\/$/, "");
        const res = await fetch(`${cleanUrl}/reviews?product_id=eq.${encodeURIComponent(productId)}&order=created_at.desc`, {
            headers: {
                "apikey": ENV_SUPABASE_PUBLISHABLE_KEY,
                "Authorization": `Bearer ${ENV_SUPABASE_PUBLISHABLE_KEY}`
            }
        });
        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        console.error("REST reviews fetch failed:", e);
        return [];
    }
}

/**
 * Insert a new review into Supabase table `public.reviews`
 */
async function saveReviewToSupabase(reviewData) {
    initSupabaseClient();
    try {
        if (supabaseClient) {
            const { data, error } = await supabaseClient
                .from("reviews")
                .insert([reviewData])
                .select();

            if (error) {
                console.warn("Supabase SDK review insert warning:", error.message);
                return await saveReviewViaRest(reviewData);
            }
            return { success: true, data: data ? data[0] : null };
        }
        return await saveReviewViaRest(reviewData);
    } catch (e) {
        console.warn("Error inserting review via SDK:", e);
        return await saveReviewViaRest(reviewData);
    }
}

async function saveReviewViaRest(reviewData) {
    try {
        const cleanUrl = ENV_SUPABASE_URL.replace(/\/$/, "");
        const res = await fetch(`${cleanUrl}/reviews`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": ENV_SUPABASE_PUBLISHABLE_KEY,
                "Authorization": `Bearer ${ENV_SUPABASE_PUBLISHABLE_KEY}`,
                "Prefer": "return=representation"
            },
            body: JSON.stringify(reviewData)
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText);
        }

        const data = await res.json();
        return { success: true, data: data ? data[0] : null };
    } catch (e) {
        console.error("REST review insert failed:", e);
        return { success: false, error: e.message };
    }
}

window.fetchReviewsFromDatabase = fetchReviewsFromDatabase;
window.saveReviewToSupabase = saveReviewToSupabase;

/**
 * Update visibility of Admin navigation links based on active session
 */
async function updateGlobalAdminNavVisibility(session) {
    if (session === undefined && supabaseClient && supabaseClient.auth) {
        try {
            const { data } = await supabaseClient.auth.getSession();
            session = data ? data.session : null;
        } catch (e) {}
    }

    const hasSession = !!(session && session.user);
    const links = document.querySelectorAll('.admin-nav-link, a[href="admin.html"]');

    links.forEach(link => {
        if (hasSession) {
            link.classList.remove('hidden');
        } else {
            link.classList.add('hidden');
        }
    });
}

/**
 * Initialize global Supabase Auth state listener
 */
function initAuthSessionListener() {
    initSupabaseClient();
    if (supabaseClient && supabaseClient.auth) {
        // Initial session check
        supabaseClient.auth.getSession().then(({ data }) => {
            updateGlobalAdminNavVisibility(data ? data.session : null);
        }).catch(() => {});

        // Listen for auth state changes (login, logout, token refresh)
        supabaseClient.auth.onAuthStateChange((event, session) => {
            updateGlobalAdminNavVisibility(session);
            if (typeof window.checkAdminAuth === 'function') {
                window.checkAdminAuth();
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthSessionListener);
} else {
    initAuthSessionListener();
}

window.updateGlobalAdminNavVisibility = updateGlobalAdminNavVisibility;
window.initAuthSessionListener = initAuthSessionListener;

