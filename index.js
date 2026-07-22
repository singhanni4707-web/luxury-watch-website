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

// 7. Navbar background transition & Active link highlighting on scroll
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
    updateActiveNavHighlighting();
}

function updateActiveNavHighlighting() {
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    if (!navLinks || navLinks.length === 0) return;

    const sections = ['scroll-container', 'heritage', 'collection', 'craftsmanship', 'gallery', 'footer'];
    let currentSection = 'scroll-container';

    const scrollPosition = window.scrollY + 200;

    for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
            const top = el.offsetTop;
            const height = el.offsetHeight;
            if (scrollPosition >= top && scrollPosition < top + height) {
                currentSection = sectionId;
            }
        }
    }

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === `#${currentSection}` || (currentSection === 'scroll-container' && (href === '#scroll-container' || href === '#'))) {
            link.classList.add('text-primary', 'border-primary');
            link.classList.remove('text-on-surface', 'border-transparent');
        } else {
            link.classList.remove('text-primary', 'border-primary');
            link.classList.add('text-on-surface', 'border-transparent');
        }
    });
}

function initNewsletterForm() {
    const form = document.getElementById('newsletter-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('newsletter-email');
            if (input && input.value) {
                showToast('Welcome to CALCI Private Circle');
                input.value = '';
            }
        });
    }
}

// 8. Supabase Product Integration & Rendering
const DEFAULT_PRODUCTS = [];

// Helper function to extract product image URL from Supabase record
function getProductImageUrl(item) {
    if (!item) return '';
    return item['image-url'] || item.image_url || item['image_url'] || item.imageUrl || item.image || item.img || '';
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

        // Determine min/max price for slider
        if (products.length > 0) {
            const prices = products.map(p => parsePriceToNumber(p.price)).filter(p => p > 0);
            if (prices.length > 0) {
                const maxVal = Math.max(...prices);
                const slider = document.getElementById('price-range-slider');
                const label = document.getElementById('price-range-label');
                if (slider && maxVal > 0) {
                    slider.max = Math.ceil(maxVal * 1.1);
                    slider.value = slider.max;
                    currentMaxPrice = parseFloat(slider.max);
                    if (label) label.innerText = formatPrice(currentMaxPrice);
                }
            }
        }

        populateBrandFilterOptions();
        applyProductFiltersAndSort();
    } catch (error) {
        console.error('Failed to load products from Supabase:', error);
        fetchedProducts = DEFAULT_PRODUCTS;
        populateBrandFilterOptions();
        applyProductFiltersAndSort();
    }
}

// Product Search, Filter & Sort State
let currentSearchQuery = '';
let currentMaxPrice = 200000;
let currentSelectedBrand = 'all';
let currentSortOption = 'featured';

// Dynamically populate Brand Filter Select from fetched Supabase products
function populateBrandFilterOptions() {
    const brandSelect = document.getElementById('brand-filter-select');
    if (!brandSelect) return;

    const brandSet = new Set();
    fetchedProducts.forEach(item => {
        const b = (item.brand || item.series || '').trim();
        if (b) brandSet.add(b);
    });

    brandSelect.innerHTML = '<option value="all">All Brands</option>';
    brandSet.forEach(brand => {
        const opt = document.createElement('option');
        opt.value = brand.toLowerCase();
        opt.innerText = brand;
        brandSelect.appendChild(opt);
    });
}

