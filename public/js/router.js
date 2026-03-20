const Router = {
    routes: {
        '/login': Auth,
        '/register': Auth,
        '/boards': BoardList,
        '/public': (params) => BoardList.init(true),
        '/board/:hash': (params) => Board.init(params.hash)
    },

    currentPath: window.location.pathname,

    init() {
        console.log('Router initialized, path:', window.location.pathname);
        
        window.addEventListener('popstate', () => {
            this.handleRoute(window.location.pathname);
        });

        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if(link && link.getAttribute('href') && link.getAttribute('href').startsWith('/')) {
                e.preventDefault();
                this.navigate(link.getAttribute('href'));
            }
        });

        this.handleRoute(this.currentPath);
    },

    navigate(path) {
        console.log('Navigating to:', path);
        window.history.pushState({}, '', path);
        this.handleRoute(path);
    },

    handleRoute(path) {
        console.log('Handling route:', path);
        
        const token = localStorage.getItem('token');
        
        if(path === '/login' || path === '/register') {
            if(token) {
                this.navigate('/boards');
                return;
            }
            Auth.init();
            return;
        }
        
        if(!token && path !== '/') {
            this.navigate('/login');
            return;
        }

        if(path === '/' || path === '') {
            this.navigate('/boards');
            return;
        }

        // Ищем маршрут
        for(let route in this.routes) {
            if(route.includes(':')) {
                const routeParts = route.split('/');
                const pathParts = path.split('/');
                
                if(routeParts.length === pathParts.length) {
                    const params = {};
                    let match = true;
                    
                    for(let i = 0; i < routeParts.length; i++) {
                        if(routeParts[i].startsWith(':')) {
                            params[routeParts[i].substring(1)] = pathParts[i];
                        } else if(routeParts[i] !== pathParts[i]) {
                            match = false;
                            break;
                        }
                    }
                    
                    if(match) {
                        console.log('Route matched with params:', params);
                        if(typeof this.routes[route] === 'function') {
                            this.routes[route](params);
                        } else {
                            this.routes[route].init(params);
                        }
                        return;
                    }
                }
            } else if(route === path) {
                console.log('Route matched:', route);
                if(typeof this.routes[route] === 'function') {
                    this.routes[route]();
                } else {
                    this.routes[route].init();
                }
                return;
            }
        }
        
        console.log('No route matched, redirecting to boards');
        this.navigate('/boards');
    }
};