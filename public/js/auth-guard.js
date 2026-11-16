/**
 * BNR Auth Guard
 * Protects pages from unauthorized access and auto-redirects.
 */
(function() {
    const isAuth = window.bnrApi && window.bnrApi.isAuthenticated();
    const currentPath = window.location.pathname.toLowerCase();
    const isLoginPage = currentPath.includes('login');
    const isRoot = currentPath === '/' || currentPath.endsWith('index.html');

    if (!isAuth && !isLoginPage && !isRoot) {
        // Redirect to login
        window.location.href = '/pages/login.html';
    } else if (isAuth && isLoginPage) {
        // If already logged in and visiting login page, go to dashboard
        window.location.href = '/pages/dashboard.html';
    }
})();
