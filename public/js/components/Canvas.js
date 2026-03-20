const Canvas = {
    canvas: null,
    ctx: null,
    objects: [],
    currentTool: 'select',
    boardId: null,
    
    // Временные данные для рисования
    isDrawing: false,
    startX: 0,
    startY: 0,
    tempObject: null,
    
    // Выделенный объект
    selectedObject: null,
    selectedObjectId: null,
    
    // Режим редактирования
    editMode: false,
    editType: null,
    editHandle: null,
    editStartX: 0,
    editStartY: 0,
    editStartWidth: 0,
    editStartHeight: 0,
    editStartXPos: 0,
    editStartYPos: 0,
    editStartRotation: 0,

    init(canvasElement, boardId, initialObjects = []) {
        console.log('Canvas init for board:', boardId);
        
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.boardId = boardId;
        
        this.canvas.width = 1600;
        this.canvas.height = 900;
        
        this.loadInitialObjects(initialObjects);
        
        this.canvas.onmousedown = (e) => this.handleMouseDown(e);
        this.canvas.onmousemove = (e) => this.handleMouseMove(e);
        this.canvas.onmouseup = (e) => this.handleMouseUp(e);
        this.canvas.onmouseleave = () => this.handleMouseLeave();
        
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        this.draw();
    },

    loadInitialObjects(initialObjects) {
        try {
            if (!initialObjects || initialObjects.length === 0) {
                this.objects = [];
                return;
            }
            
            this.objects = initialObjects.map(dbObj => {
                let content = dbObj.content;
                if (typeof content === 'string') {
                    try {
                        content = JSON.parse(content);
                    } catch (e) {
                        content = {};
                    }
                }
                
                const canvasObj = {
                    id: dbObj.id,
                    type: dbObj.type,
                    ...content,
                    x: dbObj.position_x,
                    y: dbObj.position_y,
                    width: dbObj.width || (dbObj.type === 'circle' ? (content.radius * 2) : 50),
                    height: dbObj.height || (dbObj.type === 'circle' ? (content.radius * 2) : 50),
                    rotation: dbObj.rotation || 0
                };
                
                if (dbObj.type === 'circle' && content.radius) {
                    canvasObj.radius = content.radius;
                }
                
                if (dbObj.type === 'image' && content.src) {
                    const img = new Image();
                    img.src = content.src;
                    canvasObj.img = img;
                }
                
                return canvasObj;
            });
            
            this.draw();
        } catch (error) {
            console.error('Error loading initial objects:', error);
        }
    },

    async saveObject(object) {
        if (!this.boardId) return null;
        
        try {
            const dbObject = {
                type: object.type,
                content: this.prepareContent(object),
                position_x: Math.round(object.x),
                position_y: Math.round(object.y),
                width: object.width || null,
                height: object.height || null,
                rotation: object.rotation || 0
            };
            
            const response = await API.boards.createBoardObject(this.boardId, dbObject);
            
            if (response && response.object) {
                object.id = response.object.id;
            }
            
            return response;
        } catch (error) {
            console.error('Error saving object:', error);
            return null;
        }
    },

    async updateObject(object) {
        if (!this.boardId || !object.id) return;
        
        try {
            const dbObject = {
                type: object.type,
                content: this.prepareContent(object),
                position_x: Math.round(object.x),
                position_y: Math.round(object.y),
                width: object.width || null,
                height: object.height || null,
                rotation: object.rotation || 0
            };
            
            await API.boards.updateBoardObject(this.boardId, object.id, dbObject);
        } catch (error) {
            console.error('Error updating object:', error);
        }
    },

    async deleteObject(objectId) {
        if (!this.boardId || !objectId) return;
        
        try {
            await API.boards.deleteBoardObject(this.boardId, objectId);
        } catch (error) {
            console.error('Error deleting object:', error);
        }
    },

    prepareContent(obj) {
        const content = {};
        
        switch(obj.type) {
            case 'rectangle':
                content.color = obj.color;
                break;
            case 'circle':
                content.color = obj.color;
                content.radius = obj.radius;
                break;
            case 'line':
                content.color = obj.color;
                content.x1 = obj.x1;
                content.y1 = obj.y1;
                content.x2 = obj.x2;
                content.y2 = obj.y2;
                break;
            case 'text':
                content.text = obj.text;
                content.color = obj.color;
                content.fontSize = obj.fontSize;
                break;
            case 'image':
                content.src = obj.src;
                content.color = obj.color;
                break;
        }
        
        return content;
    },

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const canvasX = (x / rect.width) * 1600;
        const canvasY = (y / rect.height) * 900;
        
        if (this.currentTool === 'select') {
            if (this.selectedObject && this.checkEditHandleClick(canvasX, canvasY)) {
                return;
            }
            this.selectObject(canvasX, canvasY);
        } else {
            this.selectedObject = null;
            this.editMode = false;
            this.isDrawing = true;
            this.startX = canvasX;
            this.startY = canvasY;
            
            if (this.currentTool === 'line') {
                this.tempObject = {
                    type: 'line',
                    x1: canvasX,
                    y1: canvasY,
                    x2: canvasX,
                    y2: canvasY,
                    color: '#8b5cf6'
                };
            } else if (this.currentTool === 'circle') {
                this.tempObject = {
                    type: 'circle',
                    x: canvasX,
                    y: canvasY,
                    radius: 0,
                    color: '#8b5cf6'
                };
            } else if (this.currentTool === 'rectangle') {
                this.tempObject = {
                    type: 'rectangle',
                    x: canvasX,
                    y: canvasY,
                    width: 0,
                    height: 0,
                    color: '#8b5cf6'
                };
            } else if (this.currentTool === 'image') {
                this.loadImage(canvasX, canvasY);
                this.isDrawing = false;
            } else if (this.currentTool === 'text') {
                const text = prompt('Введите текст:', 'Текст');
                if (text) {
                    const newObject = {
                        type: 'text',
                        x: canvasX,
                        y: canvasY,
                        text: text,
                        color: '#8b5cf6',
                        fontSize: 20,
                        width: text.length * 12,
                        height: 24
                    };
                    
                    this.saveObject(newObject).then(() => {
                        this.objects.push(newObject);
                        this.draw();
                    });
                }
                this.isDrawing = false;
            }
        }
    },

    checkEditHandleClick(x, y) {
        if (!this.selectedObject) return false;
        
        const obj = this.selectedObject;
        const handles = this.getEditHandles(obj);
        const tolerance = 10;
        
        for (const [handle, pos] of Object.entries(handles)) {
            const dx = x - pos.x;
            const dy = y - pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < tolerance) {
                this.editMode = true;
                this.editType = 'resize';
                this.editHandle = handle;
                this.editStartX = x;
                this.editStartY = y;
                this.editStartWidth = obj.width;
                this.editStartHeight = obj.height;
                this.editStartXPos = obj.x;
                this.editStartYPos = obj.y;
                this.editStartRotation = obj.rotation || 0;
                return true;
            }
        }
        
        const rotateHandle = this.getRotateHandle(obj);
        const dx = x - rotateHandle.x;
        const dy = y - rotateHandle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 12) {
            this.editMode = true;
            this.editType = 'rotate';
            this.editStartX = x;
            this.editStartY = y;
            this.editStartRotation = obj.rotation || 0;
            return true;
        }
        
        return false;
    },

    getEditHandles(obj) {
        const x = obj.x;
        const y = obj.y;
        const w = obj.width;
        const h = obj.height;
        const centerX = x + w/2;
        const centerY = y + h/2;
        
        const angle = (obj.rotation || 0) * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        const rotatePoint = (px, py) => {
            const dx = px - centerX;
            const dy = py - centerY;
            return {
                x: centerX + dx * cos - dy * sin,
                y: centerY + dx * sin + dy * cos
            };
        };
        
        return {
            tl: rotatePoint(x, y),
            tr: rotatePoint(x + w, y),
            bl: rotatePoint(x, y + h),
            br: rotatePoint(x + w, y + h)
        };
    },

    getRotateHandle(obj) {
        const handles = this.getEditHandles(obj);
        const dx = handles.tl.x - (obj.x + obj.width/2);
        const dy = handles.tl.y - (obj.y + obj.height/2);
        const distance = Math.sqrt(dx*dx + dy*dy);
        const angle = Math.atan2(dy, dx);
        
        return {
            x: handles.tl.x + Math.cos(angle) * 20,
            y: handles.tl.y + Math.sin(angle) * 20
        };
    },

    handleMouseMove(e) {
        if (this.editMode && this.selectedObject) {
            this.handleEdit(e);
            return;
        }
        
        if (!this.isDrawing || !this.tempObject) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const canvasX = (x / rect.width) * 1600;
        const canvasY = (y / rect.height) * 900;
        
        if (this.currentTool === 'line') {
            this.tempObject.x2 = canvasX;
            this.tempObject.y2 = canvasY;
        } else if (this.currentTool === 'circle') {
            const dx = canvasX - this.startX;
            const dy = canvasY - this.startY;
            this.tempObject.radius = Math.sqrt(dx * dx + dy * dy);
            this.tempObject.width = this.tempObject.radius * 2;
            this.tempObject.height = this.tempObject.radius * 2;
        } else if (this.currentTool === 'rectangle') {
            this.tempObject.width = canvasX - this.startX;
            this.tempObject.height = canvasY - this.startY;
            
            if (this.tempObject.width < 0) {
                this.tempObject.x = canvasX;
                this.tempObject.width = Math.abs(this.tempObject.width);
            }
            if (this.tempObject.height < 0) {
                this.tempObject.y = canvasY;
                this.tempObject.height = Math.abs(this.tempObject.height);
            }
        }
        
        this.draw();
    },

    handleEdit(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const canvasX = (x / rect.width) * 1600;
        const canvasY = (y / rect.height) * 900;
        
        const obj = this.selectedObject;
        
        if (this.editType === 'rotate') {
            const centerX = obj.x + obj.width/2;
            const centerY = obj.y + obj.height/2;
            const angle = Math.atan2(canvasY - centerY, canvasX - centerX);
            const startAngle = Math.atan2(this.editStartY - centerY, this.editStartX - centerX);
            let delta = angle - startAngle;
            obj.rotation = (this.editStartRotation + delta * 180 / Math.PI) % 360;
        } else if (this.editHandle) {
            // Получаем текущий угол поворота
            const angle = (obj.rotation || 0) * Math.PI / 180;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            
            // Центр объекта
            const centerX = obj.x + obj.width/2;
            const centerY = obj.y + obj.height/2;
            
            // Переводим текущую точку мыши в локальные координаты объекта (без поворота)
            let dx = canvasX - centerX;
            let dy = canvasY - centerY;
            const localX = dx * cos + dy * sin;
            const localY = -dx * sin + dy * cos;
            
            // Стартовую точку тоже переводим в локальные координаты
            dx = this.editStartX - centerX;
            dy = this.editStartY - centerY;
            const startLocalX = dx * cos + dy * sin;
            const startLocalY = -dx * sin + dy * cos;
            
            let newWidth = this.editStartWidth;
            let newHeight = this.editStartHeight;
            let newX = this.editStartXPos;
            let newY = this.editStartYPos;
            
            // Вычисляем новые размеры в зависимости от выбранного угла
            switch(this.editHandle) {
                case 'tl': // top-left
                    newWidth = this.editStartWidth - (localX - startLocalX);
                    newHeight = this.editStartHeight - (localY - startLocalY);
                    newX = this.editStartXPos + (localX - startLocalX);
                    newY = this.editStartYPos + (localY - startLocalY);
                    break;
                case 'tr': // top-right
                    newWidth = this.editStartWidth + (localX - startLocalX);
                    newHeight = this.editStartHeight - (localY - startLocalY);
                    newY = this.editStartYPos + (localY - startLocalY);
                    break;
                case 'bl': // bottom-left
                    newWidth = this.editStartWidth - (localX - startLocalX);
                    newHeight = this.editStartHeight + (localY - startLocalY);
                    newX = this.editStartXPos + (localX - startLocalX);
                    break;
                case 'br': // bottom-right
                    newWidth = this.editStartWidth + (localX - startLocalX);
                    newHeight = this.editStartHeight + (localY - startLocalY);
                    break;
            }
            
            // Минимальные размеры
            newWidth = Math.max(20, newWidth);
            newHeight = Math.max(20, newHeight);
            
            // Для изображений сохраняем пропорции
            if (obj.type === 'image') {
                const ratio = obj.height / obj.width;
                if (Math.abs(newWidth - this.editStartWidth) > Math.abs(newHeight - this.editStartHeight)) {
                    newHeight = newWidth * ratio;
                } else {
                    newWidth = newHeight / ratio;
                }
            }
            
            obj.width = newWidth;
            obj.height = newHeight;
            obj.x = newX;
            obj.y = newY;
            
            // Для круга обновляем радиус
            if (obj.type === 'circle') {
                obj.radius = newWidth / 2;
            }
        }
        
        this.draw();
    },

    async handleMouseUp(e) {
        if (this.editMode && this.selectedObject) {
            await this.updateObject(this.selectedObject);
            this.editMode = false;
            this.editType = null;
            this.editHandle = null;
            return;
        }
        
        if (!this.isDrawing) return;
        
        if (this.tempObject) {
            const newObject = {...this.tempObject};
            
            if (newObject.type === 'circle' && newObject.radius) {
                newObject.width = newObject.radius * 2;
                newObject.height = newObject.radius * 2;
            }
            
            await this.saveObject(newObject);
            this.objects.push(newObject);
            this.tempObject = null;
        }
        
        this.isDrawing = false;
        this.draw();
    },

    handleMouseLeave() {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.tempObject = null;
            this.draw();
        }
        this.editMode = false;
    },

    async handleKeyDown(e) {
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedObject) {
            e.preventDefault();
            
            if (this.selectedObject.id) {
                await this.deleteObject(this.selectedObject.id);
            }
            
            const index = this.objects.indexOf(this.selectedObject);
            if (index > -1) {
                this.objects.splice(index, 1);
            }
            
            this.selectedObject = null;
            this.editMode = false;
            this.draw();
        }
        
        if (this.selectedObject && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            e.preventDefault();
            const step = e.shiftKey ? 10 : 1;
            
            switch(e.key) {
                case 'ArrowLeft':
                    this.selectedObject.x -= step;
                    break;
                case 'ArrowRight':
                    this.selectedObject.x += step;
                    break;
                case 'ArrowUp':
                    this.selectedObject.y -= step;
                    break;
                case 'ArrowDown':
                    this.selectedObject.y += step;
                    break;
            }
            
            await this.updateObject(this.selectedObject);
            this.draw();
        }
    },

    selectObject(x, y) {
        this.selectedObject = null;
        
        for (let i = this.objects.length - 1; i >= 0; i--) {
            const obj = this.objects[i];
            let hit = false;
            
            if (obj.type !== 'line') {
                const centerX = obj.x + obj.width/2;
                const centerY = obj.y + obj.height/2;
                const angle = (obj.rotation || 0) * Math.PI / 180;
                const cos = Math.cos(-angle);
                const sin = Math.sin(-angle);
                
                const dx = x - centerX;
                const dy = y - centerY;
                const localX = dx * cos - dy * sin + obj.width/2;
                const localY = dx * sin + dy * cos + obj.height/2;
                
                hit = localX >= 0 && localX <= obj.width && localY >= 0 && localY <= obj.height;
            } else {
                const lineX1 = obj.x1, lineY1 = obj.y1;
                const lineX2 = obj.x2, lineY2 = obj.y2;
                
                const A = x - lineX1;
                const B = y - lineY1;
                const C = lineX2 - lineX1;
                const D = lineY2 - lineY1;
                
                const dot = A * C + B * D;
                const len_sq = C * C + D * D;
                let param = len_sq === 0 ? 0 : dot / len_sq;
                
                let xx, yy;
                
                if (param < 0) {
                    xx = lineX1;
                    yy = lineY1;
                } else if (param > 1) {
                    xx = lineX2;
                    yy = lineY2;
                } else {
                    xx = lineX1 + param * C;
                    yy = lineY1 + param * D;
                }
                
                const distanceToLine = Math.sqrt((x - xx) * (x - xx) + (y - yy) * (y - yy));
                hit = distanceToLine < 10;
            }
            
            if (hit) {
                this.selectedObject = obj;
                this.draw();
                return;
            }
        }
        
        this.draw();
    },

    loadImage(x, y) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 8px; width: 400px;">
                <h3>Загрузить изображение</h3>
                <div style="margin-bottom: 15px;">
                    <input type="file" id="imageFileInput" accept="image/*" style="width: 100%;">
                </div>
                <div style="margin-bottom: 15px;">
                    <input type="url" id="imageUrlInput" placeholder="Или URL изображения" style="width: 100%;">
                </div>
                <div style="text-align: right;">
                    <button id="cancelImageBtn">Отмена</button>
                    <button id="uploadImageBtn">Загрузить</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('cancelImageBtn').onclick = () => {
            document.body.removeChild(modal);
        };
        
        document.getElementById('uploadImageBtn').onclick = () => {
            const fileInput = document.getElementById('imageFileInput');
            const urlInput = document.getElementById('imageUrlInput');
            
            const processImage = (img) => {
                const width = Math.min(300, img.width);
                const height = (img.height / img.width) * width;
                
                const newObject = {
                    type: 'image',
                    x: x - width/2,
                    y: y - height/2,
                    width: width,
                    height: height,
                    src: img.src,
                    img: img,
                    color: '#8b5cf6'
                };
                
                this.saveObject(newObject).then(() => {
                    this.objects.push(newObject);
                    this.draw();
                });
                
                document.body.removeChild(modal);
            };
            
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => processImage(img);
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            } else if (urlInput.value) {
                const img = new Image();
                img.onload = () => processImage(img);
                img.src = urlInput.value;
            } else {
                alert('Выберите файл или укажите URL');
            }
        };
    },

    setTool(tool) {
        this.currentTool = tool;
        this.isDrawing = false;
        this.tempObject = null;
        this.selectedObject = null;
        this.editMode = false;
        this.draw();
    },

    draw() {
        if (!this.ctx) return;
        
        this.ctx.clearRect(0, 0, 1600, 900);
        
        // Сетка
        this.ctx.strokeStyle = '#ccc';
        this.ctx.lineWidth = 0.5;
        for (let i = 0; i <= 1600; i += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, 900);
            this.ctx.stroke();
        }
        for (let i = 0; i <= 900; i += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i);
            this.ctx.lineTo(1600, i);
            this.ctx.stroke();
        }
        
        this.objects.forEach(obj => {
            this.drawObject(obj);
        });
        
        if (this.tempObject) {
            this.ctx.globalAlpha = 0.5;
            this.drawObject(this.tempObject);
            this.ctx.globalAlpha = 1;
        }
        
        if (this.selectedObject && this.currentTool === 'select') {
            this.drawSelectionControls(this.selectedObject);
        }
        
        this.ctx.fillStyle = '#000';
        this.ctx.font = '20px Arial';
        this.ctx.fillText('Tool: ' + this.currentTool, 20, 30);
        
        if (this.selectedObject) {
            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = '16px Arial';
            this.ctx.fillText('✓ Объект выбран (Del - удалить, Стрелки - переместить)', 20, 60);
        }
    },

    drawSelectionControls(obj) {
        this.ctx.save();
        
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        const handles = this.getEditHandles(obj);
        
        this.ctx.beginPath();
        this.ctx.moveTo(handles.tl.x, handles.tl.y);
        this.ctx.lineTo(handles.tr.x, handles.tr.y);
        this.ctx.lineTo(handles.br.x, handles.br.y);
        this.ctx.lineTo(handles.bl.x, handles.bl.y);
        this.ctx.closePath();
        this.ctx.stroke();
        
        this.ctx.fillStyle = '#00ff00';
        this.ctx.setLineDash([]);
        
        for (const [handle, pos] of Object.entries(handles)) {
            this.ctx.fillRect(pos.x - 4, pos.y - 4, 8, 8);
        }
        
        const rotateHandle = this.getRotateHandle(obj);
        this.ctx.beginPath();
        this.ctx.arc(rotateHandle.x, rotateHandle.y, 6, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ff6600';
        this.ctx.fill();
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        this.ctx.restore();
    },

    drawObject(obj) {
        this.ctx.save();
        
        if (obj.type !== 'line') {
            const centerX = obj.x + obj.width/2;
            const centerY = obj.y + obj.height/2;
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate((obj.rotation || 0) * Math.PI / 180);
            this.ctx.translate(-centerX, -centerY);
        }
        
        if (obj.type === 'image' && obj.img) {
            this.ctx.drawImage(obj.img, obj.x, obj.y, obj.width, obj.height);
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
        } else {
            this.ctx.fillStyle = obj.color || '#8b5cf6';
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2;
            
            switch(obj.type) {
                case 'rectangle':
                    this.ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
                    this.ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
                    break;
                case 'circle':
                    this.ctx.beginPath();
                    this.ctx.arc(obj.x + obj.width/2, obj.y + obj.height/2, obj.width/2, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.stroke();
                    break;
                case 'line':
                    this.ctx.beginPath();
                    this.ctx.moveTo(obj.x1, obj.y1);
                    this.ctx.lineTo(obj.x2, obj.y2);
                    this.ctx.strokeStyle = obj.color;
                    this.ctx.lineWidth = 3;
                    this.ctx.stroke();
                    break;
                case 'text':
                    this.ctx.font = `${obj.fontSize || 20}px Arial`;
                    this.ctx.fillStyle = obj.color;
                    this.ctx.fillText(obj.text, obj.x, obj.y);
                    break;
                default:
                    this.ctx.fillRect(obj.x, obj.y, obj.width || 50, obj.height || 50);
                    this.ctx.strokeRect(obj.x, obj.y, obj.width || 50, obj.height || 50);
            }
        }
        
        this.ctx.restore();
    }
};

window.Canvas = Canvas;
console.log('✅ Canvas.js загружен');