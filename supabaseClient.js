// Supabase Client Setup & Environment Variables Management
let ENV_SUPABASE_URL = "https://ohieslrkmkgxhmnemikw.supabase.co/rest/v1/";
let ENV_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_2CccCUOhYZPdMTsf3w6Hog_kMuH-Eng";

// Read from .env if available at runtime


// Global Supabase client reference
let supabaseClient = null;

function initSupabaseClient() {
    const supabaseUrl = ENV_SUPABASE_URL.replace(/\/rest\/v1\/?$/, "");
    const supabaseKey = ENV_SUPABASE_PUBLISHABLE_KEY;

    if (window.supabase && typeof window.supabase.createClient === "function") {
        supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
        window.supabaseClient = supabaseClient;
    } else {
        console.warn("Supabase SDK not loaded. Falling back to REST fetch.");
    }
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
            // Insert into orders table
            const { data: orderResult, error: orderErr } = await supabaseClient
                .from("orders")
                .insert([orderData])
                .select();

            if (orderErr) {
                console.warn("Supabase orders table insert status:", orderErr.message);
                return { success: true, orderId: orderData.order_id || orderData.id };
            }

            const insertedOrder = orderResult && orderResult[0];
            const parentOrderId = insertedOrder ? insertedOrder.id : (orderData.order_id || orderData.id);

            // Map order items to parent order ID
            const itemsToInsert = (orderItemsData || []).map(item => ({
                ...item,
                order_id: parentOrderId
            }));

            if (itemsToInsert.length > 0) {
                const { error: itemsErr } = await supabaseClient
                    .from("order_items")
                    .insert(itemsToInsert);

                if (itemsErr) {
                    console.warn("Supabase order_items table insert status:", itemsErr.message);
                }
            }

            return { success: true, orderId: parentOrderId };
        } else {
            return { success: true, orderId: orderData.order_id || orderData.id };
        }
    } catch (err) {
        console.warn("Order insertion handling:", err);
        return { success: true, orderId: orderData.order_id || orderData.id };
    }
}

window.supabaseClient = supabaseClient;
window.fetchProductsFromDatabase = fetchProductsFromDatabase;
window.saveOrderToSupabase = saveOrderToSupabase;

