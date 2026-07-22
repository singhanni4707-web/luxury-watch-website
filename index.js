// Configuration
const totalFrames = 240;
const frameUrls = [];

// Generate the frame URLs (from /photos/frame_000001.jpg to /photos/frame_000240.jpg)
for (let i = 1; i <= totalFrames; i++) {
    const paddedIndex = String(i).padStart(6, '0');
    frameUrls.push(`/photos/frame_${paddedIndex}.jpg`);
}

// DOM Elements
const canvas = document.getElementById('animation-canvas');
const ctx = canvas.getContext('2d');
const preloader = document.getElementById('preloader');
const loaderFill = document.getElementById('loader-fill');
const loaderPercentage = document.getElementById('loader-percentage');

// Preloaded Image Cache
const images = [];
let loadedCount = 0;

// Lerped Scroll Animation Variables
let currentFrame = 1;
let targetFrame = 1;
const easingFactor = 0.12; // Adjust for smoothness vs responsiveness

// 1. Image Preloading
function preloadImages() {
    return new Promise((resolve) => {
        frameUrls.forEach((url, index) => {
            const img = new Image();
            img.src = url;
            img.onload = () => {
                images[index] = img;
                loadedCount++;
                updateLoaderProgress();
                if (loadedCount === totalFrames) {
                    setTimeout(completeLoading, 400);
                    resolve();
                }
            };
            img.onerror = () => {
                console.error(`Failed to load image: ${url}`);
                images[index] = null;
                loadedCount++;
                updateLoaderProgress();
                if (loadedCount === totalFrames) {
                    setTimeout(completeLoading, 400);
                    resolve();
                }
            };
        });
    });
}

function updateLoaderProgress() {
    const percent = Math.round((loadedCount / totalFrames) * 100);
    loaderFill.style.width = `${percent}%`;
    loaderPercentage.innerText = `${percent}%`;
}

function completeLoading() {
    preloader.classList.add('fade-out');
    // Start animation loop once preloaded
    requestAnimationFrame(animationLoop);
}

// 2. Canvas Rendering Engine
function resizeCanvas() {
    // Calculate display dimensions
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;
    
    // Scale for high-DPI displays (retina)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    ctx.scale(dpr, dpr);
    
    // Redraw immediately after resize
    drawFrame(Math.round(currentFrame));
}

function drawFrame(frameIndex) {
    const imgIndex = Math.max(0, Math.min(totalFrames - 1, frameIndex - 1));
    const img = images[imgIndex];
    if (!img) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Crop the bottom portion containing the watermark (bottom 4%)
    const cropBottom = Math.round(img.height * 0.04);
    const sWidth = img.width;
    const sHeight = img.height - cropBottom;

    // Calculate aspect ratio fit (similar to object-fit: contain) using cropped dimensions
    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;

    const imgRatio = sWidth / sHeight;
    const canvasRatio = canvasWidth / canvasHeight;

    let drawWidth, drawHeight, x, y;

    if (canvasRatio > imgRatio) {
        // Window is wider than image aspect ratio
        drawHeight = canvasHeight;
        drawWidth = canvasHeight * imgRatio;
        x = (canvasWidth - drawWidth) / 2;
        y = 0;
    } else {
        // Window is taller than image aspect ratio
        drawWidth = canvasWidth;
        drawHeight = canvasWidth / imgRatio;
        x = 0;
        y = (canvasHeight - drawHeight) / 2;
    }

    // Draw only the cropped portion to remove the watermark
    ctx.drawImage(img, 0, 0, sWidth, sHeight, x, y, drawWidth, drawHeight);
}

