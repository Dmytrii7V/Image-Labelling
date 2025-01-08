const { createApp } = Vue;

createApp({
	data() {
		return {
			images: [
				{ id: 1, src: 'img/1.jpg', selected: false },
				{ id: 2, src: 'img/2.jpg', selected: false },
				{ id: 3, src: 'img/3.jpg', selected: false },
				{ id: 4, src: 'img/4.jpg', selected: false },
				{ id: 5, src: 'img/5.jpg', selected: false },
				{ id: 6, src: 'img/6.jpg', selected: false },
				{ id: 7, src: 'img/7.jpg', selected: false },
				{ id: 8, src: 'img/8.jpg', selected: false },
				{ id: 9, src: 'img/9.jpg', selected: false },
				{ id: 10, src: 'img/10.jpg', selected: false },
				{ id: 11, src: 'img/11.jpg', selected: false },
				{ id: 12, src: 'img/12.jpg', selected: false }
			],
			selectedIds: [],
		
			scaleCurr: 1,
			imgCurr: "img/1.jpg",
			pointFillStyleCurr: '#000',
			bgFillStyleCurr: 'rgba(0,0,0,0.2)',
			selectedColor: '#000000',
			cat: '0',
			points: [],
			isDragging: false,
			cancelPointAdd: false,
			offset: { x: 0, y: 0 },
			selectedPoint: null,
			isClickOnFirstPointTrue: false,
			squares: [],
			startPoint: null,
			selectedSquareIndex: -1,
			dragPoint: null,
			currentDrawType: 1, // 1 - polygon, 2 - rectangle
			canvas: null,
			ctx: null,
			img: undefined,
			localData: [],
			localCat: [],
			imgIdCurr: 1,
			markEdit: {},
			editNameIndex: null,
			initialPoints: null,
		};
	},
	computed: {
		filteredImages() {
		  return this.images.filter(img => this.selectedIds.includes(img.id));
		}
	},
	mounted() {
		this.removeLogo();
		
		this.canvas = document.getElementById('myCanvas');
		this.ctx = this.canvas.getContext('2d');

		this.canvas.addEventListener('click', this.handleCanvasClick);
		this.canvas.addEventListener('mousedown', this.handleMouseDown);
		this.canvas.addEventListener('mousemove', this.handleMouseMove);
		this.canvas.addEventListener('mouseup', this.handleMouseUp);
		
		/*
		this.loadImg(this.imgCurr);
		this.getLocalData();
		this.domUpdate();
		*/
	},
	methods: {
		handleCanvasClick(event) {
			if (this.cat === 0) {
				alert('Select category');
				return;
			}

			this.initialPoints = null;
			
			if (this.currentDrawType === 1) {
				const rect = this.canvas.getBoundingClientRect();
				const x = event.clientX - rect.left;
				const y = event.clientY - rect.top;

				const clickedPoint = { x, y };
				const existingPoint = this.points.find(point => this.isCloseEnough(point, clickedPoint));

				this.isClickOnFirstPoint(event);

				if (existingPoint) {
					this.closePolygon();
				} else {
					if (!this.cancelPointAdd) {
					if (this.points.length > 0) {
						const lastPoint = this.points[this.points.length - 1];
						this.drawLine(lastPoint.x, lastPoint.y, x, y);
					}

					this.points.push(clickedPoint);
					this.drawPoint(x, y);
					} else {
						this.cancelPointAdd = false;
					}
				}

				this.fillPolygon();

				if (this.isClickOnFirstPointTrue) {
					this.saveFigure();
				}
			}

			if (this.currentDrawType === 2 && this.squares.length > 0) {
				this.saveFigure();
			}
		},
		
		handleMouseDown(event) {
			if (this.cat === 0) {
				alert('Select category');
				return;
			}

			const rect = this.canvas.getBoundingClientRect();
			const x = event.clientX - rect.left;
			const y = event.clientY - rect.top;

			if (this.currentDrawType === 1) {
				this.selectedPoint = this.findClickedPoint({ x, y });
				if (this.selectedPoint === undefined) {
					this.offset.x = x;
					this.offset.y = y;
					this.isDragging = true;
				}
			}

			if (this.currentDrawType === 2) {
				this.isDragging = false;
				this.selectedSquareIndex = -1;

				this.squares.forEach((square, index) => {
					if (
						x >= square.start.x &&
						x <= square.end.x &&
						y >= square.start.y &&
						y <= square.end.y
					){
						this.selectedSquareIndex = index;
						this.dragPoint = { x, y };
						this.isDragging = true;
						return;
					}
				});

				if (!this.isDragging) {
					if (!this.startPoint) {
						this.startPoint = { x, y };
						this.drawDot(x, y);
					} else {
						const endPoint = { x, y };
						this.squares.push({
							start: this.startPoint,
							end: endPoint,
							color: this.bgFillStyleCurr,
							category: this.cat
						});
						
						this.drawSquares();
						this.startPoint = null;
					}
				}
			}
		},

		handleMouseMove(event) {
			const rect = this.canvas.getBoundingClientRect();
			const mouseX = event.clientX - rect.left;
			const mouseY = event.clientY - rect.top;

			if (this.currentDrawType === 1) {
				if (this.isDragging) {
					const dx = mouseX - this.offset.x;
					const dy = mouseY - this.offset.y;

					this.points.forEach(point => {
						point.x += dx;
						point.y += dy;
					});

					this.offset.x = mouseX;
					this.offset.y = mouseY;

					this.drawCanvas();
					this.closePolygon();
					this.localData.forEach(shape => this.drawShapeFromPoints(shape));
					this.cancelPointAdd = true;
				} else if (this.selectedPoint !== null) {
					this.selectedPoint.x = mouseX;
					this.selectedPoint.y = mouseY;

					this.drawCanvas();
					this.localData.forEach(shape => this.drawShapeFromPoints(shape));
				}
			}

			if (this.currentDrawType === 2) {
				if (this.isDragging && this.selectedSquareIndex !== -1) {
					const dx = mouseX - this.dragPoint.x;
					const dy = mouseY - this.dragPoint.y;

					this.squares[this.selectedSquareIndex].end.x += dx;
					this.squares[this.selectedSquareIndex].end.y += dy;

					this.dragPoint = { x: mouseX, y: mouseY };
					this.drawCanvas();
					this.localData.forEach(shape => this.drawShapeFromPoints(shape));
				} else if (this.startPoint) {
					const endPoint = { x: mouseX, y: mouseY };
					this.drawCanvas();
					this.drawRectangle(this.startPoint, endPoint);
					this.localData.forEach(shape => this.drawShapeFromPoints(shape));
				}
			}
		},

		handleMouseUp() {
			if (this.currentDrawType === 1) {
				this.selectedPoint = null;
				this.isDragging = false;
			}

			if (this.currentDrawType === 2) {
				if (this.isDragging) {
					this.isDragging = false;
					this.selectedSquareIndex = -1;
					this.dragPoint = null;
				}
			}
		},
	
		
		
		
		
		drawDot(x, y) {
			this.ctx.beginPath();
			this.ctx.arc(x, y, 3, 0, 2 * Math.PI);
			this.ctx.fillStyle = '#ccc';
			this.ctx.fill();
			this.ctx.closePath();
		},

		drawRectangle(start, end, color) {
			const width = end.x - start.x;
			const height = end.y - start.y;

			this.ctx.beginPath();
			this.ctx.rect(start.x, start.y, width, height);
			this.ctx.strokeStyle = '#ccc';
			this.ctx.stroke();
			this.ctx.fillStyle = color || this.bgFillStyleCurr;
			this.ctx.fillRect(start.x, start.y, width, height);
			this.ctx.closePath();
		},

		drawScaleRectangle(start, end, color) {
			const scaledStartX = start.x * this.scaleCurr;
			const scaledStartY = start.y * this.scaleCurr;
			const scaledEndX = end.x * this.scaleCurr;
			const scaledEndY = end.y * this.scaleCurr;

			const width = scaledEndX - scaledStartX;
			const height = scaledEndY - scaledStartY;

			this.ctx.beginPath();
			this.ctx.rect(scaledStartX, scaledStartY, width, height);
			this.ctx.strokeStyle = '#ccc';
			this.ctx.stroke();
			this.ctx.fillStyle = color || this.bgFillStyleCurr;
			this.ctx.fillRect(scaledStartX, scaledStartY, width, height);
			this.ctx.closePath();
		},
		
		drawSquares() {
			this.squares.forEach(square => {
				this.drawRectangle(square.start, square.end, square.color);
			});
		},

		drawCanvas() {
			this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
			this.ctx.drawImage(this.img, 0, 0, this.canvas.width, this.canvas.height);

			for (let i = 0; i < this.points.length - 1; i++) {
				this.drawLine(this.points[i].x, this.points[i].y, this.points[i + 1].x, this.points[i + 1].y);
			}
			this.drawPoints();

			//
			this.drawSquares();
		},

		drawPoints() {
			for (const point of this.points) {
				this.drawPoint(point.x, point.y);
			}
		},

		drawPoint(x, y) {
			this.ctx.fillStyle = this.pointFillStyleCurr;
			this.ctx.beginPath();
			this.ctx.arc(x, y, 5, 0, 2 * Math.PI);
			this.ctx.fill();
		},
		
		drawLine(x1, y1, x2, y2) {
			this.ctx.strokeStyle = this.pointFillStyleCurr;
			this.ctx.beginPath();
			this.ctx.moveTo(x1, y1);
			this.ctx.lineTo(x2, y2);
			this.ctx.stroke();
		},
		
		drawShapeFromPoints(dataObj) {
			let points, pointFillLoc, bgFillLoc;
			
			if(dataObj.type == 1){
				points = dataObj.points;
				
				pointFillLoc = dataObj.color.point;
				bgFillLoc = dataObj.color.bg;
				
				this.ctx.beginPath();
				this.ctx.moveTo(points[0].x * this.scaleCurr, points[0].y * this.scaleCurr);
				for (let i = 1; i < points.length; i++) {
					this.ctx.lineTo(points[i].x * this.scaleCurr, points[i].y * this.scaleCurr);
				}
				this.ctx.closePath();
				this.ctx.strokeStyle = pointFillLoc;
				this.ctx.stroke();

				this.ctx.fillStyle = bgFillLoc;
				this.ctx.fill();

				for (let i = 0; i < points.length; i++) {
					this.ctx.beginPath();
					this.ctx.arc(points[i].x * this.scaleCurr, points[i].y * this.scaleCurr, 5, 0, Math.PI * 2);
					this.ctx.fillStyle = pointFillLoc;
					this.ctx.fill();
				}
			}

			if(dataObj.type == 2){
				points = dataObj.squares;
				
				this.pointFillLoc = dataObj.color.point;
				this.bgFillLoc = dataObj.color.bg;
				
				points.forEach(square => {
					this.drawScaleRectangle(square.start, square.end, square.color);
				});
			}

		},

		isCloseEnough(point1, point2) {
			const distance = Math.sqrt(
			(point1.x - point2.x) ** 2 + (point1.y - point2.y) ** 2
			);
			return distance < 10;
		},
		
		findClickedPoint(clickedPoint) {
			return this.points.find(point => this.isCloseEnough(point, clickedPoint));
		},
		
		isClickOnFirstPoint(event) {
			const rect = this.canvas.getBoundingClientRect();
			const clickX = event.clientX - rect.left;
			const clickY = event.clientY - rect.top;

			if (this.points.length < 1) {
				return false; 
			}

			const firstPoint = this.points[0];
			const distance = Math.sqrt((clickX - firstPoint.x) ** 2 + (clickY - firstPoint.y) ** 2);

			if( distance < 10 ){
				this.isClickOnFirstPointTrue = true;
			}
		},
		
		closePolygon() {
			if (this.points.length >= 3 && this.isClickOnFirstPointTrue == true) {
				const firstPoint = this.points[0];
				const lastPoint = this.points[this.points.length - 1];
				this.drawLine(lastPoint.x, lastPoint.y, firstPoint.x, firstPoint.y);
				
				
				this.ctx.beginPath();
				this.ctx.moveTo(this.points[0].x, this.points[0].y);
				for (let i = 1; i < this.points.length; i++) {
					this.ctx.lineTo(this.points[i].x, this.points[i].y);
				}
			}
		},
		
		fillPolygon() {
			if (this.points.length >= 3) {
				this.ctx.fillStyle = this.bgFillStyleCurr;
				this.ctx.fill();
				this.ctx.closePath();
			}
		},
		
		toOriginalScale(points, scaleCurr) {
			return points.map(point => {
				return {
					x: point.x / scaleCurr,
					y: point.y / scaleCurr
				};
			});
		},

		toOriginalScaleSquare(squares, scaleCurr) {
			return squares.map(square => {
				return {
					start: {
						x: square.start.x / scaleCurr,
						y: square.start.y / scaleCurr
					},
					end: {
						x: square.end.x / scaleCurr,
						y: square.end.y / scaleCurr
					},
					color: square.color,
					category: square.category
				};
			});
		},
		
		
		
		adjustScalePoints(points, initialPoints, scaleCurr) {
			return points.map((point, index) => {
				return {
					x: initialPoints[index].x * scaleCurr,
					y: initialPoints[index].y * scaleCurr
				};
			});
		},

		adjustScaleSquares(squares, initialSquares, scaleCurr) {
			return squares.map((square, index) => {
				return {
					start: {
						x: initialSquares[index].start.x * scaleCurr,
						y: initialSquares[index].start.y * scaleCurr
					},
					end: {
						x: initialSquares[index].end.x * scaleCurr,
						y: initialSquares[index].end.y * scaleCurr
					},
					color: square.color,
					category: square.category
				};
			});
		},


		toScaledPoints(points, scaleCurr) {
			return points.map(point => {
				return {
					x: point.x * scaleCurr,
					y: point.y * scaleCurr
				};
			});
		},

		toScaledSquares(squares, scaleCurr) {
			return squares.map(square => {
				return {
					start: {
						x: square.start.x * scaleCurr,
						y: square.start.y * scaleCurr
					},
					end: {
						x: square.end.x * scaleCurr,
						y: square.end.y * scaleCurr
					},
					color: square.color,
					category: square.category
				};
			});
		},
		
		
		saveFigure() {
			let obj = {
				color: {}
			};
			
			
			obj.color.point = this.pointFillStyleCurr;
			obj.color.bg = this.bgFillStyleCurr;
			obj.cat = this.cat;
			
			
			if( this.currentDrawType == 1 ){
				obj.type = 1;
				obj.name = 'polyhedron';
				obj.points = this.points.slice();
				obj.points = this.toOriginalScale(obj.points, this.scaleCurr);
			}else if( this.currentDrawType == 2 ){
				obj.type = 2;
				obj.name = 'square';
				obj.squares = this.squares.slice();
				obj.squares = this.toOriginalScaleSquare(obj.squares, this.scaleCurr);
			}
			
			if( this.markEdit.name ){
				obj.name = this.markEdit.name;
			}
			
			
			this.points.length = 0;
			this.squares.length = 0;
			
			this.localData.push(obj);

			let j = JSON.stringify(this.localData);
			localStorage.setItem(this.imgIdCurr, j);

			this.domUpdate();
			
			this.markEdit = {};
			this.isClickOnFirstPointTrue = false;
		},
		
		redrawSizeChange() {
			this.ctx.clearRect(0, 0, this.canvas.width * this.scaleCurr, this.canvas.height * this.scaleCurr);

			
			let newWidth = this.img.width * this.scaleCurr;
			let newHeight = this.img.height * this.scaleCurr;

			this.canvas.width = newWidth;
			this.canvas.height = newHeight;

			this.ctx.drawImage(this.img, 0, 0, newWidth, newHeight);

			//label
			for (let i = 0; i < this.points.length - 1; i++) {
				this.drawLine(this.points[i].x, this.points[i].y, this.points[i + 1].x, this.points[i + 1].y);
			}
			this.drawPoints();
			this.drawSquares();
			
			this.localData.forEach((currentValue) => {
				this.drawShapeFromPoints(currentValue);
			});
		},
		

		
		domUpdate() {
			this.$refs.list.innerHTML = '';

			// Додаємо категорії та елементи
			this.localCat.forEach((currValue) => {
				// Додаємо категорії
				const categoryElement = document.createElement('div');
				categoryElement.className = 'cat-name';
				categoryElement.textContent = currValue;

				// Додаємо обробник кліку для категорії
				categoryElement.addEventListener('click', (event) => {
					this.setActiveCategory(currValue, event.target);
				});

				this.$refs.list.appendChild(categoryElement);
				
				// Додаємо елементи для категорії
				this.localData.forEach((currentValue, index) => {
					if (currValue === currentValue.cat) {
						const itemElement = document.createElement('div');
						itemElement.className = 'item';

						const numElement = document.createElement('p');
						numElement.className = 'num';
						numElement.textContent = index + 1;

						const nameElement = document.createElement('p');
						nameElement.className = 'name';
						nameElement.textContent = currentValue.name;
						
						nameElement.addEventListener('click', (event) => {
							document.querySelector(".hidden").style.display = "flex";
							document.querySelector(".hidden .name-change").style.display = "flex";
							document.querySelector(".hidden .json-data").style.display = "none";
							this.editNameIndex = index;
						});

						const btnsElement = document.createElement('div');
						btnsElement.className = 'btns';

						const editButton = document.createElement('img');
						editButton.className = 'edit';
						editButton.src = 'img/e.png';
						// Додаємо data для типу
						editButton.dataset.type = currentValue.type;
						editButton.addEventListener('click', () => {
							this.editItem(index, currentValue.type);
						});

						const deleteButton = document.createElement('img');
						deleteButton.className = 'del';
						deleteButton.src = 'img/d.png';
						deleteButton.addEventListener('click', () => {
							this.deleteItem(index);
						});

						btnsElement.appendChild(editButton);
						btnsElement.appendChild(deleteButton);

						itemElement.appendChild(numElement);
						itemElement.appendChild(nameElement);
						itemElement.appendChild(btnsElement);

						this.$refs.list.appendChild(itemElement);
					}
				});
			});

			const catElements = this.$refs.list.querySelectorAll('.cat-name');
			catElements.forEach((element) => {
				if (element.textContent === this.cat) {
					element.classList.add('active');
				}
			});
		},
		
		nameChange() {
			this.localData[this.editNameIndex].name = this.newName;

			const jsonData = JSON.stringify(this.localData);
			localStorage.setItem(this.imgIdCurr, jsonData);

			this.loadImg(this.imgCurr);

			this.domUpdate();

			this.newName = '';
			document.querySelector(".name-change .value").value = '';
			this.hiddenBlockClose();
		},
		
		setActiveCategory(category, element) {
			this.cat = category;

			const allCategories = this.$refs.list.querySelectorAll('.cat-name');
			allCategories.forEach((catElement) => {
			  catElement.classList.remove('active');
			});

			element.classList.add('active');
		},
		
		
		editItem(itemId, itemType) {
			
			if (this.markEdit.length > 0) {
				alert('Editing is active');
				return;
			}
			if( this.points.length > 0 || this.squares.length > 0 ){
				alert('Finish drawing before editing');
				return;
			}
			if (this.currentDrawType === 1 && itemType === 2) {
				alert('Switch to working with Square');
				return;
			}

			if (this.currentDrawType === 2 && itemType === 1) {
				alert('Switch to working with Polyhedron');
				return;
			}

			// Логіка для редагування Polyhedron
			if (this.currentDrawType === 1) {
				this.markEdit = this.localData.splice(itemId, 1)[0];
				this.pointFillStyleCurr = this.markEdit.color.point;
				this.bgFillStyleCurr = this.markEdit.color.bg;
				this.points = this.toScaledPoints(this.markEdit.points, this.scaleCurr);
				this.cat = this.markEdit.cat;
				this.isClickOnFirstPointTrue = false;
			}

			// Логіка для редагування Square
			if (this.currentDrawType === 2) {
				this.markEdit = this.localData.splice(itemId, 1)[0];
				this.pointFillStyleCurr = this.markEdit.color.bg;
				this.bgFillStyleCurr = this.markEdit.color.bg;
				this.squares = this.toScaledSquares(this.markEdit.squares, this.scaleCurr);
				this.cat = this.markEdit.cat;
				this.isClickOnFirstPointTrue = false;
			}
			
			// Виклик функції для малювання на канвасі
			this.drawCanvas();
			
			// Малюємо всі об'єкти заново
			this.localData.forEach((currentValue) => {
				this.drawShapeFromPoints(currentValue);
			});
		},
		
		deleteItem(index) {
			this.localData.splice(index, 1);
			let j = JSON.stringify(this.localData);
			localStorage.setItem(this.imgIdCurr, j);
			
			this.loadImg(this.imgCurr);
			this.domUpdate();
		},

		
		loadImg(url) {
			this.img = new Image();
			this.img.src = url;

			this.img.onload = () => {
				this.scaleCurr = 1;
				this.canvas.width = this.img.width;
				this.canvas.height = this.img.height;

				this.ctx.drawImage(this.img, 0, 0);
				
				this.localData.forEach((currentValue) => {
					this.drawShapeFromPoints(currentValue);
				});
			};
		},
		
		getLocalData() {
			let item = localStorage.getItem(this.imgIdCurr);

			if (item && item.length > 10) {
				this.localData = JSON.parse(item);
			}

			let itemCat = localStorage.getItem(this.imgIdCurr + 'cat');

			if (itemCat) {
				this.localCat = JSON.parse(itemCat);
			}
		},
		
	
		selectImage(id, src) {
			const alertIsset = document.querySelector(".alert");

			if (alertIsset) {
			  alertIsset.remove();
			}
			
			this.cat = 0;
			this.localCat = [];
			this.localData = [];
			
			this.points = [];
			this.squares = [];

			this.imgIdCurr = id;
			this.imgCurr = src;

			this.getLocalData();
			this.loadImg(this.imgCurr);
			this.domUpdate();
		},

		scaleIncrease() {
			
			if(this.points.length > 0){
				if( this.currentDrawType == 1 ){
					if( this.initialPoints == null ){
						let obj = {};
						
						if( this.scaleCurr != 1 ){
							obj = this.toOriginalScale(this.points, this.scaleCurr);
							this.initialPoints = [...obj];
						}else{
							this.initialPoints = [...this.points];
						}
					}
					this.points = this.adjustScalePoints(this.points, this.initialPoints, this.scaleCurr);
				}
			}
			
			this.scaleCurr += 0.01;
			this.redrawSizeChange();
			
		},
			
		scaleDecreeze() {
			if(this.points.length > 0){
				if( this.currentDrawType == 1 ){
					if( this.initialPoints == null ){
						let obj = {};
						
						if(this.scaleCurr != 1 ){
							obj = this.toOriginalScale(this.points, this.scaleCurr);
							this.initialPoints = [...obj];
						}else{
							this.initialPoints = [...this.points];
						}
					}
					this.points = this.adjustScalePoints(points, initialPoints, scaleCurr);
				}
			}

			this.scaleCurr -= 0.01;
			this.redrawSizeChange();
		},
		
		
		
	
		
		removeLogo() {
			setTimeout(() => {
				document.querySelector(".logo").remove();
			}, 2900);
		},
		uploadRemove() {
			document.querySelector(".upload").remove();
			document.querySelector(".select-list").style.display = "flex";
		},
		toggleImage(id) {
			const index = this.selectedIds.indexOf(id);
			
			if (index === -1) {
				this.selectedIds.push(id);
			} else {
				this.selectedIds.splice(index, 1);
			}
		},
		applySelection() {
			document.querySelector(".select-list").remove();
			document.querySelector(".wrap ").style.display = "flex";
		},
	
		setTypePO() {
			if (this.points.length > 0 || this.squares.length > 0) {
				alert('Finish working with the object');
				return;
			}
			
			document.querySelector(".type .sq").classList.remove('active');
			document.querySelector(".type .po").classList.add('active');
			this.currentDrawType = 1;
		},
		
		setTypeSQ() {
			if (this.points.length > 0 || this.squares.length > 0) {
				alert('Finish working with the object');
				return;
			}
			
			document.querySelector(".type .po").classList.remove('active');
			document.querySelector(".type .sq").classList.add('active');
			this.currentDrawType = 2;
		},
		
		colorPicker() {
			this.pointFillStyleCurr = this.selectedColor;
			this.bgFillStyleCurr = this.hexToRgba(this.selectedColor, 0.2);
		},
		
		hexToRgba(hex, alpha) {
			const r = parseInt(hex.slice(1, 3), 16);
			const g = parseInt(hex.slice(3, 5), 16);
			const b = parseInt(hex.slice(5, 7), 16);

			return `rgba(${r}, ${g}, ${b}, ${alpha})`;
		},
		
		saveCategory() {
			let catName = this.newCat.trim();

			if (catName) {
				this.localCat.push(catName);

				localStorage.setItem(this.imgIdCurr + 'cat', JSON.stringify(this.localCat));
				this.cat = catName;
				this.newCat = '';
				document.querySelector(".figure-list .new-cat").value = '';

				this.domUpdate();
			}
		},
		
		faq() {
			document.querySelector(".hidden").style.display = "flex";
			document.querySelector(".hidden .faq").style.display = "flex";
		},
		
		showJson() {
			document.querySelector(".hidden").style.display = "flex";
			document.querySelector(".hidden .json-data").style.display = "flex";
			document.querySelector(".hidden .json-data p").textContent = JSON.stringify(this.localData);
		},
		
		hiddenBlockClose() {
			document.querySelector(".hidden").style.display = "none";
			document.querySelector(".hidden .faq").style.display = "none";
			document.querySelector(".hidden .name-change").style.display = "none";
			document.querySelector(".hidden .name-change").style.display = "none";
		},
		
		
		
		
	}
}).mount('#app');

