// Apply Product Filters and Sort
function applyProductFiltersAndSort() {
    const container = document.getElementById('products-grid');
    const emptyState = document.getElementById('no-products-found');
    const countBadge = document.getElementById('matching-products-count');
    const clearSearchBtn = document.getElementById('btn-clear-search');

    if (!container) return;

    if (clearSearchBtn) {
        if (currentSearchQuery.trim() !== '') {
            clearSearchBtn.classList.remove('hidden');
        } else {
            clearSearchBtn.classList.add('hidden');
        }
    }

    let filtered = [...fetchedProducts];

    // 1. Text Search Filter (Name, Brand, Series, Subtitle, Description)
    if (currentSearchQuery.trim() !== '') {
        const q = currentSearchQuery.toLowerCase().trim();
        filtered = filtered.filter(item => {
            const name = (item.name || '').toLowerCase();
            const brand = (item.brand || '').toLowerCase();
            const series = (item.series || '').toLowerCase();
            const subtitle = (item.subtitle || '').toLowerCase();
            const desc = (item.description || '').toLowerCase();
            return name.includes(q) || brand.includes(q) || series.includes(q) || subtitle.includes(q) || desc.includes(q);
        });
    }

    // 2. Brand Filter
    if (currentSelectedBrand !== 'all') {
        const b = currentSelectedBrand.toLowerCase();
        filtered = filtered.filter(item => {
            const brand = (item.brand || '').toLowerCase();
            const series = (item.series || '').toLowerCase();
            const name = (item.name || '').toLowerCase();
            return brand.includes(b) || series.includes(b) || name.includes(b);
        });
    }

    // 3. Max Price Filter
    filtered = filtered.filter(item => {
        const priceNum = parsePriceToNumber(item.price);
        return priceNum <= currentMaxPrice;
    });

    // 4. Sorting (Featured, Price Low to High, Price High to Low, Newest)
    if (currentSortOption === 'price-low') {
        filtered.sort((a, b) => parsePriceToNumber(a.price) - parsePriceToNumber(b.price));
    } else if (currentSortOption === 'price-high') {
        filtered.sort((a, b) => parsePriceToNumber(b.price) - parsePriceToNumber(a.price));
    } else if (currentSortOption === 'newest') {
        filtered.sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            if (dateA !== dateB) return dateB - dateA;
            return String(b.id || '').localeCompare(String(a.id || ''));
        });
    }

    // 5. Update Matching Count Badge
    if (countBadge) {
        const len = filtered.length;
        countBadge.innerText = len === 1 ? 'Showing 1 Product' : `Showing ${len} Products`;
    }

    // 6. Render Cards or Show Empty State
    if (filtered.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
    } else {
        if (emptyState) emptyState.classList.add('hidden');
        renderProducts(filtered, container);
    }
}

// Clear All Filters
function clearAllProductFilters() {
    currentSearchQuery = '';
    currentSelectedBrand = 'all';
    currentSortOption = 'featured';

    const searchInput = document.getElementById('product-search-input');
    if (searchInput) searchInput.value = '';

    const brandSelect = document.getElementById('brand-filter-select');
    if (brandSelect) brandSelect.value = 'all';

    const priceSlider = document.getElementById('price-range-slider');
    const priceLabel = document.getElementById('price-range-label');
    if (priceSlider) {
        currentMaxPrice = parseFloat(priceSlider.max || 200000);
        priceSlider.value = currentMaxPrice;
        if (priceLabel) priceLabel.innerText = formatPrice(currentMaxPrice);
    }

    const sortSelect = document.getElementById('product-sort-select');
    if (sortSelect) sortSelect.value = 'featured';

    applyProductFiltersAndSort();
}
window.clearAllProductFilters = clearAllProductFilters;

function initProductSearchAndFilterListeners() {
    const searchInput = document.getElementById('product-search-input');
    const clearSearchBtn = document.getElementById('btn-clear-search');
    const priceSlider = document.getElementById('price-range-slider');
    const priceLabel = document.getElementById('price-range-label');
    const brandSelect = document.getElementById('brand-filter-select');
    const sortSelect = document.getElementById('product-sort-select');
    const clearAllBtn = document.getElementById('btn-clear-all-filters');
    const resetEmptyBtn = document.getElementById('btn-reset-empty-state');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearchQuery = e.target.value;
            applyProductFiltersAndSort();
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            currentSearchQuery = '';
            applyProductFiltersAndSort();
        });
    }

    if (priceSlider) {
        priceSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            currentMaxPrice = val;
            if (priceLabel) priceLabel.innerText = formatPrice(val);
            applyProductFiltersAndSort();
        });
    }

    if (brandSelect) {
        brandSelect.addEventListener('change', (e) => {
            currentSelectedBrand = e.target.value;
            applyProductFiltersAndSort();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSortOption = e.target.value;
            applyProductFiltersAndSort();
        });
    }

    if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllProductFilters);
    if (resetEmptyBtn) resetEmptyBtn.addEventListener('click', clearAllProductFilters);
}

