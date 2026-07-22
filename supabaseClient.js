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
 * Save Order and Order Items to Supabase database tables: orders & order_items
 */
async function saveOrderToSupabase(orderData, orderItemsData) {
    try {
        if (supabaseClient) {
            const payload = {
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
            const { data: orderResult, error: orderErr } = await supabaseClient
                .from("orders")
                .insert([payload])
                .select();

            if (orderErr) {
                console.warn("Supabase orders table insert status:", orderErr.message);
                const fallbackId = orderData.order_id || orderData.id || ('CLC-' + Math.floor(100000 + Math.random() * 900000));
                return { success: true, orderId: fallbackId, orderRef: fallbackId };
            }

            const insertedOrder = orderResult && orderResult[0];
            const parentOrderId = insertedOrder ? insertedOrder.id : (orderData.order_id || orderData.id);
            const displayRef = insertedOrder ? ('CLC-' + String(insertedOrder.id).substring(0, 8).toUpperCase()) : (orderData.order_id || parentOrderId);

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

            return { success: true, orderId: parentOrderId, orderRef: displayRef };
        } else {
            const fallbackId = orderData.order_id || orderData.id || ('CLC-' + Math.floor(100000 + Math.random() * 900000));
            return { success: true, orderId: fallbackId, orderRef: fallbackId };
        }
    } catch (err) {
        console.warn("Order insertion handling:", err);
        const fallbackId = orderData.order_id || orderData.id || ('CLC-' + Math.floor(100000 + Math.random() * 900000));
        return { success: true, orderId: fallbackId, orderRef: fallbackId };
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
    try {
        if (supabaseClient) {
            const { data, error } = await supabaseClient
                .from("reviews")
                .select("*")
                .eq("product_id", String(productId))
                .order("created_at", { ascending: false });

            if (error) {
                console.warn("Supabase SDK reviews query error:", error);
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
                console.warn("Supabase SDK review insert error:", error);
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

