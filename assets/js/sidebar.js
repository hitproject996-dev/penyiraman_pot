// Sidebar Toggle Functions
function setHamburgerState(isOpen) {
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    if (!mobileBtn) return;

    mobileBtn.classList.toggle('is-open', isOpen);
    mobileBtn.setAttribute('aria-expanded', String(isOpen));
    mobileBtn.setAttribute('aria-label', isOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi');

    const icon = mobileBtn.querySelector('i');
    if (!icon) return;

    if (isOpen) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-xmark');
    } else {
        icon.classList.remove('fa-xmark');
        icon.classList.add('fa-bars');
    }
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) overlay.classList.remove('active');

    document.body.classList.remove('sidebar-open');
    setHamburgerState(false);
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar || !overlay) return;

    const willOpen = !sidebar.classList.contains('mobile-open');
    sidebar.classList.toggle('mobile-open', willOpen);
    overlay.classList.toggle('active', willOpen);
    document.body.classList.toggle('sidebar-open', willOpen);
    setHamburgerState(willOpen);
}

function toggleSidebarCollapse() {
    if (window.innerWidth <= 768) return;

    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    sidebar.classList.toggle('collapsed');
    const icon = document.querySelector('.sidebar-toggle i');
    if (!icon) return;

    if (sidebar.classList.contains('collapsed')) {
        icon.classList.remove('fa-chevron-left');
        icon.classList.add('fa-chevron-right');
    } else {
        icon.classList.remove('fa-chevron-right');
        icon.classList.add('fa-chevron-left');
    }
}

// Update current time
function updateTime() {
    const timeElement = document.getElementById('currentTime');
    if (!timeElement) return;
    
    const now = new Date();
    let options;

    if (window.innerWidth <= 768) {
        options = {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        };
    } else {
        options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        };
    }

    timeElement.textContent = now.toLocaleString('id-ID', options);
}

function handleResize() {
    if (window.innerWidth > 768) {
        closeMobileSidebar();
    }

    updateTime();
}

// Initialize sidebar functionality
function initializeSidebar() {
    updateTime();
    setInterval(updateTime, 60000);
    handleResize();

    setHamburgerState(false);

    document.querySelectorAll('.sidebar .menu-item').forEach((menuItem) => {
        menuItem.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeMobileSidebar();
            }
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeMobileSidebar();
        }
    });

    window.addEventListener('resize', handleResize);
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSidebar);
} else {
    initializeSidebar();
}
