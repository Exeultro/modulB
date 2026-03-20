const Board = {
    template: `
        <div>
            <div class="nav">
                <div class="nav-links">
                    <a href="#" onclick="Router.navigate('/boards')">Мои доски</a>
                    <a href="#" onclick="Router.navigate('/public')">Публичные доски</a>
                </div>
                <div class="user-info">
                    <span class="user-name">{{ userName }}</span>
                    <button class="logout-btn" onclick="Board.logout()">Выйти</button>
                </div>
            </div>
            
            <div class="board-container">
                <div class="board-header">
                    <div class="board-title">
                        <h2>{{ boardName }}</h2>
                        <span>Владелец: {{ ownerName }}</span>
                    </div>
                    <div class="board-actions">
                        <button class="btn btn-secondary" if="isOwner" onclick="Board.showAccessModal()">
                            Поделиться доской
                        </button>
                    </div>
                </div>
                
                <div class="public-link" if="publicHash">
                    <label>Публичная ссылка:</label>
                    <input type="text" value="{{ publicLink }}" readonly onclick="this.select()">
                </div>
                
                <div class="toolbar">
                    <button class="tool-btn" data-tool="select" onclick="Board.setTool('select')">🖱️ Выбрать</button>
                    <button class="tool-btn" data-tool="text" onclick="Board.setTool('text')">📝 Текст</button>
                    <button class="tool-btn" data-tool="image" onclick="Board.setTool('image')">🖼️ Изображение</button>
                    <button class="tool-btn" data-tool="rectangle" onclick="Board.setTool('rectangle')">⬜ Прямоугольник</button>
                    <button class="tool-btn" data-tool="circle" onclick="Board.setTool('circle')">⚪ Круг</button>
                    <button class="tool-btn" data-tool="line" onclick="Board.setTool('line')">📏 Линия</button>
                </div>
                
                <div class="canvas-wrapper">
                    <canvas id="boardCanvas" class="canvas" width="1600" height="900"></canvas>
                </div>
            </div>
        </div>
        
        <div class="modal" id="accessModal" style="display: none;">
            <div class="modal-content">
                <h3>Предоставить доступ</h3>
                <form onsubmit="return false">
                    <div class="form-group">
                        <label>Email пользователя</label>
                        <input type="email" id="accessEmail" value="">
                    </div>
                    <button class="btn" onclick="Board.grantAccess()">Готово</button>
                    <button class="btn btn-secondary" onclick="Board.hideAccessModal()">Отмена</button>
                </form>
            </div>
        </div>
    `,

    data: {
        boardId: null,
        boardName: '',
        ownerName: '',
        userName: '',
        userId: null,
        isOwner: false,
        publicHash: '',
        publicLink: '',
        currentTool: 'select',
        objects: [] // Сохраняем объекты из ответа сервера
    },

    isCanvasInitialized: false,

    async init(hash) {
        console.log('Board.init()', hash);
        
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        this.data.userName = user.name || '';
        this.data.userId = user.id || null;
        
        try {
            const response = await API.boards.getBoard(hash);
            console.log('Board response:', response);
            
            const boardData = response.board;
            const objects = response.objects || [];
            
            this.data.boardId = boardData.id;
            this.data.boardName = boardData.name;
            this.data.ownerName = boardData.owner_name;
            this.data.isOwner = boardData.owner_id == user.id;
            this.data.publicHash = boardData.public_hash;
            this.data.publicLink = window.location.origin + '/board/' + boardData.public_hash;
            this.data.objects = objects; // Сохраняем объекты
            
            this.render();
            
            // Инициализируем canvas
            this.initCanvas();
            
            // WebSocket подключение
            if (typeof WebSocketService !== 'undefined') {
                WebSocketService.connect(this.data.boardId, user.id, user.name);
            }
            
        } catch(error) {
            console.error('Ошибка загрузки доски:', error);
            Router.navigate('/boards');
        }
    },

    initCanvas() {
        // Ждем появления canvas в DOM
        setTimeout(() => {
            const canvas = document.getElementById('boardCanvas');
            if (canvas && window.Canvas) {
                console.log('🎨 Инициализация Canvas для доски:', this.data.boardId);
                
                // Передаем объекты в Canvas при инициализации
                window.Canvas.init(canvas, this.data.boardId, this.data.objects);
                
                // Устанавливаем текущий инструмент
                window.Canvas.setTool(this.data.currentTool);
                
                this.isCanvasInitialized = true;
                console.log('✅ Canvas готов');
            } else {
                console.error('Canvas не найден');
            }
        }, 100);
    },

    setTool(tool) {
        console.log('🎯 Board.setTool()', tool);
        this.data.currentTool = tool;
        
        // Обновляем активный класс кнопок
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tool === tool) {
                btn.classList.add('active');
            }
        });
        
        // Обновляем инструмент в Canvas
        if (window.Canvas && this.isCanvasInitialized) {
            window.Canvas.setTool(tool);
        }
    },

    showAccessModal() {
        document.getElementById('accessModal').style.display = 'flex';
    },

    hideAccessModal() {
        document.getElementById('accessModal').style.display = 'none';
    },

    async grantAccess() {
        const email = document.getElementById('accessEmail').value;
        if(!email) {
            alert('Введите email');
            return;
        }
        try {
            await API.boards.grantAccess(this.data.boardId, email);
            this.hideAccessModal();
            alert('Доступ предоставлен');
        } catch(error) {
            alert('Ошибка: ' + (error.errors?.email || 'Неизвестная ошибка'));
        }
    },

    logout() {
        if (window.WebSocketService) WebSocketService.disconnect();
        API.setToken(null);
        localStorage.removeItem('user');
        Router.navigate('/login');
    },

    render() {
        // Обновляем данные в шаблоне
        let html = this.template;
        
        // Заменяем плейсхолдеры
        html = html.replace(/\{\{ userName \}\}/g, this.data.userName);
        html = html.replace(/\{\{ boardName \}\}/g, this.data.boardName);
        html = html.replace(/\{\{ ownerName \}\}/g, this.data.ownerName);
        html = html.replace(/\{\{ publicHash \}\}/g, this.data.publicHash);
        html = html.replace(/\{\{ publicLink \}\}/g, this.data.publicLink);
        
        // Обрабатываем условный рендеринг
        html = html.replace(/<button([^>]*) if="isOwner"([^>]*)>/g, (match, before, after) => {
            return this.data.isOwner ? `<button${before}${after}>` : '';
        });
        
        html = html.replace(/<div class="public-link" if="publicHash">(.*?)<\/div>/gs, (match) => {
            return this.data.publicHash ? match : '';
        });
        
        document.getElementById('app').innerHTML = html;
        
        // Сбрасываем флаг инициализации canvas при полной перерисовке
        this.isCanvasInitialized = false;
    }
};

window.Board = Board;
console.log('✅ Board.js загружен');