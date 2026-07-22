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

        renderProducts(products, container);
    } catch (error) {
        console.error('Failed to load products from Supabase:', error);
        renderProducts(DEFAULT_PRODUCTS, container);
    }
}

function renderProducts(items, container) {
    container.innerHTML = '';
    items.forEach((item, index) => {
        const delay = index * 200;
        const seriesName = item.series || item.brand || item.category || 'Signature Series';
        const subtitleText = item.subtitle || item.description || (item.stock !== undefined ? `Stock: ${item.stock} available` : 'Swiss Precision Movement');
        const priceText = typeof item.price === 'number' ? `$${item.price.toLocaleString()}` : (item.price || '$12,400');
        const imgUrl = getProductImageUrl(item) || (DEFAULT_PRODUCTS[index % DEFAULT_PRODUCTS.length] ? DEFAULT_PRODUCTS[index % DEFAULT_PRODUCTS.length].image_url : '');

        const card = document.createElement('div');
        card.className = 'reveal group active';
        card.style.transitionDelay = `${delay}ms`;

        card.innerHTML = `
            <div class="relative aspect-[3/4] bg-surface-container-high rounded-xl overflow-hidden mb-6 flex items-center justify-center p-12 transition-all duration-500 group-hover:shadow-[0_0_50px_-12px_rgba(233,193,118,0.3)]">
                <img class="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700" alt="${item.name || 'Calci Luxury Watch'}" src="${imgUrl}">
            </div>
            <p class="text-primary text-xs font-label-caps uppercase mb-2">${seriesName}</p>
            <h3 class="font-headline-md text-white mb-2">${item.name || 'Calci Timepiece'}</h3>
            <p class="text-on-surface-variant text-sm font-body-md mb-4">${subtitleText}</p>
            <p class="text-white font-bold text-lg">${priceText}</p>
        `;
        container.appendChild(card);
    });

    if (typeof initRevealAnimations === 'function') {
        initRevealAnimations();
    }
}

// Run Setup
preloadImages().then(() => {
    resizeCanvas();
    updateScrollProgress();
    handleNavbarScroll();
    initRevealAnimations();
    initSmoothScroll();
    loadSupabaseProducts();
});