// Render Product Cards
function renderProducts(items, container) {
    container.innerHTML = '';
    items.forEach((item, index) => {
        const delay = index * 150;
        const seriesName = item.series || item.brand || item.category || 'Signature Series';
        const subtitleText = item.subtitle || item.description || (item.stock !== undefined ? `Stock: ${item.stock} available` : 'Swiss Precision Movement');
        const priceText = formatPrice(item.price);
        const imgUrl = getProductImageUrl(item);

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

// Setup Event Listeners for Cart, Modals and Checkout
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

    // Checkout Drawer Button -> Opens Checkout Modal
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', openCheckoutModal);
    }

    // Close Checkout Modal
    const closeCheckoutBtn = document.getElementById('close-checkout-btn');
    const checkoutBackdrop = document.getElementById('checkout-modal-backdrop');

    if (closeCheckoutBtn) closeCheckoutBtn.addEventListener('click', closeCheckoutModal);
    if (checkoutBackdrop) {
        checkoutBackdrop.addEventListener('click', (e) => {
            if (e.target === checkoutBackdrop) {
                closeCheckoutModal();
            }
        });
    }

    // Checkout Form Submit -> Place Order
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleOrderSubmission);
    }

    // Close Confirmation Modal
    const closeConfirmBtn = document.getElementById('close-confirmation-btn');
    const confirmBackdrop = document.getElementById('confirmation-modal-backdrop');

    if (closeConfirmBtn) closeConfirmBtn.addEventListener('click', closeConfirmationModal);
    if (confirmBackdrop) {
        confirmBackdrop.addEventListener('click', (e) => {
            if (e.target === confirmBackdrop) {
                closeConfirmationModal();
            }
        });
    }

    // Keyboard ESC key handler for all active overlays
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeProductModal();
            closeCartDrawer();
            closeCheckoutModal();
            closeConfirmationModal();
        }
    });
}

// Open Express Checkout Modal
function openCheckoutModal() {
    if (cartState.length === 0) {
        showToast('Your shopping bag is empty.');
        return;
    }

    const backdrop = document.getElementById('checkout-modal-backdrop');
    const card = document.getElementById('checkout-modal-card');
    const summaryContainer = document.getElementById('checkout-items-summary');
    const subtotalEl = document.getElementById('checkout-subtotal');
    const totalEl = document.getElementById('checkout-total');

    if (!backdrop || !card) return;

    // Close drawer first
    closeCartDrawer();

    const subtotal = getCartSubtotal();
    if (subtotalEl) subtotalEl.innerText = formatPrice(subtotal);
    if (totalEl) totalEl.innerText = formatPrice(subtotal);

    // Populate checkout order items summary
    if (summaryContainer) {
        summaryContainer.innerHTML = cartState.map(item => {
            const imgUrl = item.image_url || getProductImageUrl(item);
            const priceNum = parsePriceToNumber(item.price);
            const itemTotal = formatPrice(priceNum * (item.quantity || 1));

            return `
                <div class="flex items-center justify-between text-xs bg-surface-container-high/80 p-3 rounded-lg border border-outline-variant/40">
                    <div class="flex items-center gap-3 min-w-0">
                        <img src="${imgUrl}" alt="${item.name}" class="size-10 object-contain rounded bg-surface-container-lowest p-1 flex-shrink-0">
                        <div class="truncate">
                            <p class="text-white font-bold truncate">${item.name}</p>
                            <p class="text-on-surface-variant text-[10px]">Qty: ${item.quantity || 1} × ${formatPrice(item.price)}</p>
                        </div>
                    </div>
                    <span class="text-primary font-bold ml-2 flex-shrink-0">${itemTotal}</span>
                </div>
            `;
        }).join('');
    }

    backdrop.classList.remove('hidden', 'pointer-events-none');
    setTimeout(() => {
        backdrop.classList.remove('opacity-0');
        card.classList.remove('scale-95');
        card.classList.add('scale-100');
    }, 10);
}

