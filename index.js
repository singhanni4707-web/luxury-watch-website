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

// Run Setup
preloadImages().then(() => {
    resizeCanvas();
    updateScrollProgress();
    handleNavbarScroll();
    initRevealAnimations();
    initSmoothScroll();
});
