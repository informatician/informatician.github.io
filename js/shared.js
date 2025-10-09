/**
 * Shared JavaScript for Website
 * This file contains all common functionality used across pages
 */

// ============================================
// NAVIGATION FUNCTIONALITY
// ============================================

/**
 * Toggle mobile navigation menu
 */
function toggleNav() {
    const nav = document.getElementById('mainNav');
    nav.classList.toggle('active');
}

/**
 * Set active navigation item based on current page
 */
function setActiveNavItem() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.main-nav a');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
}

/**
 * Handle navigation clicks and mobile menu closing
 */
function initNavigation() {
    const navLinks = document.querySelectorAll('.main-nav a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Update active state
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Close mobile menu after clicking
            if (window.innerWidth <= 768) {
                document.getElementById('mainNav').classList.remove('active');
            }
        });
    });
}

// ============================================
// ACCORDION FUNCTIONALITY
// ============================================

/**
 * Toggle accordion items
 * @param {HTMLElement} header - The accordion header that was clicked
 */
function toggleAccordion(header) {
    const content = header.nextElementSibling;
    const isActive = header.classList.contains('active');
    
    // Get the accordion container
    const accordion = header.closest('.accordion');
    const allHeaders = accordion.querySelectorAll('.accordion-header');
    const allContents = accordion.querySelectorAll('.accordion-content');
    
    // Close all accordions in the same container
    allHeaders.forEach(h => h.classList.remove('active'));
    allContents.forEach(c => c.classList.remove('active'));
    
    // Open clicked accordion if it wasn't active
    if (!isActive) {
        header.classList.add('active');
        content.classList.add('active');
    }
}

/**
 * Initialize all accordions on the page
 */
function initAccordions() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    
    accordionHeaders.forEach(header => {
        // Remove inline onclick and add event listener
        header.removeAttribute('onclick');
        header.addEventListener('click', function() {
            toggleAccordion(this);
        });
    });
}

// ============================================
// SMOOTH SCROLLING
// ============================================

/**
 * Initialize smooth scrolling for anchor links
 */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            
            if (targetId === '#') return;
            
            const target = document.querySelector(targetId);
            if (target) {
                const headerOffset = 80; // Account for sticky navigation
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ============================================
// LAZY LOADING IMAGES
// ============================================

/**
 * Initialize lazy loading for images
 */
function initLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    } else {
        // Fallback for browsers that don't support IntersectionObserver
        images.forEach(img => {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
        });
    }
}

// ============================================
// CARD ANIMATIONS
// ============================================

/**
 * Initialize card animations on scroll
 */
function initCardAnimations() {
    const cards = document.querySelectorAll('.card');
    
    if ('IntersectionObserver' in window) {
        const cardObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }, index * 100);
                }
            });
        }, {
            threshold: 0.1
        });

        cards.forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            cardObserver.observe(card);
        });
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Debounce function to limit how often a function can fire
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Check if element is in viewport
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} True if element is in viewport
 */
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * Add loading state to buttons
 * @param {HTMLElement} button - Button element
 * @param {boolean} isLoading - Loading state
 */
function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.innerHTML = '<span class="spinner"></span> Loading...';
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText;
    }
}

// ============================================
// NAVIGATION SCROLL EFFECTS
// ============================================

/**
 * Initialize navigation scroll effects
 */
function initNavScrollEffects() {
    let lastScrollTop = 0;
    const navContainer = document.querySelector('.nav-container');
    
    window.addEventListener('scroll', debounce(function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Add shadow when scrolled
        if (scrollTop > 10) {
            navContainer.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        } else {
            navContainer.style.boxShadow = 'none';
        }
        
        // Hide/show nav on scroll (optional - comment out if not wanted)
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            // Scrolling down
            navContainer.style.transform = 'translateY(-100%)';
        } else {
            // Scrolling up
            navContainer.style.transform = 'translateY(0)';
        }
        
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }, 100));
}

// ============================================
// PAGE INITIALIZATION
// ============================================

/**
 * Initialize all page components
 */
function initPage() {
    setActiveNavItem();
    initNavigation();
    initAccordions();
    initSmoothScroll();
    initLazyLoading();
    initCardAnimations();
    initNavScrollEffects();
}

// ============================================
// INITIALIZE WHEN DOM IS READY
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
} else {
    initPage();
}

// ============================================
// EXPORTED FOR USE IN OTHER SCRIPTS
// ============================================

// Make functions available globally if needed
window.websiteUtils = {
    toggleNav,
    toggleAccordion,
    setButtonLoading,
    isInViewport,
    debounce
};
