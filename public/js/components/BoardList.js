const BoardList = {
    data: {
        boards: [],
        filteredBoards: [],
        userName: '',
        isPublic: false,
        sortOrder: 'desc',
        isLoading: false
    },

    async init(isPublic = false) {
        console.log('BoardList.init()', isPublic);
        
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        console.log('User:', user);
        
        this.data = {
            boards: [],
            filteredBoards: [],
            userName: user.name || '',
            isPublic: isPublic,
            sortOrder: 'desc',
            isLoading: true
        };
        
        this.render();
        await this.loadBoards();
        this.data.isLoading = false;
        this.render();
    },

    async loadBoards() {
        try {
            console.log('Loading boards...');
            if(this.data.isPublic) {
                this.data.boards = await API.boards.getPublicBoards();
            } else {
                this.data.boards = await API.boards.getUserBoards();
            }
            console.log('Boards loaded:', this.data.boards);
            this.applyFilter();
        } catch(error) {
            console.error('Failed to load boards:', error);
            this.data.boards = [];
            this.applyFilter();
        }
    },

    applyFilter() {
        console.log('Applying filter, sort order:', this.data.sortOrder);
        this.data.filteredBoards = [...this.data.boards];
        
        if(this.data.isPublic) {
            this.data.filteredBoards.sort((a, b) => {
                const likesA = a.likes_count || 0;
                const likesB = b.likes_count || 0;
                
                if(this.data.sortOrder === 'desc') {
                    return likesB - likesA;
                } else {
                    return likesA - likesB;
                }
            });
        }
        
        this.render();
    },

    async toggleLike(boardId, event) {
        event.stopPropagation();
        
        try {
            const result = await API.boards.toggleLike(boardId);
            console.log('Like toggled:', result);
            
            const board = this.data.boards.find(b => b.id == boardId);
            if(board) {
                if(result.action === 'added') {
                    board.likes_count = (board.likes_count || 0) + 1;
                } else {
                    board.likes_count = Math.max(0, (board.likes_count || 0) - 1);
                }
                this.applyFilter();
            }
        } catch(error) {
            console.error('Failed to toggle like:', error);
            alert('Ошибка при оценке доски');
        }
    },

    showCreateModal() {
        document.getElementById('createBoardModal').style.display = 'flex';
        document.getElementById('boardName').value = '';
        document.getElementById('isPublic').checked = false;
    },

    hideCreateModal() {
        document.getElementById('createBoardModal').style.display = 'none';
    },

    async createBoard() {
        const nameInput = document.getElementById('boardName');
        const isPublicCheckbox = document.getElementById('isPublic');
        
        const name = nameInput.value.trim();
        const isPublic = isPublicCheckbox.checked;
        
        console.log('Creating board:', { name, isPublic });
        
        if(!name) {
            alert('Введите название доски');
            nameInput.focus();
            return;
        }
        
        try {
            this.hideCreateModal();
            this.data.isLoading = true;
            this.render();
            
            const result = await API.boards.create({ 
                name: name, 
                is_public: isPublic 
            });
            
            console.log('Board created:', result);
            
            // Показываем сообщение об успехе
            alert(`Доска "${name}" успешно создана!`);
            
            // Перезагружаем список досок
            await this.loadBoards();
            
        } catch(error) {
            console.error('Create board error:', error);
            this.data.isLoading = false;
            this.render();
            
            const errorMessage = error.errors?.name || error.errors?.general || 'Ошибка при создании доски';
            alert(errorMessage);
            
            // Показываем модальное окно снова для исправления ошибки
            this.showCreateModal();
        } finally {
            this.data.isLoading = false;
            this.render();
        }
    },

    logout() {
        API.setToken(null);
        localStorage.removeItem('user');
        window.location.href = '/login';
    },

    handleSortChange(value) {
        this.data.sortOrder = value;
        this.applyFilter();
    },

    render() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const title = this.data.isPublic ? 'Публичные доски' : 'Мои доски';
        
        let html = `
            <div>
                <div class="nav">
                    <div class="nav-links">
                        <a href="#" onclick="Router.navigate('/boards')" class="${!this.data.isPublic ? 'active' : ''}">Мои доски</a>
                        <a href="#" onclick="Router.navigate('/public')" class="${this.data.isPublic ? 'active' : ''}">Публичные доски</a>
                    </div>
                    <div class="user-info">
                        <span class="user-name">${user.name || ''}</span>
                        <button class="logout-btn" onclick="BoardList.logout()">Выйти</button>
                    </div>
                </div>
                
                <div class="boards-header">
                    <h2>${title}</h2>
        `;
        
        if(!this.data.isPublic) {
            html += `<button class="btn create-board-btn" onclick="BoardList.showCreateModal()">+ Создать доску</button>`;
        }
        
        html += `</div>`;
        
        if(this.data.isPublic) {
            html += `
                <div class="filter-section">
                    <h3>Фильтр</h3>
                    <div class="filter-controls">
                        <div class="filter-group">
                            <label>Сортировать по лайкам</label>
                            <select id="sortOrder" onchange="BoardList.handleSortChange(this.value)">
                                <option value="desc" ${this.data.sortOrder === 'desc' ? 'selected' : ''}>Сначала популярные</option>
                                <option value="asc" ${this.data.sortOrder === 'asc' ? 'selected' : ''}>Сначала непопулярные</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;
        }
        
        if(this.data.isLoading) {
            html += `<div style="text-align: center; padding: 50px;">Загрузка...</div>`;
        } else if(this.data.filteredBoards.length === 0) {
            html += `<div style="text-align: center; padding: 50px;">Досок нет</div>`;
        } else {
            html += `<div class="boards-grid">`;
            
            this.data.filteredBoards.forEach(board => {
                html += `
                    <div class="board-card" onclick="Router.navigate('/board/${board.public_hash || board.id}')">
                        <h3>${board.name || 'Без названия'}</h3>
                        <div class="board-meta">
                            <span class="board-owner">${board.owner_name || 'Неизвестно'}</span>
                            <div class="board-likes">
                                <button class="like-btn" onclick="BoardList.toggleLike(${board.id}, event)">❤</button>
                                <span>${board.likes_count || 0}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        }
        
        html += `
            </div>
            
            <div class="modal" id="createBoardModal" style="display: none;">
                <div class="modal-content">
                    <h3>Создать новую доску</h3>
                    <form onsubmit="return false;">
                        <div class="form-group">
                            <label for="boardName">Название доски</label>
                            <input type="text" id="boardName" placeholder="Введите название доски" autocomplete="off">
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="isPublic"> Публичная доска
                            </label>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button type="button" class="btn" onclick="BoardList.createBoard()">Создать</button>
                            <button type="button" class="btn btn-secondary" onclick="BoardList.hideCreateModal()">Отмена</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.getElementById('app').innerHTML = html;
    }
};