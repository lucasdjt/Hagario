export default class CreditsAnimator {
	constructor(canvas, name) {
	  this.canvas = canvas;
	  this.name = name;
	  this.ctx = canvas.getContext('2d');
	  this.isDrawing = false;
  
	  const dpr = window.devicePixelRatio || 1;
	  canvas.width = canvas.clientWidth * dpr;
	  canvas.height = canvas.clientHeight * dpr;
	  this.ctx.scale(dpr, dpr);
  
	  this.startX = 15;
	  this.startY = 15;
	  this.letterSpacing = 100;
	  this.lineWidth = 3;
  
	  this.ctx.lineWidth = this.lineWidth;
	  this.ctx.strokeStyle = 'red';
  
	  this.currentPathIndex = 0;
	  this.progress = 0;
  
	  this.alphabetPaths = {
		N: [[0, 0, 0, 80], [0, 0, 40, 80], [40, 0, 40, 80]],
		I: [[0, 0, 0, 80]],
		L: [[0, 0, 0, 80], [0, 80, 40, 80]],
		S: [[40, 0, 0, 0], [0, 0, 0, 40], [0, 40, 40, 40], [40, 40, 40, 80], [40, 80, 0, 80]],
		O: [[0, 0, 40, 0], [40, 0, 40, 80], [40, 80, 0, 80], [0, 80, 0, 0]],
		U: [[0, 0, 0, 80], [0, 80, 40, 80], [40, 80, 40, 0]],
		C: [[40, 0, 0, 0], [0, 0, 0, 80], [0, 80, 40, 80]],
		A: [[0, 80, 20, 0], [20, 0, 40, 80], [10, 40, 30, 40]],
	  };
	}
  
	start() {
	  this.stop();
	  this.clearCanvas();
	  this.isDrawing = true;
	  this.currentPathIndex = 0;
	  this.progress = 0;
	  this.draw();
	}
  
	stop() {
	  this.isDrawing = false;
	}
  
	clearCanvas() {
	  this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}
  
	draw() {
	  if (this.currentPathIndex >= this.name.length || !this.isDrawing) return;
  
	  const letter = this.name[this.currentPathIndex];
	  const paths = this.alphabetPaths[letter];
	  if (!paths) {
		this.nextLetter();
		return;
	  }
  
	  const [x1, y1, x2, y2] = paths[this.progress];
	  let offsetX = this.startX + this.currentPathIndex * this.letterSpacing;
	  if (letter === 'I') offsetX += 10;
	  const offsetY = this.startY;
  
	  let t = 0;
	  const animateLine = () => {
		if (t > 1) {
		  this.progress++;
		  if (this.progress >= paths.length) {
			this.nextLetter();
		  } else {
			this.draw();
		  }
		  return;
		}
  
		const currentX = offsetX + x1 + (x2 - x1) * t;
		const currentY = offsetY + y1 + (y2 - y1) * t;
  
		this.ctx.beginPath();
		this.ctx.moveTo(offsetX + x1, offsetY + y1);
		this.ctx.lineTo(currentX, currentY);
		this.ctx.stroke();
  
		t += 0.05;
		requestAnimationFrame(animateLine);
	  };
  
	  animateLine();
	}
  
	nextLetter() {
	  this.progress = 0;
	  this.currentPathIndex++;
	  setTimeout(() => this.draw(), 100);
	}
  }