// 3. Scroll Logic (Clamped to scroll-container dimensions only)
function updateScrollProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    
    // Get the height of the scroll container (where the canvas sticks)
    const scrollContainer = document.getElementById('scroll-container');
    if (!scrollContainer) return;
    
    const containerHeight = scrollContainer.offsetHeight;
    const scrollRange = containerHeight - window.innerHeight;
    
    // Calculate progress within this section only, clamping it between 0 and 1
    let progress = 0;
    if (scrollRange > 0) {
        progress = Math.max(0, Math.min(1, scrollTop / scrollRange));
    }
    
    // Map progress (0 to 1) to target frame index (1 to 240)
    targetFrame = 1 + progress * (totalFrames - 1);

    // Fade out hero overlay when scroll is within 30% of the section
    const heroOverlay = document.getElementById('hero-overlay');
    if (heroOverlay) {
        const fadeLimit = 0.3;
        if (progress <= fadeLimit) {
            const opacity = 1 - (progress / fadeLimit);
            const translateY = -progress * 80; // Subtle up-slide translation
            heroOverlay.style.opacity = opacity;
            heroOverlay.style.transform = `translateY(${translateY}px)`;
            heroOverlay.style.visibility = 'visible';
        } else {
            heroOverlay.style.opacity = 0;
            heroOverlay.style.visibility = 'hidden';
        }
    }
}

// 4. Smooth Lerp Animation Loop
function animationLoop() {
    // Lerp logic: current value moves towards target value by a percentage of the distance
    const diff = targetFrame - currentFrame;
    
    if (Math.abs(diff) > 0.01) {
        currentFrame += diff * easingFactor;
        drawFrame(Math.round(currentFrame));
    }
    
    requestAnimationFrame(animationLoop);
}

// 5. Scroll Reveal Animations (for integrated sections)
function initRevealAnimations() {
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.reveal').forEach((el) => {
        observer.observe(el);
    });
}

