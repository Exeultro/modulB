const Auth = {
    data: {
        isLogin: true,
        form: {
            email: '',
            name: '',
            password: ''
        },
        errors: {},
        isLoading: false
    },

    init() {
        console.log('Auth.init()');
        this.data.isLogin = window.location.pathname !== '/register';
        this.data.form = { email: '', name: '', password: '' };
        this.data.errors = {};
        this.data.isLoading = false;
        this.render();
    },

    handleInput(field, value) {
        // Обновляем данные
        this.data.form[field] = value;
        
        // Очищаем ошибку для этого поля
        if (this.data.errors[field]) {
            delete this.data.errors[field];
            this.updateFieldError(field, null);
        }
        
        // Очищаем общую ошибку
        if (this.data.errors.general) {
            delete this.data.errors.general;
            const generalError = document.querySelector('.general-error');
            if (generalError) generalError.remove();
        }
        
        // Обновляем визуальное состояние поля
        const input = document.getElementById(field);
        if (input) {
            if (this.data.errors[field]) {
                input.classList.add('error');
            } else {
                input.classList.remove('error');
            }
        }
    },

    updateFieldError(field, errorMessage) {
        const errorContainer = document.getElementById(`${field}-error`);
        if (errorContainer) {
            if (errorMessage) {
                errorContainer.textContent = `⚠️ ${errorMessage}`;
                errorContainer.style.display = 'block';
            } else {
                errorContainer.style.display = 'none';
                errorContainer.textContent = '';
            }
        }
        
        const input = document.getElementById(field);
        if (input) {
            if (errorMessage) {
                input.classList.add('error');
            } else {
                input.classList.remove('error');
            }
        }
    },

    updateGeneralError(message) {
        let generalError = document.querySelector('.general-error');
        if (!generalError) {
            const form = document.querySelector('form');
            if (form) {
                generalError = document.createElement('div');
                generalError.className = 'error-message general-error';
                form.insertBefore(generalError, form.firstChild);
            }
        }
        
        if (generalError) {
            if (message) {
                generalError.textContent = `❌ ${message}`;
                generalError.style.display = 'block';
            } else {
                generalError.style.display = 'none';
            }
        }
    },

    updateSuccessMessage(message) {
        let successMsg = document.querySelector('.success-message');
        if (!successMsg) {
            const form = document.querySelector('form');
            if (form) {
                successMsg = document.createElement('div');
                successMsg.className = 'success-message';
                form.insertBefore(successMsg, form.firstChild);
            }
        }
        
        if (successMsg) {
            if (message) {
                successMsg.textContent = message;
                successMsg.style.display = 'block';
            } else {
                successMsg.style.display = 'none';
            }
        }
    },

    toggleMode(e) {
        if (e) e.preventDefault();
        console.log('toggleMode');
        
        this.data.isLogin = !this.data.isLogin;
        this.data.form = { email: '', name: '', password: '' };
        this.data.errors = {};
        this.data.isLoading = false;
        
        const newPath = this.data.isLogin ? '/login' : '/register';
        window.history.pushState({}, '', newPath);
        
        this.render();
    },

    validate() {
        const errors = {};
        
        if (!this.data.form.email) {
            errors.email = 'Email обязателен';
        } else if (!this.data.form.email.includes('@') || !this.data.form.email.includes('.')) {
            errors.email = 'Введите корректный email (пример: user@mail.com)';
        }

        if (!this.data.isLogin) {
            if (!this.data.form.name) {
                errors.name = 'Имя обязательно';
            } else if (!/^[a-zA-Z]+$/.test(this.data.form.name)) {
                errors.name = 'Имя должно содержать только латиницу';
            } else if (this.data.form.name.length < 2) {
                errors.name = 'Имя должно быть не короче 2 символов';
            }
        }

        if (!this.data.form.password) {
            errors.password = 'Пароль обязателен';
        } else if (this.data.form.password.length < 4) {
            errors.password = 'Пароль должен быть минимум 4 символа';
        }

        return errors;
    },

    async submit(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        console.log('Auth.submit()', this.data.form);
        
        const errors = this.validate();
        
        if (Object.keys(errors).length > 0) {
            console.log('Validation errors:', errors);
            this.data.errors = errors;
            
            // Показываем ошибки без перерисовки
            Object.keys(errors).forEach(field => {
                this.updateFieldError(field, errors[field]);
            });
            
            return;
        }
        
        if (this.data.isLoading) return;
        
        this.data.isLoading = true;
        const submitBtn = document.querySelector('.btn-primary');
        if (submitBtn) {
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
                
                this.data.isLogin = true;
                this.data.form = { email: this.data.form.email, name: '', password: '' };
                this.data.errors = {};
                this.data.isLoading = false;
                
                window.history.pushState({}, '', '/login');
                this.render();
                this.updateSuccessMessage('✅ Регистрация успешна! Теперь войдите.');
            }
        } catch(error) {
            console.error('Auth error:', error);
            
            if (error.errors) {
                this.data.errors = error.errors;
                
                // Показываем ошибки
                Object.keys(error.errors).forEach(field => {
                    this.updateFieldError(field, error.errors[field]);
                });
                
                if (error.errors.general) {
                    this.updateGeneralError(error.errors.general);
                }
            } else if (error.message) {
                this.updateGeneralError(error.message);
            } else {
                this.updateGeneralError('Произошла ошибка при подключении к серверу');
            }
            
            this.data.isLoading = false;
            
            if (submitBtn) {
                submitBtn.textContent = this.data.isLogin ? 'Войти' : 'Зарегистрироваться';
                submitBtn.disabled = false;
            }
            
            // Фокусируемся на поле с ошибкой
            setTimeout(() => {
                if (this.data.errors.email) {
                    const emailInput = document.getElementById('email');
                    if (emailInput) emailInput.focus();
                } else if (this.data.errors.password) {
                    const passwordInput = document.getElementById('password');
                    if (passwordInput) passwordInput.focus();
                } else if (this.data.errors.name) {
                    const nameInput = document.getElementById('name');
                    if (nameInput) nameInput.focus();
                }
            }, 100);
        }
    },

    escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    render() {
        const html = `
            <div class="auth-container">
                <h2>${this.data.isLogin ? 'Вход' : 'Регистрация'}</h2>
                
                <form onsubmit="Auth.submit(event); return false;">
                    <div class="form-group">
                        <label>Электронная почта</label>
                        <input 
                            type="email" 
                            id="email" 
                            name="email"
                            class="form-control" 
                            value="${this.escapeHtml(this.data.form.email || '')}" 
                            oninput="Auth.handleInput('email', this.value)"
                            placeholder="example@mail.com"
                            ${this.data.isLoading ? 'disabled' : ''}
                        >
                        <div id="email-error" class="error-message field-error" style="display: none;"></div>
                    </div>
                    
                    ${!this.data.isLogin ? `
                        <div class="form-group">
                            <label>Имя (только латиница)</label>
                            <input 
                                type="text" 
                                id="name" 
                                name="name"
                                class="form-control" 
                                value="${this.escapeHtml(this.data.form.name || '')}" 
                                oninput="Auth.handleInput('name', this.value)"
                                placeholder="John"
                                ${this.data.isLoading ? 'disabled' : ''}
                            >
                            <div id="name-error" class="error-message field-error" style="display: none;"></div>
                        </div>
                    ` : ''}
                    
                    <div class="form-group">
                        <label>Пароль</label>
                        <input 
                            type="password" 
                            id="password" 
                            name="password"
                            class="form-control" 
                            value="${this.escapeHtml(this.data.form.password || '')}" 
                            oninput="Auth.handleInput('password', this.value)"
                            placeholder="********"
                            ${this.data.isLoading ? 'disabled' : ''}
                        >
                        <div id="password-error" class="error-message field-error" style="display: none;"></div>
                    </div>
                    
                    <button type="submit" class="btn btn-primary" ${this.data.isLoading ? 'disabled' : ''}>
                        ${this.data.isLoading ? 'Загрузка...' : (this.data.isLogin ? 'Войти' : 'Зарегистрироваться')}
                    </button>
                </form>
                
                <div class="auth-link">
                    <a href="#" onclick="Auth.toggleMode(event); return false;" ${this.data.isLoading ? 'style="pointer-events: none; opacity: 0.5;"' : ''}>
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
        
        // После рендера показываем сохраненные ошибки
        Object.keys(this.data.errors).forEach(field => {
            if (field !== 'general' && field !== 'success') {
                this.updateFieldError(field, this.data.errors[field]);
            }
        });
        
        if (this.data.errors.general) {
            this.updateGeneralError(this.data.errors.general);
        }
        
        if (this.data.errors.success) {
            this.updateSuccessMessage(this.data.errors.success);
            delete this.data.errors.success;
        }
    }
};

window.Auth = Auth;