// Close Express Checkout Modal
function closeCheckoutModal() {
    const backdrop = document.getElementById('checkout-modal-backdrop');
    const card = document.getElementById('checkout-modal-card');
    if (!backdrop || !card) return;

    card.classList.remove('scale-100');
    card.classList.add('scale-95');
    backdrop.classList.add('opacity-0');
    setTimeout(() => {
        backdrop.classList.add('hidden', 'pointer-events-none');
    }, 300);
}

// Open Order Confirmation Modal
function openConfirmationModal(orderId, orderData, totalAmount) {
    const backdrop = document.getElementById('confirmation-modal-backdrop');
    const card = document.getElementById('confirmation-modal-card');
    const idEl = document.getElementById('confirm-order-id');
    const nameEl = document.getElementById('confirm-client-name');
    const emailEl = document.getElementById('confirm-client-email');
    const phoneEl = document.getElementById('confirm-client-phone');
    const addressEl = document.getElementById('confirm-client-address');
    const totalEl = document.getElementById('confirm-order-total');

    if (!backdrop || !card) return;

    if (idEl) idEl.innerText = orderId;
    if (nameEl) nameEl.innerText = orderData.customer_name || orderData.full_name || 'Client';
    if (emailEl) emailEl.innerText = orderData.customer_email || orderData.email || '';
    if (phoneEl) phoneEl.innerText = orderData.customer_phone || orderData.phone || '';
    if (addressEl) addressEl.innerText = `${orderData.address}, ${orderData.city}, ${orderData.state} - ${orderData.pincode}`;
    if (totalEl) totalEl.innerText = formatPrice(totalAmount);

    backdrop.classList.remove('hidden', 'pointer-events-none');
    setTimeout(() => {
        backdrop.classList.remove('opacity-0');
        card.classList.remove('scale-95');
        card.classList.add('scale-100');
    }, 10);
}

function closeConfirmationModal() {
    const backdrop = document.getElementById('confirmation-modal-backdrop');
    const card = document.getElementById('confirmation-modal-card');
    if (!backdrop || !card) return;

    card.classList.remove('scale-100');
    card.classList.add('scale-95');
    backdrop.classList.add('opacity-0');
    setTimeout(() => {
        backdrop.classList.add('hidden', 'pointer-events-none');
    }, 300);
}

// Handle Order Form Submission
async function handleOrderSubmission(e) {
    e.preventDefault();

    const name = document.getElementById('checkout-name')?.value.trim();
    const email = document.getElementById('checkout-email')?.value.trim();
    const phone = document.getElementById('checkout-phone')?.value.trim();
    const pincode = document.getElementById('checkout-pincode')?.value.trim();
    const address = document.getElementById('checkout-address')?.value.trim();
    const city = document.getElementById('checkout-city')?.value.trim();
    const state = document.getElementById('checkout-state')?.value.trim();

    if (!name || !email || !phone || !pincode || !address || !city || !state) {
        showToast('Please complete all required shipping fields.');
        return;
    }

    if (cartState.length === 0) {
        showToast('Your shopping bag is empty.');
        return;
    }

    const placeBtn = document.getElementById('place-order-btn');
    const placeText = document.getElementById('place-order-text');

    if (placeBtn) placeBtn.disabled = true;
    if (placeText) placeText.innerText = 'Processing Order...';

    // Generate Order Reference ID
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const orderId = `CLC-${randomDigits}`;
    const totalAmount = getCartSubtotal();

    const orderData = {
        order_id: orderId,
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        address: address,
        city: city,
        state: state,
        pincode: pincode,
        total_amount: totalAmount,
        status: 'pending'
    };

    const orderItemsData = cartState.map(item => {
        const isValidUuid = typeof item.id === 'string' && item.id.length === 36 && item.id.includes('-');
        return {
            product_id: isValidUuid ? item.id : null,
            product_name: item.name || 'CALCI Timepiece',
            quantity: item.quantity || 1,
            price: parsePriceToNumber(item.price)
        };
    });

    // Save to Supabase (orders & order_items)
    let saveRes = null;
    if (typeof window.saveOrderToSupabase === 'function') {
        saveRes = await window.saveOrderToSupabase(orderData, orderItemsData);
    }

    const finalOrderRef = (saveRes && saveRes.orderRef) ? saveRes.orderRef : orderId;

    // Reset button state
    if (placeBtn) placeBtn.disabled = false;
    if (placeText) placeText.innerText = 'Place Order';

    // Close checkout modal & show confirmation
    closeCheckoutModal();
    openConfirmationModal(finalOrderRef, orderData, totalAmount);

    // Clear cart & update UI
    cartState = [];
    saveCart();

    // Reset form
    document.getElementById('checkout-form')?.reset();
}

