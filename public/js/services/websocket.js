const WebSocketService = {
    connection: null,
    boardId: null,
    userId: null,
    userName: null,
    callbacks: {},

    connect(boardId, userId, userName) {
        this.boardId = boardId;
        this.userId = userId;
        this.userName = userName;
        
        // Подключаемся к простому WebSocket серверу
        this.connection = new WebSocket('ws://localhost:8081');

        this.connection.onopen = () => {
            console.log('✅ WebSocket подключен');
            this.subscribe();
        };

        this.connection.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('📨 Получено сообщение:', data.type);
            this.handleMessage(data);
        };

        this.connection.onclose = () => {
            console.log('❌ WebSocket отключен');
            // Пытаемся переподключиться через 3 секунды
            setTimeout(() => this.connect(boardId, userId, userName), 3000);
        };

        this.connection.onerror = (error) => {
            console.error('⚠️ Ошибка WebSocket:', error);
        };
    },

    subscribe() {
        if(this.connection && this.connection.readyState === WebSocket.OPEN) {
            this.send({
                type: 'subscribe',
                board_id: this.boardId,
                user_id: this.userId,
                user_name: this.userName
            });
            console.log('📢 Подписка на доску:', this.boardId);
        }
    },

    unsubscribe() {
        if(this.connection && this.connection.readyState === WebSocket.OPEN) {
            this.send({
                type: 'unsubscribe',
                board_id: this.boardId
            });
        }
    },

    send(data) {
        if(this.connection && this.connection.readyState === WebSocket.OPEN) {
            this.connection.send(JSON.stringify(data));
        }
    },

    on(event, callback) {
        if(!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    },

    off(event, callback) {
        if(this.callbacks[event]) {
            this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
        }
    },

    handleMessage(data) {
        if(this.callbacks[data.type]) {
            this.callbacks[data.type].forEach(callback => callback(data));
        }
    },

    objectUpdate(object) {
        this.send({
            type: 'object_update',
            board_id: this.boardId,
            object: object
        });
    },

    focusObject(objectId) {
        this.send({
            type: 'focus_object',
            board_id: this.boardId,
            object_id: objectId,
            user_id: this.userId,
            user_name: this.userName
        });
    },

    releaseFocus(objectId) {
        this.send({
            type: 'release_focus',
            board_id: this.boardId,
            object_id: objectId
        });
    },

    disconnect() {
        if(this.connection) {
            this.unsubscribe();
            this.connection.close();
        }
    }
};