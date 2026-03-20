// В самом начале, после объявлений
window.Canvas = Canvas;
console.log('Canvas добавлен в window:', window.Canvas);

document.addEventListener('DOMContentLoaded', () => {
    console.log('App initialized');
    
    const originalRequest = API.request;
    API.request = function(endpoint, options = {}) {
        options.headers = {
            ...options.headers,
            'ClientId': 'your_login_here'
        };
        return originalRequest.call(this, endpoint, options);
    };

    Router.init();
});

window.Router = Router;
window.Auth = Auth;
window.BoardList = BoardList;
window.Board = Board;
window.Canvas = Canvas;
window.API = API;
window.WebSocketService = WebSocketService;