// Expose functions globally for inline onclick handlers
window.changeCartQuantity = changeCartQuantity;
window.removeFromCart = removeFromCart;
window.openTrackModal = openTrackModal;

// -------------------------------------------------------------
// 9. Customer Order Status Tracking System
// -------------------------------------------------------------

function openTrackModal(orderIdToPrefill) {
    const backdrop = document.getElementById('track-modal-backdrop');
    const card = document.getElementById('track-modal-card');
    const input = document.getElementById('track-order-input');
    const errAlert = document.getElementById('track-error-alert');
    const resBox = document.getElementById('track-results-container');

    if (!backdrop || !card) return;

    if (errAlert) errAlert.classList.add('hidden');
    if (resBox && !orderIdToPrefill) resBox.classList.add('hidden');

    if (orderIdToPrefill && input) {
        input.value = orderIdToPrefill;
        performOrderLookup(orderIdToPrefill);
    }

    backdrop.classList.remove('hidden', 'pointer-events-none');
    setTimeout(() => {
        backdrop.classList.remove('opacity-0');
        card.classList.remove('scale-95');
        card.classList.add('scale-100');
    }, 10);
}

function closeTrackModal() {
    const backdrop = document.getElementById('track-modal-backdrop');
    const card = document.getElementById('track-modal-card');
    if (!backdrop || !card) return;

    card.classList.remove('scale-100');
    card.classList.add('scale-95');
    backdrop.classList.add('opacity-0');
    setTimeout(() => {
        backdrop.classList.add('hidden', 'pointer-events-none');
    }, 300);
}

async function performOrderLookup(inputVal) {
    const errAlert = document.getElementById('track-error-alert');
    const errMsg = document.getElementById('track-error-msg');
    const resBox = document.getElementById('track-results-container');
    const btnSearch = document.getElementById('btn-search-order');

    if (errAlert) errAlert.classList.add('hidden');
    if (btnSearch) btnSearch.disabled = true;

    const queryStr = String(inputVal || '').trim();
    if (!queryStr) {
        if (errMsg) errMsg.innerText = "Please enter a valid Order Reference ID.";
        if (errAlert) errAlert.classList.remove('hidden');
        if (btnSearch) btnSearch.disabled = false;
        return;
    }

    let foundOrder = null;

    if (window.supabaseClient) {
        try {
            const { data, error } = await window.supabaseClient
                .from('orders')
                .select('*');

            if (!error && data && data.length > 0) {
                foundOrder = data.find(o => 
                    String(o.order_id || '').trim().toLowerCase() === queryStr.toLowerCase() ||
                    String(o.id || '').trim().toLowerCase() === queryStr.toLowerCase() ||
                    String(o.id || '').trim().toLowerCase().startsWith(queryStr.toLowerCase()) ||
                    queryStr.toLowerCase().replace(/[^a-z0-9]/g, '') === String(o.order_id || '').toLowerCase().replace(/[^a-z0-9]/g, '')
                );
            }
        } catch (err) {
            console.warn("Order lookup error:", err);
        }
    }

    if (btnSearch) btnSearch.disabled = false;

    if (foundOrder) {
        renderOrderTrackingDetails(foundOrder);
        if (resBox) resBox.classList.remove('hidden');
    } else {
        if (resBox) resBox.classList.add('hidden');
        if (errMsg) errMsg.innerText = `Order Reference ID "${queryStr}" was not found. Please check your ID and try again.`;
        if (errAlert) errAlert.classList.remove('hidden');
    }
}

