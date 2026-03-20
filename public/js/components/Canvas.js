const Canvas = {
    canvas: null,
    ctx: null,
    objects: [],
    currentTool: 'select',
    
    // Временные данные для рисования
    isDrawing: false,
    startX: 0,
    startY: 0,
    tempObject: null,
    
    // Выделенный объект
    selectedObject: null,

    init(canvasElement) {
        console.log('Canvas init');
        
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        
        // Размеры
        this.canvas.width = 1600;
        this.canvas.height = 900;
        
        // ТЕСТОВЫЕ ОБЪЕКТЫ
        this.objects = [
            { type: 'rectangle', x: 100, y: 100, width: 50, height: 50, color: '#ff0000' },
        ];
        
        // Обработчики событий мыши
        this.canvas.onmousedown = (e) => this.handleMouseDown(e);
        this.canvas.onmousemove = (e) => this.handleMouseMove(e);
        this.canvas.onmouseup = (e) => this.handleMouseUp(e);
        this.canvas.onmouseleave = () => this.handleMouseLeave();
        
        // Обработчик клавиатуры для удаления
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        this.draw();
    },

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Пересчет в координаты canvas
        const canvasX = (x / rect.width) * 1600;
        const canvasY = (y / rect.height) * 900;
        
        console.log('Mouse down:', canvasX, canvasY, 'Инструмент:', this.currentTool);
        
        if (this.currentTool === 'select') {
            // Логика выделения
            this.selectObject(canvasX, canvasY);
        } else {
            // Снимаем выделение при использовании другого инструмента
            this.selectedObject = null;
            
            // Начинаем рисование
            this.isDrawing = true;
            this.startX = canvasX;
            this.startY = canvasY;
            
            // Для линий и других инструментов, где нужен временный объект
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
                // Загрузка изображения
                this.loadImage(canvasX, canvasY);
                this.isDrawing = false;
            } else if (this.currentTool === 'text') {
                // Для текста
                const text = prompt('Введите текст:', 'Текст');
                if (text) {
                    this.objects.push({
                        type: 'text',
                        x: canvasX,
                        y: canvasY,
                        text: text,
                        color: '#8b5cf6',
                        fontSize: 20
                    });
                }
                this.isDrawing = false;
                this.draw();
            }
        }
    },

    loadImage(x, y) {
        // Создаем кастомный диалог для загрузки изображения
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
        
        // Обработчики
        document.getElementById('cancelImageBtn').onclick = () => {
            document.body.removeChild(modal);
        };
        
        document.getElementById('uploadImageBtn').onclick = () => {
            const fileInput = document.getElementById('imageFileInput');
            const urlInput = document.getElementById('imageUrlInput');
            const sizeSelect = document.getElementById('imageSizeSelect');
            
            const processImage = (img) => {
                // Определяем размер
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
                    // Оригинальный размер, но не больше 400px
                    width = Math.min(400, img.width);
                    height = (img.height / img.width) * width;
                }
                
                this.objects.push({
                    type: 'image',
                    x: x - width/2,
                    y: y - height/2,
                    width: width,
                    height: height,
                    src: img.src,
                    img: img
                });
                
                this.draw();
                document.body.removeChild(modal);
            };
            
            if (fileInput.files.length > 0) {
                // Загрузка из файла
                const file = fileInput.files[0];
                const reader = new FileReader();
                
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => processImage(img);
                    img.src = event.target.result;
                };
                
                reader.readAsDataURL(file);
                
            } else if (urlInput.value) {
                // Загрузка по URL
                const img = new Image();
                img.crossOrigin = 'anonymous';
                
                img.onload = () => processImage(img);
                img.onerror = () => {
                    alert('Не удалось загрузить изображение по указанному URL');
                };
                
                img.src = urlInput.value;
                
            } else {
                alert('Выберите файл или укажите URL изображения');
            }
        };
    },

    handleMouseMove(e) {
        if (!this.isDrawing || !this.tempObject) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Пересчет в координаты canvas
        const canvasX = (x / rect.width) * 1600;
        const canvasY = (y / rect.height) * 900;
        
        // Обновляем временный объект в зависимости от инструмента
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
            
            // Корректируем позицию для отрицательных размеров
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

    handleMouseUp(e) {
        if (!this.isDrawing) return;
        
        console.log('Mouse up, добавление объекта:', this.tempObject);
        
        // Добавляем временный объект в постоянные
        if (this.tempObject) {
            this.objects.push({...this.tempObject});
            this.tempObject = null;
        }
        
        this.isDrawing = false;
        this.draw();
    },

    handleMouseLeave() {
        // Отменяем рисование при выходе мыши за пределы canvas
        if (this.isDrawing) {
            this.isDrawing = false;
            this.tempObject = null;
            this.draw();
        }
    },

    handleKeyDown(e) {
        // Удаление по клавише Delete или Backspace
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedObject) {
            e.preventDefault(); // Предотвращаем навигацию браузера
            this.deleteSelectedObject();
        }
    },

    selectObject(x, y) {
        // Сбрасываем предыдущее выделение
        this.selectedObject = null;
        
        // Ищем объект под курсором (с конца, чтобы выделять верхние)
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
                    // Простая проверка для линии (можно улучшить)
                    const lineX1 = obj.x1, lineY1 = obj.y1;
                    const lineX2 = obj.x2, lineY2 = obj.y2;
                    
                    // Вычисляем расстояние от точки до линии
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
                    hit = distanceToLine < 10; // Допуск 10 пикселей
                    break;
                    
                case 'text':
                    // Приблизительная проверка для текста
                    const textWidth = obj.text.length * (obj.fontSize || 20) * 0.6;
                    const textHeight = (obj.fontSize || 20);
                    hit = x >= obj.x && x <= obj.x + textWidth && 
                          y >= obj.y - textHeight && y <= obj.y;
                    break;
            }
            
            if (hit) {
                this.selectedObject = obj;
                console.log('Объект выбран:', obj);
                this.draw();
                return;
            }
        }
        
        console.log('Ничего не выбрано');
        this.draw();
    },

    deleteSelectedObject() {
        if (this.selectedObject) {
            const index = this.objects.indexOf(this.selectedObject);
            if (index > -1) {
                this.objects.splice(index, 1);
                this.selectedObject = null;
                this.draw();
                console.log('Объект удален');
            }
        }
    },

    setTool(tool) {
        console.log('Инструмент:', tool);
        this.currentTool = tool;
        this.isDrawing = false;
        this.tempObject = null;
        this.selectedObject = null; // Снимаем выделение при смене инструмента
        this.draw();
    },

    draw() {
        if (!this.ctx) return;
        
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
        
        // Временный объект (при рисовании)
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
        
        // Информация о выделении
        if (this.selectedObject) {
            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = '16px Arial';
            this.ctx.fillText('✓ Объект выбран (Del для удаления)', 20, 60);
        }
    },

    drawObject(obj) {
        if (obj.type === 'image' && obj.img) {
            // Рисуем изображение
            this.ctx.drawImage(obj.img, obj.x, obj.y, obj.width, obj.height);
            
            // Рисуем рамку
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
                    // Заглушка для изображения без загруженного img
                    this.ctx.fillStyle = obj.color || '#8b5cf6';
                    this.ctx.fillRect(obj.x, obj.y, obj.width || 50, obj.height || 50);
                    this.ctx.strokeRect(obj.x, obj.y, obj.width || 50, obj.height || 50);
                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = '20px Arial';
                    this.ctx.fillText('🖼️', obj.x + (obj.width || 50)/2 - 10, obj.y + (obj.height || 50)/2 + 5);
                    break;
                    
                default:
                    // Для обратной совместимости
                    this.ctx.fillRect(obj.x, obj.y, 50, 50);
                    this.ctx.strokeRect(obj.x, obj.y, 50, 50);
            }
        }
    }
};

window.Canvas = Canvas;