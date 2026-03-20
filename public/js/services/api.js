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
            
            // Проверяем content-type
            const contentType = response.headers.get('content-type');
            
            // Специальная обработка для 401 (неавторизован)
            if(response.status === 401) {
                // Проверяем, не пытаемся ли мы залогиниться
                const isLoginRequest = endpoint === '/auth/login';
                
                if (!isLoginRequest) {
                    // Если это не запрос логина, очищаем токен и делаем редирект
                    this.setToken(null);
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                    throw { status: 401, errors: { auth: 'Требуется авторизация' } };
                } else {
                    // Для запроса логина - пытаемся получить JSON ошибку
                    let errorMessage = 'Неверный email или пароль';
                    
                    // Пытаемся получить JSON даже если статус 401
                    try {
                        if (contentType && contentType.includes('application/json')) {
                            const data = await response.json();
                            if (data.errors && data.errors.password) {
                                errorMessage = data.errors.password;
                            } else if (data.errors && data.errors.email) {
                                errorMessage = data.errors.email;
                            } else if (data.error) {
                                errorMessage = data.error;
                            }
                        } else {
                            // Если не JSON, пробуем прочитать текст
                            const text = await response.text();
                            console.log('Non-JSON response:', text);
                        }
                    } catch (e) {
                        console.error('Failed to parse error response:', e);
                    }
                    
                    throw { 
                        status: 401, 
                        errors: { password: errorMessage }
                    };
                }
            }
            
            // Обработка HTML ответов (ошибки сервера)
            if (contentType && contentType.includes('text/html')) {
                const text = await response.text();
                console.error('Received HTML instead of JSON:', text.substring(0, 200));
                throw { 
                    status: response.status, 
                    errors: { general: `Сервер вернул ошибку ${response.status}` } 
                };
            }
            
            // Парсим JSON ответ
            let data;
            try {
                data = await response.json();
            } catch (e) {
                console.error('Failed to parse JSON:', e);
                throw { 
                    status: response.status, 
                    errors: { general: 'Неверный формат ответа от сервера' } 
                };
            }
            
            console.log('Response data:', data);

            // Проверяем успешность ответа
            if(!response.ok) {
                throw {
                    status: response.status,
                    errors: data.errors || { general: data.error || 'Request failed' }
                };
            }

            return data;
        } catch(error) {
            console.error('API Error:', error);
            // Перебрасываем ошибку для обработки в компонентах
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