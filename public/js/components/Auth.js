const Auth = {
    data: {
        isLogin: true,
        form: {
            email: '',
            name: '',
            password: ''
        },
        errors: {}
    },

    init() {
        console.log('Auth.init()');
        // Определяем режим по URL
        this.data.isLogin = window.location.pathname !== '/register';
        this.data.form = { email: '', name: '', password: '' };
        this.data.errors = {};
        this.render();
    },

    handleInput(field, value) {
        this.data.form[field] = value;
        
        // Очищаем ошибку при вводе
        if (this.data.errors[field]) {
            delete this.data.errors[field];
            // Визуально убираем класс ошибки
            const input = document.getElementById(field);
            if (input) {
                input.classList.remove('error');
            }
        }
        
        // Очищаем общую ошибку при любом вводе
        if (this.data.errors.general) {
            delete this.data.errors.general;
            const generalError = document.querySelector('.general-error');
            if (generalError) {
                generalError.remove();
            }
        }
    },

    toggleMode(e) {
        if (e) e.preventDefault();
        console.log('toggleMode');
        
        this.data.isLogin = !this.data.isLogin;
        this.data.form = { email: '', name: '', password: '' };
        this.data.errors = {};
        
        // Обновляем URL без перезагрузки
        const newPath = this.data.isLogin ? '/login' : '/register';
        window.history.pushState({}, '', newPath);
        
        this.render();
    },

    validate() {
        const errors = {};
        
        // Валидация email
        if (!this.data.form.email) {
            errors.email = 'Email обязателен';
        } else if (!this.data.form.email.includes('@') || !this.data.form.email.includes('.')) {
            errors.email = 'Введите корректный email (пример: user@mail.com)';
        }

        // Валидация имени (только для регистрации)
        if (!this.data.isLogin) {
            if (!this.data.form.name) {
                errors.name = 'Имя обязательно';
            } else if (!/^[a-zA-Z]+$/.test(this.data.form.name)) {
                errors.name = 'Имя должно содержать только латиницу';
            } else if (this.data.form.name.length < 2) {
                errors.name = 'Имя должно быть не короче 2 символов';
            }
        }

        // Валидация пароля
        if (!this.data.form.password) {
            errors.password = 'Пароль обязателен';
        } else if (this.data.form.password.length < 4) { // Для тестирования уменьшил до 4
            errors.password = 'Пароль должен быть минимум 4 символа';
        }

        return errors;
    },

    async submit(e) {
        // Предотвращаем отправку формы и перезагрузку страницы
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        console.log('Auth.submit()', this.data.form);
        
        // Валидация
        const errors = this.validate();
        
        if (Object.keys(errors).length > 0) {
            console.log('Validation errors:', errors);
            this.data.errors = errors;
            this.render(); // Перерисовываем для показа ошибок
            return;
        }
        
        // Показываем индикатор загрузки
        const submitBtn = document.querySelector('.btn-primary');
        if (submitBtn) {
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Загрузка...';
            submitBtn.disabled = true;
        }
        
        try {
            if (this.data.isLogin) {
                console.log('Attempting login...');
                const response = await API.auth.login({
                    email: this.data.form.email,
                    password: this.data.form.password
                });
                
                console.log('Login response:', response);
                
                if (response && response.token) {
                    API.setToken(response.token);
                    localStorage.setItem('user', JSON.stringify(response.user));
                    // Успешный вход - переходим на доски
                    Router.navigate('/boards');
                } else {
                    throw { errors: { general: 'Неверный ответ от сервера' } };
                }
            } else {
                console.log('Attempting registration...');
                const response = await API.auth.register({
                    email: this.data.form.email,
                    name: this.data.form.name,
                    password: this.data.form.password
                });
                
                console.log('Registration response:', response);
                
                // Успешная регистрация
                this.data.isLogin = true;
                this.data.form = { email: this.data.form.email, name: '', password: '' };
                this.data.errors = { success: '✅ Регистрация успешна! Теперь войдите.' };
                
                // Обновляем URL
                window.history.pushState({}, '', '/login');
                this.render();
            }
        } catch(error) {
            console.error('Auth error:', error);
            
            // Возвращаем кнопку в исходное состояние
            if (submitBtn) {
                submitBtn.textContent = this.data.isLogin ? 'Войти' : 'Зарегистрироваться';
                submitBtn.disabled = false;
            }
            
            // Обработка ошибок от сервера
            if (error.errors) {
                this.data.errors = error.errors;
            } else if (error.message) {
                this.data.errors = { general: error.message };
            } else {
                this.data.errors = { general: 'Произошла ошибка при подключении к серверу' };
            }
            
            this.render();
        }
    },

    render() {
        console.log('Auth.render()', this.data);
        
        const html = `
            <div class="auth-container">
                <h2>${this.data.isLogin ? 'Вход' : 'Регистрация'}</h2>
                
                ${this.data.errors.general ? 
                    `<div class="error-message general-error">❌ ${this.data.errors.general}</div>` : ''}
                ${this.data.errors.success ? 
                    `<div class="success-message">${this.data.errors.success}</div>` : ''}
                
                <form onsubmit="Auth.submit(event); return false;">
                    <div class="form-group">
                        <label>Электронная почта</label>
                        <input 
                            type="email" 
                            id="email" 
                            name="email"
                            class="form-control ${this.data.errors.email ? 'error' : ''}" 
                            value="${this.data.form.email || ''}" 
                            oninput="Auth.handleInput('email', this.value)"
                            placeholder="example@mail.com"
                            required
                        >
                        ${this.data.errors.email ? 
                            `<div class="error-message field-error">⚠️ ${this.data.errors.email}</div>` : ''}
                    </div>
                    
                    ${!this.data.isLogin ? `
                        <div class="form-group">
                            <label>Имя (только латиница)</label>
                            <input 
                                type="text" 
                                id="name" 
                                name="name"
                                class="form-control ${this.data.errors.name ? 'error' : ''}" 
                                value="${this.data.form.name || ''}" 
                                oninput="Auth.handleInput('name', this.value)"
                                placeholder="John"
                                required
                            >
                            ${this.data.errors.name ? 
                                `<div class="error-message field-error">⚠️ ${this.data.errors.name}</div>` : ''}
                        </div>
                    ` : ''}
                    
                    <div class="form-group">
                        <label>Пароль</label>
                        <input 
                            type="password" 
                            id="password" 
                            name="password"
                            class="form-control ${this.data.errors.password ? 'error' : ''}" 
                            value="${this.data.form.password || ''}" 
                            oninput="Auth.handleInput('password', this.value)"
                            placeholder="********"
                            required
                        >
                        ${this.data.errors.password ? 
                            `<div class="error-message field-error">⚠️ ${this.data.errors.password}</div>` : ''}
                    </div>
                    
                    <button type="submit" class="btn btn-primary">
                        ${this.data.isLogin ? 'Войти' : 'Зарегистрироваться'}
                    </button>
                </form>
                
                <div class="auth-link">
                    <a href="#" onclick="Auth.toggleMode(event); return false;">
                        ${this.data.isLogin ? 
                            '❓ Нужна учетная запись? Зарегистрироваться' : 
                            '✅ Уже есть учетная запись? Войти'}
                    </a>
                </div>
            </div>
        `;
        
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = html;
        } else {
            console.error('Element #app not found');
        }
    }
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, path:', window.location.pathname);
    if (window.location.pathname === '/login' || window.location.pathname === '/register') {
        Auth.init();
    }
});

// Для навигации через Router
window.Auth = Auth;