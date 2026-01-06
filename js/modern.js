document.addEventListener('DOMContentLoaded', function () {
    // Theme toggle functionality
    const themeToggle = document.getElementById('theme-toggle');
    const mobileThemeToggle = document.getElementById('mobile-theme-toggle');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

    // Check for saved theme preference or use OS preference
    const currentTheme = localStorage.getItem('theme') ||
        (prefersDarkScheme.matches ? 'dark' : 'light');

    // Apply the theme on initial load
    if (currentTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.querySelector('i').classList.remove('fa-moon');
        themeToggle.querySelector('i').classList.add('fa-sun');
        mobileThemeToggle.querySelector('i').classList.remove('fa-moon');
        mobileThemeToggle.querySelector('i').classList.add('fa-sun');
    }

    // Theme toggle click handler
    function toggleTheme() {
        if (document.body.getAttribute('data-theme') === 'dark') {
            // Switch to light mode
            document.body.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');

            // Update icons
            themeToggle.querySelector('i').classList.remove('fa-sun');
            themeToggle.querySelector('i').classList.add('fa-moon');
            mobileThemeToggle.querySelector('i').classList.remove('fa-sun');
            mobileThemeToggle.querySelector('i').classList.add('fa-moon');
        } else {
            // Switch to dark mode
            document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');

            // Update icons
            themeToggle.querySelector('i').classList.remove('fa-moon');
            themeToggle.querySelector('i').classList.add('fa-sun');
            mobileThemeToggle.querySelector('i').classList.remove('fa-moon');
            mobileThemeToggle.querySelector('i').classList.add('fa-sun');
        }
    }

    // Add event listeners for theme toggles
    themeToggle.addEventListener('click', toggleTheme);
    mobileThemeToggle.addEventListener('click', toggleTheme);

    // Mobile menu functionality
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuClose = document.getElementById('mobile-menu-close');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');

    menuToggle.addEventListener('click', function () {
        mobileMenu.classList.add('active');
        mobileMenuOverlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling when menu is open
    });

    function closeMenu() {
        mobileMenu.classList.remove('active');
        mobileMenuOverlay.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }

    mobileMenuClose.addEventListener('click', closeMenu);
    mobileMenuOverlay.addEventListener('click', closeMenu);

    // Close mobile menu when clicking on a link
    const mobileMenuLinks = mobileMenu.querySelectorAll('a');
    mobileMenuLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // Add smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            if (this.getAttribute('href') !== '#') {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const targetElement = document.querySelector(targetId);

                if (targetElement) {
                    // Scroll to the element
                    targetElement.scrollIntoView({
                        behavior: 'smooth'
                    });

                    // Update URL without page jump
                    history.pushState(null, null, targetId);
                }
            }
        });
    });

    // Add active class to navbar links based on scroll position
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.navbar-links a, .mobile-menu a');

    function highlightNavLink() {
        const scrollPosition = window.scrollY + 100; // Offset for fixed header

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    // Add active class to navbar on scroll
    window.addEventListener('scroll', function () {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        highlightNavLink();
    });

    // Initialize email obfuscation
    const emailElement = document.querySelector('.email');
    if (emailElement) {
        try {
            // This evaluates the reversed email string
            const emailCode = emailElement.textContent.trim();
            const emailAddress = eval(emailCode);
            emailElement.textContent = emailAddress;
            emailElement.setAttribute('title', 'Click to copy email');

            // Add click to copy functionality
            emailElement.addEventListener('click', function () {
                navigator.clipboard.writeText(emailAddress).then(() => {
                    const originalText = this.textContent;
                    this.textContent = 'Email copied!';
                    setTimeout(() => {
                        this.textContent = originalText;
                    }, 2000);
                });
            });
        } catch (e) {
            console.error('Error processing email:', e);
        }
    }

    // Add lazy loading for images
    const images = document.querySelectorAll('img');
    if ('loading' in HTMLImageElement.prototype) {
        // Browser supports native lazy loading
        images.forEach(img => {
            if (!img.hasAttribute('loading')) {
                img.setAttribute('loading', 'lazy');
            }
        });
    } else {
        // Fallback for browsers that don't support lazy loading
        // You could add a lazy loading library here if needed
    }

    // Styles are now handled in modern_style.css to ensure consistency
    // and prevent conflicts with the new design system.
});
