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

    init(canvasElement, boardId, initialObjects = []) {
        console.log('Canvas init for board:', boardId);
        
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.boardId = boardId;
        
        // Размеры
        this.canvas.width = 1600;
        this.canvas.height = 900;
        
        // Загружаем начальные объекты (из Board.data)
        this.loadInitialObjects(initialObjects);
        
        // Обработчики событий мыши
        this.canvas.onmousedown = (e) => this.handleMouseDown(e);
        this.canvas.onmousemove = (e) => this.handleMouseMove(e);
        this.canvas.onmouseup = (e) => this.handleMouseUp(e);
        this.canvas.onmouseleave = () => this.handleMouseLeave();
        
        // Обработчик клавиатуры для удаления
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        this.draw();
    },

    // Загрузка начальных объектов (из ответа сервера)
    loadInitialObjects(initialObjects) {
        try {
            console.log('Loading initial objects:', initialObjects);
            
            if (!initialObjects || initialObjects.length === 0) {
                console.log('No objects to load');
                this.objects = [];
                return;
            }
            
            this.objects = initialObjects.map(dbObj => {
                // Парсим content если это строка
                let content = dbObj.content;
                if (typeof content === 'string') {
                    try {
                        content = JSON.parse(content);
                    } catch (e) {
                        console.error('Error parsing content:', e);
                        content = {};
                    }
                }
                
                const canvasObj = {
                    id: dbObj.id,
                    type: dbObj.type,
                    ...content,
                    x: dbObj.position_x,
                    y: dbObj.position_y,
                    width: dbObj.width,
                    height: dbObj.height,
                    rotation: dbObj.rotation
                };
                
                // Для изображений загружаем картинку
                if (dbObj.type === 'image' && content.src) {
                    const img = new Image();
                    img.src = content.src;
                    canvasObj.img = img;
                }
                
                return canvasObj;
            });
            
            console.log('Processed objects:', this.objects);
            this.draw();
        } catch (error) {
            console.error('Error loading initial objects:', error);
        }
    },

    // Сохранение нового объекта на сервер
    async saveObject(object) {
        if (!this.boardId) return null;
        
        try {
            console.log('Saving object to board:', this.boardId, object);
            
            // Подготавливаем данные для БД
            const dbObject = {
                type: object.type,
                content: this.prepareContent(object),
                position_x: Math.round(object.x || 0),
                position_y: Math.round(object.y || 0),
                width: object.width || null,
                height: object.height || null,
                rotation: object.rotation || 0
            };
            
            const response = await API.boards.createBoardObject(this.boardId, dbObject);
            
            if (response && response.object) {
                object.id = response.object.id;
                console.log('Object saved with ID:', object.id);
            }
            
            return response;
        } catch (error) {
            console.error('Error saving object:', error);
            return null;
        }
    },

    // Обновление существующего объекта
    async updateObject(object) {
        if (!this.boardId || !object.id) return;
        
        try {
            console.log('Updating object:', object.id);
            
            const dbObject = {
                type: object.type,
                content: this.prepareContent(object),
                position_x: Math.round(object.x || 0),
                position_y: Math.round(object.y || 0),
                width: object.width || null,
                height: object.height || null,
                rotation: object.rotation || 0
            };
            
            await API.boards.updateBoardObject(this.boardId, object.id, dbObject);
        } catch (error) {
            console.error('Error updating object:', error);
        }
    },

    // Удаление объекта
    async deleteObject(objectId) {
        if (!this.boardId || !objectId) return;
        
        try {
            console.log('Deleting object:', objectId);
            await API.boards.deleteBoardObject(this.boardId, objectId);
        } catch (error) {
            console.error('Error deleting object:', error);
        }
    },

    // Подготовка content для сохранения в JSONB
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
        
        console.log('Mouse down:', canvasX, canvasY, 'Инструмент:', this.currentTool);
        
        if (this.currentTool === 'select') {
            this.selectObject(canvasX, canvasY);
        } else {
            this.selectedObject = null;
            this.selectedObjectId = null;
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
                        fontSize: 20
                    };
                    
                    // Сохраняем на сервер и добавляем в массив
                    this.saveObject(newObject).then(() => {
                        this.objects.push(newObject);
                        this.draw();
                    });
                }
                this.isDrawing = false;
            }
        }
    },

    handleMouseMove(e) {
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

    async handleMouseUp(e) {
        if (!this.isDrawing) return;
        
        console.log('Mouse up, добавление объекта:', this.tempObject);
        
        if (this.tempObject) {
            const newObject = {...this.tempObject};
            
            // Сохраняем на сервер и добавляем в массив
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
    },

    async handleKeyDown(e) {
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedObject) {
            e.preventDefault();
            
            // Удаляем с сервера
            if (this.selectedObject.id) {
                await this.deleteObject(this.selectedObject.id);
            }
            
            // Удаляем из массива
            const index = this.objects.indexOf(this.selectedObject);
            if (index > -1) {
                this.objects.splice(index, 1);
            }
            
            this.selectedObject = null;
            this.selectedObjectId = null;
            this.draw();
        }
    },

    selectObject(x, y) {
        this.selectedObject = null;
        this.selectedObjectId = null;
        
        // Ищем объект под курсором (с конца)
        for (let i = this.objects.length - 1; i >= 0; i--) {
            const obj = this.objects[i];
            
            let hit = false;
            
            switch(obj.type) {
                case 'rectangle':
                case 'image':
                    hit = x >= obj.x && x <= obj.x + (obj.width || 50) && 
                          y >= obj.y && y <= obj.y + (obj.height || 50);
                    break;
                    
                case 'circle':
                    const dx = x - obj.x;
                    const dy = y - obj.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    hit = distance <= (obj.radius || 25);
                    break;
                    
                case 'line':
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
                    break;
                    
                case 'text':
                    const textWidth = obj.text.length * (obj.fontSize || 20) * 0.6;
                    const textHeight = (obj.fontSize || 20);
                    hit = x >= obj.x && x <= obj.x + textWidth && 
                          y >= obj.y - textHeight && y <= obj.y;
                    break;
            }
            
            if (hit) {
                this.selectedObject = obj;
                this.selectedObjectId = obj.id;
                console.log('Объект выбран:', obj);
                this.draw();
                return;
            }
        }
        
        console.log('Ничего не выбрано');
        this.draw();
    },

    loadImage(x, y) {
        // Модальное окно для загрузки изображения
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
            <div style="
                background: white;
                padding: 20px;
                border-radius: 8px;
                width: 400px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            ">
                <h3 style="margin-top: 0; margin-bottom: 20px;">Загрузить изображение</h3>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Выберите файл:</label>
                    <input type="file" id="imageFileInput" accept="image/*" style="width: 100%; padding: 5px;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Или укажите URL:</label>
                    <input type="url" id="imageUrlInput" placeholder="https://example.com/image.jpg" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Размер:</label>
                    <select id="imageSizeSelect" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="small">Маленький (100px)</option>
                        <option value="medium" selected>Средний (200px)</option>
                        <option value="large">Большой (300px)</option>
                        <option value="original">Оригинальный размер</option>
                    </select>
                </div>
                
                <div style="text-align: right;">
                    <button id="cancelImageBtn" style="
                        padding: 8px 16px;
                        margin-right: 10px;
                        background: #6c757d;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                    ">Отмена</button>
                    <button id="uploadImageBtn" style="
                        padding: 8px 16px;
                        background: #8b5cf6;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                    ">Загрузить</button>
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
            const sizeSelect = document.getElementById('imageSizeSelect');
            
            const processImage = (img) => {
                let width, height;
                const selectedSize = sizeSelect.value;
                
                if (selectedSize === 'small') {
                    width = 100;
                    height = (img.height / img.width) * width;
                } else if (selectedSize === 'medium') {
                    width = 200;
                    height = (img.height / img.width) * width;
                } else if (selectedSize === 'large') {
                    width = 300;
                    height = (img.height / img.width) * width;
                } else {
                    width = Math.min(400, img.width);
                    height = (img.height / img.width) * width;
                }
                
                const newObject = {
                    type: 'image',
                    x: Math.round(x - width/2),
                    y: Math.round(y - height/2),
                    width: Math.round(width),
                    height: Math.round(height),
                    src: img.src,
                    img: img,
                    color: '#8b5cf6'
                };
                
                // Сохраняем на сервер и добавляем в массив
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
                    img.onload = () => processImage.call(this, img);
                    img.src = event.target.result;
                };
                
                reader.readAsDataURL(file);
                
            } else if (urlInput.value) {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                
                img.onload = () => processImage.call(this, img);
                img.onerror = () => {
                    alert('Не удалось загрузить изображение по указанному URL');
                };
                
                img.src = urlInput.value;
                
            } else {
                alert('Выберите файл или укажите URL изображения');
            }
        };
    },

    setTool(tool) {
        console.log('Инструмент:', tool);
        this.currentTool = tool;
        this.isDrawing = false;
        this.tempObject = null;
        this.selectedObject = null;
        this.selectedObjectId = null;
        this.draw();
    },

    draw() {
        if (!this.ctx) return;
        
        console.log('Drawing canvas, objects:', this.objects.length);
        
        // Очистка
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
        
        // Постоянные объекты
        this.objects.forEach(obj => {
            this.drawObject(obj);
        });
        
        // Временный объект
        if (this.tempObject) {
            this.ctx.globalAlpha = 0.5;
            this.drawObject(this.tempObject);
            this.ctx.globalAlpha = 1.0;
        }
        
        // Подсветка выделенного объекта
        if (this.selectedObject) {
            this.ctx.save();
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([5, 5]);
            
            const obj = this.selectedObject;
            switch(obj.type) {
                case 'rectangle':
                case 'image':
                    this.ctx.strokeRect(obj.x - 2, obj.y - 2, (obj.width || 50) + 4, (obj.height || 50) + 4);
                    break;
                case 'circle':
                    this.ctx.beginPath();
                    this.ctx.arc(obj.x, obj.y, (obj.radius || 25) + 4, 0, Math.PI * 2);
                    this.ctx.stroke();
                    break;
                case 'line':
                    this.ctx.beginPath();
                    this.ctx.moveTo(obj.x1, obj.y1);
                    this.ctx.lineTo(obj.x2, obj.y2);
                    this.ctx.stroke();
                    break;
                case 'text':
                    const textWidth = obj.text.length * (obj.fontSize || 20) * 0.6;
                    const textHeight = (obj.fontSize || 20);
                    this.ctx.strokeRect(obj.x - 2, obj.y - textHeight - 2, textWidth + 4, textHeight + 4);
                    break;
            }
            
            this.ctx.restore();
        }
        
        // Инструмент
        this.ctx.fillStyle = '#000';
        this.ctx.font = '20px Arial';
        this.ctx.fillText('Tool: ' + this.currentTool, 20, 30);
        
        if (this.selectedObject) {
            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = '16px Arial';
            this.ctx.fillText('✓ Объект выбран (Del для удаления)', 20, 60);
        }
    },

    drawObject(obj) {
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
                    this.ctx.fillRect(obj.x, obj.y, obj.width || 50, obj.height || 50);
                    this.ctx.strokeRect(obj.x, obj.y, obj.width || 50, obj.height || 50);
                    break;
                    
                case 'circle':
                    this.ctx.beginPath();
                    this.ctx.arc(obj.x, obj.y, obj.radius || 25, 0, Math.PI * 2);
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
                    
                case 'image':
                    this.ctx.fillStyle = obj.color || '#8b5cf6';
                    this.ctx.fillRect(obj.x, obj.y, obj.width || 50, obj.height || 50);
                    this.ctx.strokeRect(obj.x, obj.y, obj.width || 50, obj.height || 50);
                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = '20px Arial';
                    this.ctx.fillText('🖼️', obj.x + (obj.width || 50)/2 - 10, obj.y + (obj.height || 50)/2 + 5);
                    break;
                    
                default:
                    this.ctx.fillRect(obj.x, obj.y, 50, 50);
                    this.ctx.strokeRect(obj.x, obj.y, 50, 50);
            }
        }
    }
};

window.Canvas = Canvas;
console.log('✅ Canvas.js загружен');