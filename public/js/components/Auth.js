const Auth = {
    template: `
        <div class="auth-container">
            <h2>${this && this.data && this.data.isLogin ? 'Вход' : 'Регистрация'}</h2>
            <form onsubmit="return false">
                <div class="form-group">
                    <label>Электронная почта</label>
                    <input type="email" id="email" class="${this && this.data && this.data.errors && this.data.errors.email ? 'error' : ''}" 
                           value="${this && this.data && this.data.form && this.data.form.email ? this.data.form.email : ''}" 
                           oninput="Auth.handleInput('email', this.value)">
                    ${this && this.data && this.data.errors && this.data.errors.email ? `<div class="error-message">${this.data.errors.email}</div>` : ''}
                </div>
                
                ${!this || !this.data || !this.data.isLogin ? `
                <div class="form-group">
                    <label>Имя (только латиница)</label>
                    <input type="text" id="name" class="${this && this.data && this.data.errors && this.data.errors.name ? 'error' : ''}" 
                           value="${this && this.data && this.data.form && this.data.form.name ? this.data.form.name : ''}" 
                           oninput="Auth.handleInput('name', this.value)">
                    ${this && this.data && this.data.errors && this.data.errors.name ? `<div class="error-message">${this.data.errors.name}</div>` : ''}
                </div>
                ` : ''}
                
                <div class="form-group">
                    <label>Пароль</label>
                    <input type="password" id="password" class="${this && this.data && this.data.errors && this.data.errors.password ? 'error' : ''}" 
                           value="${this && this.data && this.data.form && this.data.form.password ? this.data.form.password : ''}" 
                           oninput="Auth.handleInput('password', this.value)">
                    ${this && this.data && this.data.errors && this.data.errors.password ? `<div class="error-message">${this.data.errors.password}</div>` : ''}
                </div>
                
                <button class="btn" onclick="Auth.submit()">
                    ${this && this.data && this.data.isLogin ? 'Войти' : 'Зарегистрироваться'}
                </button>
            </form>
            
            <div class="auth-link">
                <a href="#" onclick="Auth.toggleMode()">
                    ${this && this.data && this.data.isLogin ? 'Нужна учетная запись? Зарегистрироваться' : 'У вас уже есть учетная запись? Войти'}
                </a>
            </div>
        </div>
    `,

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
        this.data = {
            isLogin: true,
            form: {
                email: '',
                name: '',
                password: ''
            },
            errors: {}
        };
        this.render();
    },

    handleInput(field, value) {
        this.data.form[field] = value;
        if (this.data.errors[field]) {
            delete this.data.errors[field];
        }
        this.render();
    },

    toggleMode() {
        this.data.isLogin = !this.data.isLogin;
        this.data.form = { email: '', name: '', password: '' };
        this.data.errors = {};
        this.render();
    },

    async submit() {
        this.data.errors = {};
        
        // Валидация
        if (!this.data.form.email) {
            this.data.errors.email = 'Email обязателен';
        } else if (!this.data.form.email.includes('@')) {
            this.data.errors.email = 'Неверный формат email';
        }

        if (!this.data.isLogin) {
            if (!this.data.form.name) {
                this.data.errors.name = 'Имя обязательно';
            } else if (!/^[a-zA-Z]+$/.test(this.data.form.name)) {
                this.data.errors.name = 'Имя должно содержать только латиницу';
            }
        }

        if (!this.data.form.password) {
            this.data.errors.password = 'Пароль обязателен';
        } else if (!this.data.isLogin && this.data.form.password.length < 8) {
            this.data.errors.password = 'Пароль должен быть минимум 8 символов';
        } else if (!this.data.isLogin && !/[0-9]/.test(this.data.form.password)) {
            this.data.errors.password = 'Пароль должен содержать цифры';
        } else if (!this.data.isLogin && !/[^a-zA-Z0-9]/.test(this.data.form.password)) {
            this.data.errors.password = 'Пароль должен содержать спецсимволы';
        }

        if (Object.keys(this.data.errors).length > 0) {
            this.render();
            return;
        }
        
        try {
            if(this.data.isLogin) {
                const response = await API.auth.login({
                    email: this.data.form.email,
                    password: this.data.form.password
                });
                
                API.setToken(response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
                Router.navigate('/boards');
            } else {
                await API.auth.register({
                    email: this.data.form.email,
                    name: this.data.form.name,
                    password: this.data.form.password
                });
                
                this.data.isLogin = true;
                this.data.form = { email: '', name: '', password: '' };
                alert('Регистрация успешна! Теперь войдите.');
                this.render();
            }
        } catch(error) {
            console.error('Auth error:', error);
            this.data.errors = error.errors || { general: 'Произошла ошибка' };
            this.render();
        }
    },

    render() {
        // Простая замена шаблона на строку с данными
        let html = `
            <div class="auth-container">
                <h2>${this.data.isLogin ? 'Вход' : 'Регистрация'}</h2>
                <form onsubmit="return false">
                    <div class="form-group">
                        <label>Электронная почта</label>
                        <input type="email" id="email" class="${this.data.errors.email ? 'error' : ''}" 
                               value="${this.data.form.email || ''}" 
                               oninput="Auth.handleInput('email', this.value)">
                        ${this.data.errors.email ? `<div class="error-message">${this.data.errors.email}</div>` : ''}
                    </div>
                    
                    ${!this.data.isLogin ? `
                    <div class="form-group">
                        <label>Имя (только латиница)</label>
                        <input type="text" id="name" class="${this.data.errors.name ? 'error' : ''}" 
                               value="${this.data.form.name || ''}" 
                               oninput="Auth.handleInput('name', this.value)">
                        ${this.data.errors.name ? `<div class="error-message">${this.data.errors.name}</div>` : ''}
                    </div>
                    ` : ''}
                    
                    <div class="form-group">
                        <label>Пароль</label>
                        <input type="password" id="password" class="${this.data.errors.password ? 'error' : ''}" 
                               value="${this.data.form.password || ''}" 
                               oninput="Auth.handleInput('password', this.value)">
                        ${this.data.errors.password ? `<div class="error-message">${this.data.errors.password}</div>` : ''}
                    </div>
                    
                    <button class="btn" onclick="Auth.submit()">
                        ${this.data.isLogin ? 'Войти' : 'Зарегистрироваться'}
                    </button>
                </form>
                
                <div class="auth-link">
                    <a href="#" onclick="Auth.toggleMode()">
                        ${this.data.isLogin ? 'Нужна учетная запись? Зарегистрироваться' : 'У вас уже есть учетная запись? Войти'}
                    </a>
                </div>
            </div>
        `;
        
        document.getElementById('app').innerHTML = html;
    }
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname === '/login' || window.location.pathname === '/register') {
        Auth.init();
    }
});