document.addEventListener('DOMContentLoaded', function () {
    const themeToggle = document.getElementById('theme-toggle');
    const mobileThemeToggle = document.getElementById('mobile-theme-toggle');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const navbar = document.querySelector('.navbar');

    const currentTheme = localStorage.getItem('theme') ||
        (prefersDarkScheme.matches ? 'dark' : 'light');

    function applyTheme(theme) {
        const isDark = theme === 'dark';

        if (isDark) {
            document.body.setAttribute('data-theme', 'dark');
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.body.removeAttribute('data-theme');
            document.documentElement.removeAttribute('data-theme');
        }

        const desktopIcon = themeToggle?.querySelector('i');
        const mobileIcon = mobileThemeToggle?.querySelector('i');

        if (desktopIcon) {
            desktopIcon.classList.toggle('fa-moon', !isDark);
            desktopIcon.classList.toggle('fa-sun', isDark);
        }

        if (mobileIcon) {
            mobileIcon.classList.toggle('fa-moon', !isDark);
            mobileIcon.classList.toggle('fa-sun', isDark);
        }
    }

    applyTheme(currentTheme);

    function toggleTheme() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
            document.body.getAttribute('data-theme') === 'dark';

        if (isDark) {
            applyTheme('light');
            localStorage.setItem('theme', 'light');
        } else {
            applyTheme('dark');
            localStorage.setItem('theme', 'dark');
        }
    }

    themeToggle?.addEventListener('click', toggleTheme);
    mobileThemeToggle?.addEventListener('click', toggleTheme);

    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuClose = document.getElementById('mobile-menu-close');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');

    menuToggle?.addEventListener('click', function () {
        mobileMenu?.classList.add('active');
        mobileMenuOverlay?.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    function closeMenu() {
        mobileMenu?.classList.remove('active');
        mobileMenuOverlay?.classList.remove('active');
        document.body.style.overflow = '';
    }

    mobileMenuClose?.addEventListener('click', closeMenu);
    mobileMenuOverlay?.addEventListener('click', closeMenu);

    const mobileMenuLinks = mobileMenu?.querySelectorAll('a') || [];
    mobileMenuLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            if (this.getAttribute('href') !== '#') {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const targetElement = document.querySelector(targetId);

                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth'
                    });

                    history.pushState(null, null, targetId);
                }
            }
        });
    });

    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.navbar-links a, .mobile-menu a');

    function highlightNavLink() {
        const scrollPosition = window.scrollY + 100; // Offset for fixed header

        let activeId = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                activeId = sectionId;
            }
        });

        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            const isHomeLink = href === '#' && window.scrollY < 120;
            link.classList.toggle('active', href === `#${activeId}` || isHomeLink);
        });
    }

    function handleScroll() {
        if (window.scrollY > 50) {
            navbar?.classList.add('scrolled');
        } else {
            navbar?.classList.remove('scrolled');
        }

        highlightNavLink();
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    const emailElement = document.querySelector('.email');
    if (emailElement) {
        try {
            const reversed = emailElement.dataset.emailReversed || '';
            const emailAddress = reversed.split('').reverse().join('');
            emailElement.textContent = emailAddress;
            emailElement.setAttribute('title', 'Click to copy email');
            emailElement.setAttribute('role', 'button');
            emailElement.setAttribute('tabindex', '0');

            function showCopiedState() {
                const originalText = emailAddress;
                emailElement.textContent = 'Email copied!';
                window.setTimeout(() => {
                    emailElement.textContent = originalText;
                }, 1800);
            }

            async function copyEmail() {
                if (!navigator.clipboard?.writeText) {
                    return;
                }
                await navigator.clipboard.writeText(emailAddress);
                showCopiedState();
            }

            emailElement.addEventListener('click', function () {
                copyEmail().catch(() => { });
            });
            emailElement.addEventListener('keydown', function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    copyEmail().catch(() => { });
                }
            });
        } catch (e) {
            console.error('Error processing email:', e);
        }
    }

    const images = document.querySelectorAll('img');
    if ('loading' in HTMLImageElement.prototype) {
        images.forEach(img => {
            if (!img.hasAttribute('loading')) {
                img.setAttribute('loading', 'lazy');
            }
        });
    }

    document.querySelectorAll('a[target="_blank"]').forEach(anchor => {
        try {
            const url = new URL(anchor.href, window.location.href);
            if (url.origin !== window.location.origin) {
                anchor.rel = 'noopener noreferrer';
            }
        } catch (e) {
            anchor.rel = 'noopener noreferrer';
        }
    });
});
