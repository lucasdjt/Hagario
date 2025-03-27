export default class SpecialFoodManager {
	constructor(width, height) {
	  this.width = width;
	  this.height = height;
	  this.foodItems = [];
	  this.MAX_FOOD = 15;
	  this.initFood();
	}
  
	initFood() {
	  for (let i = 0; i < this.MAX_FOOD; i++) {
		this.spawnFood();
	  }
	}
  
	spawnFood() {
	  const margin = 10;
	  const food = {
		x: margin + Math.random() * (this.width - margin * 2),
		y: margin + Math.random() * (this.height - margin * 2),
	  };
	  this.foodItems.push(food);
	}
  
	eatFood({ x, y }) {
	  this.foodItems = this.foodItems.filter(f => {
		const dist = Math.hypot(f.x - x, f.y - y);
		return dist > 0.1;
	  });
	  setTimeout(() => this.spawnFood(), 80000);
	}
  }