function renderOrderTrackingDetails(order) {
    const resId = document.getElementById('track-res-id');
    const resName = document.getElementById('track-res-name');
    const resDate = document.getElementById('track-res-date');
    const resTotal = document.getElementById('track-res-total');
    const cancelledBanner = document.getElementById('track-cancelled-banner');
    const progressWrapper = document.getElementById('track-progress-wrapper');
    const progressBar = document.getElementById('track-progress-bar');

    const orderRef = order.order_id || (order.id ? String(order.id).substring(0, 8) : 'CLC-000');
    if (resId) resId.innerText = orderRef;
    if (resName) resName.innerText = order.customer_name || order.full_name || 'Client';
    if (resDate) resDate.innerText = order.created_at ? new Date(order.created_at).toLocaleDateString() : '-';
    if (resTotal) resTotal.innerText = formatPrice(order.total_amount);

    const status = (order.status || 'pending').toLowerCase();

    if (status === 'cancelled') {
        if (cancelledBanner) cancelledBanner.classList.remove('hidden');
        if (progressWrapper) progressWrapper.classList.add('hidden');
        return;
    }

    if (cancelledBanner) cancelledBanner.classList.add('hidden');
    if (progressWrapper) progressWrapper.classList.remove('hidden');

    const steps = [
        { id: 'step-pending', name: 'pending', percent: 0 },
        { id: 'step-confirmed', name: 'confirmed', percent: 33 },
        { id: 'step-shipped', name: 'shipped', percent: 66 },
        { id: 'step-delivered', name: 'delivered', percent: 100 }
    ];

    let currentStepIndex = 0;
    if (status === 'confirmed') currentStepIndex = 1;
    if (status === 'shipped') currentStepIndex = 2;
    if (status === 'delivered') currentStepIndex = 3;

    if (progressBar) {
        progressBar.style.width = `${steps[currentStepIndex].percent}%`;
    }

    steps.forEach((step, idx) => {
        const stepEl = document.getElementById(step.id);
        if (stepEl) {
            const iconBox = stepEl.querySelector('.step-icon');
            const labelBox = stepEl.querySelector('.step-label');

            if (idx <= currentStepIndex) {
                if (iconBox) {
                    iconBox.classList.remove('bg-surface-container-high', 'border-outline-variant', 'text-on-surface-variant');
                    iconBox.classList.add('bg-primary', 'border-primary', 'text-on-primary', 'shadow-[0_0_15px_rgba(233,193,118,0.4)]');
                }
                if (labelBox) {
                    labelBox.classList.remove('text-on-surface-variant');
                    labelBox.classList.add('text-primary');
                }
            } else {
                if (iconBox) {
                    iconBox.classList.add('bg-surface-container-high', 'border-outline-variant', 'text-on-surface-variant');
                    iconBox.classList.remove('bg-primary', 'border-primary', 'text-on-primary', 'shadow-[0_0_15px_rgba(233,193,118,0.4)]');
                }
                if (labelBox) {
                    labelBox.classList.add('text-on-surface-variant');
                    labelBox.classList.remove('text-primary');
                }
            }
        }
    });
}

function initTrackingListeners() {
    document.getElementById('open-track-btn')?.addEventListener('click', () => openTrackModal());
    document.getElementById('close-track-modal')?.addEventListener('click', closeTrackModal);
    document.getElementById('track-modal-card')?.addEventListener('click', (e) => e.stopPropagation());

    document.getElementById('track-order-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = document.getElementById('track-order-input')?.value;
        performOrderLookup(val);
    });

    document.getElementById('track-this-order-btn')?.addEventListener('click', () => {
        const idText = document.getElementById('confirm-order-id')?.innerText;
        closeConfirmationModal();
        openTrackModal(idText);
    });

    // Auto open if URL has /track or #track
    if (window.location.pathname.includes('/track') || window.location.hash.includes('track')) {
        openTrackModal();
    }
}

// Run Setup
preloadImages().then(() => {
    resizeCanvas();
    updateScrollProgress();
    handleNavbarScroll();
    initRevealAnimations();
    initSmoothScroll();
    initCart();
    initEcommerceListeners();
    initTrackingListeners();
    initNewsletterForm();
    initProductSearchAndFilterListeners();
    loadSupabaseProducts();
});


