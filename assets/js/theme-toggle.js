// ==========================================
// THEME TOGGLE FUNCTIONALITY
// Light Mode / Dark Mode with localStorage
// ==========================================

// Get saved theme from localStorage or default to 'light-mode'
function getSavedTheme() {
    const savedTheme = localStorage.getItem('smartpot-theme');
    return savedTheme || 'light-mode';
}

// Apply theme to body
function applyTheme(theme) {
    document.body.className = theme;
    
    // Update icon
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        if (theme === 'dark-mode') {
            themeIcon.className = 'fas fa-moon';
        } else {
            themeIcon.className = 'fas fa-sun';
        }
    }
    
    // Save to localStorage
    localStorage.setItem('smartpot-theme', theme);
    
    // Log for debugging
    console.log('Theme applied:', theme);
}

// Toggle between light and dark mode
function toggleTheme() {
    const currentTheme = document.body.className || 'light-mode';
    const newTheme = currentTheme === 'light-mode' ? 'dark-mode' : 'light-mode';
    
    // Add animation class to icon
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.classList.add('theme-toggle-animate');
        setTimeout(() => {
            themeToggleBtn.classList.remove('theme-toggle-animate');
        }, 600);
    }
    
    // Apply new theme
    applyTheme(newTheme);
}

// Initialize theme on page load
function initTheme() {
    const savedTheme = getSavedTheme();
    applyTheme(savedTheme);
    console.log('Theme initialized:', savedTheme);
}

// Run on DOM content loaded
document.addEventListener('DOMContentLoaded', initTheme);

// Export functions for use in HTML
window.toggleTheme = toggleTheme;
window.initTheme = initTheme;
