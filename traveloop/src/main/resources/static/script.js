// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'fadeInUp 0.6s ease-out';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe all cards
document.querySelectorAll('.feature-card, .testimonial-card').forEach(card => {
    observer.observe(card);
});

// Search functionality
const searchInput = document.querySelector('.search-input');
if (searchInput) {
    searchInput.addEventListener('focus', function() {
        this.parentElement.style.backgroundColor = '#f0f0f0';
    });

    searchInput.addEventListener('blur', function() {
        this.parentElement.style.backgroundColor = '#ECF0F1';
    });

    searchInput.addEventListener('input', function(e) {
        console.log('Searching for:', e.target.value);
        // Add search logic here
    });
}

// Button interactions
const buttons = document.querySelectorAll('button');
buttons.forEach(button => {
    button.addEventListener('click', function(e) {
        // Add ripple effect
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');

        // Note: Add ripple CSS if needed
    });
});

// Navbar scroll effect
let lastScrollTop = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', function() {
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    if (scrollTop > 50) {
        navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.15)';
    } else {
        navbar.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
    }

    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; // For Mobile or negative scrolling
});

// Count animation for statistics
function animateCount(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    
    const counter = setInterval(() => {
        start += increment;
        if (start >= target) {
            element.textContent = target;
            clearInterval(counter);
        } else {
            element.textContent = Math.floor(start);
        }
    }, 16);
}

// Add event listeners for CTA buttons
const ctaButtons = document.querySelectorAll('.btn-primary, .btn-primary-large');
ctaButtons.forEach(button => {
    button.addEventListener('click', function() {
        console.log('CTA clicked!');
        // Redirect to sign up or app
        // window.location.href = '/signup';
    });
});

// Mobile menu toggle (for future mobile menu implementation)
function setupMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    // Add mobile menu toggle logic here
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupMobileMenu();
    console.log('Traveloop landing page loaded!');
});

// Keyboard navigation
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        // Close any open modals/menus
    }
    if (event.key === 'Enter' && event.target === searchInput) {
        console.log('Search submitted for:', searchInput.value);
    }
});