// 6. Smooth Scroll Implementation for anchor links
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetEl = document.querySelector(targetId);
            if (targetEl) {
                targetEl.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Setup Event Listeners
window.addEventListener('resize', resizeCanvas);
window.addEventListener('scroll', () => {
    updateScrollProgress();
    handleNavbarScroll();
});

// 7. Navbar background transition on scroll
function handleNavbarScroll() {
    const nav = document.getElementById('main-nav');
    if (!nav) return;
    if (window.scrollY > 50) {
        nav.classList.remove('bg-transparent', 'border-white/5');
        nav.classList.add('bg-[#121414]/90', 'backdrop-blur-md', 'border-outline-variant');
    } else {
        nav.classList.add('bg-transparent', 'border-white/5');
        nav.classList.remove('bg-[#121414]/90', 'backdrop-blur-md', 'border-outline-variant');
    }
}

// 8. Supabase Product Integration & Rendering
const DEFAULT_PRODUCTS = [
    {
        name: "Obsidian Gold",
        series: "Signature Series",
        subtitle: "Automatic Movement • 42mm • Skeleton Dial",
        price: "$12,400",
        image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCJ1d0DJTQ3Ber0yT60vjZ1gMWAZ_uENqh41A5rl9BDwkpfKjBapwzxoFURpKIziVM-tk0MwzB4zgC7fvB-rk3E2Z6vmzdw8C-TA9GMViTmBBOjz5yHNxHqeWb37DLi-CR4w6U9EdsS2U293w1YTMMeJUbJ8Qa-evgFYOmRYqfHHsI88ntext6mg9Q1rg_cRuDjJfL4uSC9ysqgHCBuIzMUbqq4Mwz6J2wkE5ia3qsTSi0tPIXEBOmvq6XlU51WYwTMJTvHS7rodmhw"
    },
    {
        name: "Classic Chrono",
        series: "Heritage Line",
        subtitle: "Chronograph • 40mm • 24k Gold Bracelet",
        price: "$15,800",
        image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCcw9oT_vxxtgOQUoy_XP6ZnfURLvnq1V8bccXUMmmAcrJLIh-VAuKcXnVP9LGfK1mH1iqg6ijXH7kVQgdFzMWX9GZVFtLQchv6s2v8GleUygniIuc5VMBBeWMdNNSu2DisnJnPvIEcVcv0uPO8umwGWD4QiOXOjeN2TTsAQT6it7FuCkLfJr5rFxBnz7pIAdOEbDjcVTA5_-yzmoirnNFO1KXQYhnklKcANe9fVIquiupKLuAi_2WiB-0mjKZnB0y_FbihOChH1sbN"
    },
    {
        name: "Midnight Masterpiece",
        series: "Limited Edition",
        subtitle: "Manual Wind • 44mm • Titanium Case",
        price: "$24,000",
        image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCwE9xOPMZC9vRUneIX68p0UpSciLB3Ug2YBrnaxWna1XUTOif1c3tEynItWtnzi_hfDyt5hxo0gJmPRKHcV3HPZ3CPbxNkCfj6f9IX2n8Mu0sH8Q7LOA21MSzMREIZtjtLkB8A62r6t9oRCUQ0xk6bMZBLpbDCdMiPm36P6mV6Ha_oQhpVG9Sj6BOuc8uWusukPiG_pWqYWqIidFfoiQVe-P8IzZD9UOy0bVA9m-D7a5DHxm3YbEgLxdddy5qzlaBrJEa5AIqCBqQ5"
    }
];

// Helper function to extract product image URL from Supabase record
function getProductImageUrl(item) {
    if (!item) return '';
    return item.image_url || item['image_url'] || item['image-url'] || item.imageUrl || item.image || item.img || '';
}

// -------------------------------------------------------------
// 8. E-Commerce State, Supabase Product Integration & Cart System
// -------------------------------------------------------------
let fetchedProducts = [];
let activeModalProduct = null;
let cartState = [];

const CART_STORAGE_KEY = 'calci_luxury_cart';

// Format numeric or string prices nicely (e.g. 12400 -> "$12,400")
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

// Parse price string/number into float for calculations
function parsePriceToNumber(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

// Load cart state from localStorage
function initCart() {
    try {
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        if (stored) {
            cartState = JSON.parse(stored);
        }
    } catch (e) {
        console.warn('Could not read cart from localStorage:', e);
        cartState = [];
    }
    updateCartUI();
}

// Save cart state to localStorage
function saveCart() {
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartState));
    } catch (e) {
        console.warn('Could not save cart to localStorage:', e);
    }
    updateCartUI();
}

// Calculate total cart items count
function getCartTotalCount() {
    return cartState.reduce((sum, item) => sum + (item.quantity || 1), 0);
}

// Calculate total cart price
function getCartSubtotal() {
    return cartState.reduce((sum, item) => {
        const priceNum = parsePriceToNumber(item.price);
        return sum + priceNum * (item.quantity || 1);
    }, 0);
}

