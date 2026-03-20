const API = {
    baseUrl: '/api',
    token: localStorage.getItem('token'),

    setToken(token) {
        this.token = token;
        if(token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    },

    async request(endpoint, options = {}) {
        const url = this.baseUrl + endpoint;
        const headers = {
            'Content-Type': 'application/json',
            'ClientId': 'your_login_here' 
        };

        if(this.token) {
            headers['Authorization'] = 'Bearer ' + this.token;
        }

        const config = {
            ...options,
            headers: {
                ...headers,
                ...options.headers
            }
        };

        console.log(`API Request: ${options.method || 'GET'} ${endpoint}`, config);

        try {
            const response = await fetch(url, config);
            
            console.log('Response status:', response.status);
            
            // Проверяем, не HTML ли это
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                const text = await response.text();
                console.error('Received HTML instead of JSON:', text.substring(0, 200));
                throw { status: response.status, errors: { general: 'Server returned HTML' } };
            }
            
            if(response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
                throw { status: 401, errors: { auth: 'Требуется авторизация' } };
            }
            
            const data = await response.json();
            console.log('Response data:', data);

            if(!response.ok) {
                throw {
                    status: response.status,
                    errors: data.errors || { general: data.error || 'Request failed' }
                };
            }

            return data;
        } catch(error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Auth endpoints
    auth: {
        register: (data) => API.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data)
        }),

        login: (data) => API.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    // Board endpoints
    boards: {
        create: (data) => {
            console.log('Creating board with data:', data);
            return API.request('/boards', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },

        getUserBoards: () => {
            console.log('Getting user boards');
            return API.request('/boards/user');
        },

        getPublicBoards: () => {
            console.log('Getting public boards');
            return API.request('/boards/public');
        },

        getBoard: (hash) => {
            console.log('Getting board by hash:', hash);
            return API.request(`/boards/${hash}`);
        },

        grantAccess: (boardId, email) => {
            console.log('Granting access to board:', boardId, 'for email:', email);
            return API.request(`/boards/${boardId}/access`, {
                method: 'POST',
                body: JSON.stringify({ email })
            });
        },

        toggleLike: (boardId) => {
            console.log('Toggling like for board:', boardId);
            return API.request(`/boards/${boardId}/like`, {
                method: 'POST'
            });
        },

        // Методы для работы с объектами на доске
        createBoardObject: (boardId, data) => {
            console.log('Creating object for board:', boardId, data);
            return API.request(`/boards/${boardId}/objects`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },

        getBoardObjects: (boardId) => {
            console.log('Getting objects for board:', boardId);
            return API.request(`/boards/${boardId}/objects`);
        },

        updateBoardObject: (boardId, objectId, data) => {
            console.log('Updating object:', objectId, 'for board:', boardId);
            return API.request(`/boards/${boardId}/objects/${objectId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        },

        deleteBoardObject: (boardId, objectId) => {
            console.log('Deleting object:', objectId, 'from board:', boardId);
            return API.request(`/boards/${boardId}/objects/${objectId}`, {
                method: 'DELETE'
            });
        },

        bulkUpdateBoardObjects: (boardId, objects) => {
            console.log('Bulk update objects for board:', boardId);
            return API.request(`/boards/${boardId}/objects/bulk`, {
                method: 'POST',
                body: JSON.stringify({ objects })
            });
        }
    }
};

window.API = API;
console.log('✅ API.js загружен');