// Update Cart Badge and Drawer UI
function updateCartUI() {
    const badge = document.getElementById('cart-count-badge');
    const drawerCount = document.getElementById('cart-drawer-count');
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');
    const container = document.getElementById('cart-items-container');

    const totalItems = getCartTotalCount();
    const subtotal = getCartSubtotal();

    // Badge Update
    if (badge) {
        badge.innerText = totalItems;
        if (totalItems > 0) {
            badge.classList.remove('scale-0', 'opacity-0');
            badge.classList.add('scale-100', 'opacity-100');
        } else {
            badge.classList.add('scale-0', 'opacity-0');
            badge.classList.remove('scale-100', 'opacity-100');
        }
    }

    if (drawerCount) {
        drawerCount.innerText = `(${totalItems})`;
    }

    if (subtotalEl) {
        subtotalEl.innerText = formatPrice(subtotal);
    }
    if (totalEl) {
        totalEl.innerText = formatPrice(subtotal);
    }

    // Render Drawer Items
    if (container) {
        if (cartState.length === 0) {
            container.innerHTML = `
                <div class="h-64 flex flex-col items-center justify-center text-center p-6 space-y-4">
                    <span class="material-symbols-outlined text-outline text-5xl">shopping_bag</span>
                    <p class="text-white font-headline-md text-lg">Your bag is empty</p>
                    <p class="text-on-surface-variant text-xs max-w-xs leading-relaxed">Explore our curated luxury selection to add exquisite timepieces to your collection.</p>
                </div>
            `;
        } else {
            container.innerHTML = cartState.map((item) => {
                const imgUrl = item.image_url || getProductImageUrl(item);
                const priceNum = parsePriceToNumber(item.price);
                const itemTotal = formatPrice(priceNum * (item.quantity || 1));

                return `
                    <div class="flex items-center gap-4 bg-surface-container-high p-4 rounded-xl border border-outline-variant/50 relative group">
                        <div class="size-20 bg-surface-container-lowest rounded-lg p-2 flex items-center justify-center flex-shrink-0 border border-outline-variant/30">
                            <img src="${imgUrl}" alt="${item.name}" class="w-full h-full object-contain">
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-primary text-[10px] font-label-caps uppercase tracking-wider">${item.brand || 'CALCI'}</p>
                            <h4 class="text-white font-bold text-sm truncate">${item.name}</h4>
                            <p class="text-white font-bold text-xs mt-1">${formatPrice(item.price)}</p>
                            
                            <!-- Quantity Controls -->
                            <div class="flex items-center gap-2 mt-2">
                                <button onclick="window.changeCartQuantity('${item.id}', -1)" class="size-6 rounded-md bg-surface-bright text-white hover:text-primary flex items-center justify-center text-xs font-bold transition-colors cursor-pointer" aria-label="Decrease quantity">-</button>
                                <span class="text-xs text-white font-semibold w-4 text-center">${item.quantity}</span>
                                <button onclick="window.changeCartQuantity('${item.id}', 1)" class="size-6 rounded-md bg-surface-bright text-white hover:text-primary flex items-center justify-center text-xs font-bold transition-colors cursor-pointer" aria-label="Increase quantity">+</button>
                            </div>
                        </div>
                        <div class="flex flex-col items-end justify-between self-stretch">
                            <button onclick="window.removeFromCart('${item.id}')" class="text-on-surface-variant hover:text-error transition-colors p-1 cursor-pointer" title="Remove item">
                                <span class="material-symbols-outlined text-base">delete</span>
                            </button>
                            <span class="text-xs font-bold text-primary">${itemTotal}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}

// Add Item to Cart
function addToCart(product, openDrawer = false) {
    if (!product) return;

    const productId = String(product.id || product.name);
    const existingIndex = cartState.findIndex(i => String(i.id || i.name) === productId);

    const imgUrl = getProductImageUrl(product);
    const seriesName = product.series || product.brand || product.category || 'Signature Series';

    if (existingIndex > -1) {
        cartState[existingIndex].quantity = (cartState[existingIndex].quantity || 1) + 1;
    } else {
        cartState.push({
            id: productId,
            name: product.name || 'Calci Timepiece',
            price: product.price || '$12,400',
            brand: seriesName,
            image_url: imgUrl,
            description: product.description || product.subtitle || '',
            quantity: 1
        });
    }

    saveCart();
    showToast(`Added "${product.name || 'Timepiece'}" to your bag`);

    if (openDrawer) {
        openCartDrawer();
    }
}

// Change Quantity in Cart
function changeCartQuantity(productId, delta) {
    const idx = cartState.findIndex(i => String(i.id || i.name) === String(productId));
    if (idx > -1) {
        cartState[idx].quantity = (cartState[idx].quantity || 1) + delta;
        if (cartState[idx].quantity <= 0) {
            cartState.splice(idx, 1);
        }
        saveCart();
    }
}

// Remove Item from Cart
function removeFromCart(productId) {
    cartState = cartState.filter(i => String(i.id || i.name) !== String(productId));
    saveCart();
    showToast('Item removed from your bag');
}

// Toast Feedback
let toastTimer = null;
function showToast(message) {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toast-message');
    if (!toast || !msgEl) return;

    msgEl.innerText = message;
    toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
    toast.classList.add('translate-y-0', 'opacity-100');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
        toast.classList.remove('translate-y-0', 'opacity-100');
    }, 3000);
}

// Open/Close Cart Drawer
function openCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-drawer-overlay');
    if (!drawer || !overlay) return;

    overlay.classList.remove('hidden');
    setTimeout(() => {
        overlay.classList.remove('opacity-0');
        drawer.classList.remove('translate-x-full');
    }, 10);
}

function closeCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-drawer-overlay');
    if (!drawer || !overlay) return;

    drawer.classList.add('translate-x-full');
    overlay.classList.add('opacity-0');
    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 300);
}

// Open/Close Product Details Modal
function openProductModal(product) {
    activeModalProduct = product;
    const backdrop = document.getElementById('product-modal-backdrop');
    const card = document.getElementById('product-modal-card');
    const imgEl = document.getElementById('modal-product-image');
    const brandEl = document.getElementById('modal-product-brand');
    const nameEl = document.getElementById('modal-product-name');
    const priceEl = document.getElementById('modal-product-price');
    const descEl = document.getElementById('modal-product-description');

    if (!backdrop || !card) return;

    const imgUrl = getProductImageUrl(product);
    const seriesName = product.series || product.brand || product.category || 'Signature Series';
    const subtitleText = product.description || product.subtitle || 'Exquisite hand-assembled Swiss movement with precision certification and Obsidian finish.';

    if (imgEl) imgEl.src = imgUrl;
    if (brandEl) brandEl.innerText = seriesName;
    if (nameEl) nameEl.innerText = product.name || 'Calci Timepiece';
    if (priceEl) priceEl.innerText = formatPrice(product.price);
    if (descEl) descEl.innerText = subtitleText;

    backdrop.classList.remove('hidden', 'pointer-events-none');
    setTimeout(() => {
        backdrop.classList.remove('opacity-0');
        card.classList.remove('scale-95');
        card.classList.add('scale-100');
    }, 10);
}

function closeProductModal() {
    const backdrop = document.getElementById('product-modal-backdrop');
    const card = document.getElementById('product-modal-card');
    if (!backdrop || !card) return;

    card.classList.remove('scale-100');
    card.classList.add('scale-95');
    backdrop.classList.add('opacity-0');
    setTimeout(() => {
        backdrop.classList.add('hidden', 'pointer-events-none');
        activeModalProduct = null;
    }, 300);
}

// Fetch products from Supabase and render
async function loadSupabaseProducts() {
    const container = document.getElementById('products-grid');
    if (!container) return;

    try {
        let products = [];
        if (typeof window.fetchProductsFromDatabase === 'function') {
            products = await window.fetchProductsFromDatabase();
        }

        if (!products || products.length === 0) {
            products = DEFAULT_PRODUCTS;
        }

        fetchedProducts = products;
        renderProducts(products, container);
    } catch (error) {
        console.error('Failed to load products from Supabase:', error);
        fetchedProducts = DEFAULT_PRODUCTS;
        renderProducts(DEFAULT_PRODUCTS, container);
    }
}

// Render Product Cards
function renderProducts(items, container) {
    container.innerHTML = '';
    items.forEach((item, index) => {
        const delay = index * 150;
        const seriesName = item.series || item.brand || item.category || 'Signature Series';
        const subtitleText = item.subtitle || item.description || (item.stock !== undefined ? `Stock: ${item.stock} available` : 'Swiss Precision Movement');
        const priceText = formatPrice(item.price);
        const imgUrl = getProductImageUrl(item) || (DEFAULT_PRODUCTS[index % DEFAULT_PRODUCTS.length] ? DEFAULT_PRODUCTS[index % DEFAULT_PRODUCTS.length].image_url : '');

        const card = document.createElement('div');
        card.className = 'reveal group active cursor-pointer hover:-translate-y-1 transition-all duration-300';
        card.style.transitionDelay = `${delay}ms`;

        card.innerHTML = `
            <div class="relative aspect-[3/4] bg-surface-container-high rounded-xl overflow-hidden mb-6 flex items-center justify-center p-12 transition-all duration-500 group-hover:shadow-[0_0_50px_-12px_rgba(233,193,118,0.35)] group-hover:border group-hover:border-primary/30">
                <img class="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700" alt="${item.name || 'Calci Luxury Watch'}" src="${imgUrl}">
                <div class="absolute bottom-4 right-4 bg-primary text-on-primary p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 shadow-lg flex items-center justify-center">
                    <span class="material-symbols-outlined text-base">visibility</span>
                </div>
            </div>
            <p class="text-primary text-xs font-label-caps uppercase mb-2 tracking-widest">${seriesName}</p>
            <h3 class="font-headline-md text-white mb-2 group-hover:text-primary transition-colors">${item.name || 'Calci Timepiece'}</h3>
            <p class="text-on-surface-variant text-sm font-body-md mb-4 line-clamp-2">${subtitleText}</p>
            <div class="flex items-center justify-between">
                <p class="text-white font-bold text-lg">${priceText}</p>
                <span class="text-xs uppercase text-primary font-bold tracking-wider opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    Details <span class="material-symbols-outlined text-xs">arrow_forward</span>
                </span>
            </div>
        `;

        // Click card to open modal
        card.addEventListener('click', () => {
            openProductModal(item);
        });

        container.appendChild(card);
    });

    if (typeof initRevealAnimations === 'function') {
        initRevealAnimations();
    }
}

// Setup Event Listeners for Cart and Modals
function initEcommerceListeners() {
    // Open/Close Cart Drawer
    const openCartBtn = document.getElementById('open-cart-btn');
    const closeCartBtn = document.getElementById('close-cart-btn');
    const cartOverlay = document.getElementById('cart-drawer-overlay');

    if (openCartBtn) openCartBtn.addEventListener('click', openCartDrawer);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCartDrawer);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCartDrawer);

    // Close Product Modal
    const closeModalBtn = document.getElementById('close-product-modal');
    const modalBackdrop = document.getElementById('product-modal-backdrop');

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeProductModal);
    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', (e) => {
            if (e.target === modalBackdrop) {
                closeProductModal();
            }
        });
    }

    // Modal Actions: Add to Cart & Buy Now
    const modalAddBtn = document.getElementById('modal-add-to-cart');
    const modalBuyBtn = document.getElementById('modal-buy-now');

    if (modalAddBtn) {
        modalAddBtn.addEventListener('click', () => {
            if (activeModalProduct) {
                addToCart(activeModalProduct, false);
            }
        });
    }

    if (modalBuyBtn) {
        modalBuyBtn.addEventListener('click', () => {
            if (activeModalProduct) {
                addToCart(activeModalProduct, true);
                closeProductModal();
            }
        });
    }

    // Checkout Button
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cartState.length === 0) {
                showToast('Your shopping bag is empty.');
                return;
            }
            showToast('Order placed successfully! Thank you.');
            cartState = [];
            saveCart();
            closeCartDrawer();
        });
    }

    // Keyboard ESC key handler
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeProductModal();
            closeCartDrawer();
        }
    });
}

// Expose functions globally for inline onclick handlers
window.changeCartQuantity = changeCartQuantity;
window.removeFromCart = removeFromCart;

// Run Setup
preloadImages().then(() => {
    resizeCanvas();
    updateScrollProgress();
    handleNavbarScroll();
    initRevealAnimations();
    initSmoothScroll();
    initCart();
    initEcommerceListeners();
    loadSupabaseProducts();
});


