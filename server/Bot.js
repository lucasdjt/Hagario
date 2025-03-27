import User from './User.js';

export default class Bot extends User {
	constructor(x, y, name, worldWidth, worldHeight, id, img, isMainPart = true) {
		super(x, y, 'bot', name, worldWidth, worldHeight, id, img, isMainPart);
		this.worldWidth = worldWidth;
		this.worldHeight = worldHeight;
		this.cursor = [0, 40];
	}

	// Redéfinition de la méthode split pour créer des instances de Bot
	split() {
		if (this.score < 300) return null;

		const newScore = this.score / 3;
		const newRadius = newScore * 0.01;

		const part1 = new Bot(
			this.x + (Math.random() - 0.5) * 50,
			this.y + (Math.random() - 0.5) * 50,
			this.name,
			this.worldWidth,
			this.worldHeight,
			this.id,
			false // isMainPart = false
		);
		part1.score = newScore;
		part1.radius = newRadius;
		part1.invincible = this.invincible;

		const part2 = new Bot(
			this.x + (Math.random() - 0.5) * 50,
			this.y + (Math.random() - 0.5) * 50,
			this.name,
			this.worldWidth,
			this.worldHeight,
			this.id,
			false // isMainPart = false
		);
		part2.score = newScore;
		part2.radius = newRadius;
		part2.invincible = this.invincible;

		this.score = newScore;
		this.radius = newRadius;

		return [part1, part2];
	}

	ai(playerList, foodStuff) {
		let eatObj = null;
		this.nearbyPlayer = false;

		playerList.forEach(obj => {
			if (obj !== this) {
				const dist = Math.hypot(this.x - obj.x, this.y - obj.y);
				if (obj.invincible) {
					if (dist < 350 + this.radius / 2) {
						this.nearbyPlayer = true;
						this.run(obj, obj.x, obj.y);
					}
				} else {
					if (dist < 350 + this.radius / 2) {
						if (dist <= this.radius && obj.radius < this.radius) {
							eatObj = obj;
						} else if (dist > this.radius && obj.radius > this.radius) {
							this.nearbyPlayer = true;
							this.run(obj, obj.x, obj.y);
						} else if (dist > this.radius && obj.radius < this.radius) {
							this.nearbyPlayer = true;
							this.chase(obj);
						}
					}
				}
			}
		});

		if (!this.nearbyPlayer) {
			this.chaseFood(foodStuff);
		}
		return eatObj;
	}

	run(player, otherX, otherY) {
		let checkCoords = [];
		for (let i = 0; i <= 360; i += 15) {
			const rads = (i * Math.PI) / 180;
			const checkX = 50 * Math.cos(rads);
			const checkY = 50 * Math.sin(rads);
			checkCoords.push([checkX, checkY]);
		}

		let maxDistance;
		let maxDistanceCoords;

		checkCoords.forEach(set => {
			const dist = Math.hypot(
				player.x - (set[0] + this.x),
				player.y - (set[1] + this.y)
			);
			if (!maxDistance || dist >= maxDistance) {
				maxDistance = dist;
				maxDistanceCoords = set;
			}
		});

		this.cursor = maxDistanceCoords;
		this.vx = maxDistanceCoords[0] * 0.02;
		this.vy = maxDistanceCoords[1] * 0.02;
	}

	chase(target) {
		let checkCoords = [];
		for (let i = 0; i <= 360; i += 15) {
			const rads = (i * Math.PI) / 180;
			const checkX = 50 * Math.cos(rads);
			const checkY = 50 * Math.sin(rads);
			checkCoords.push([checkX, checkY]);
		}

		let minDistance;
		let minDistanceCoords;

		checkCoords.forEach(set => {
			const dist = Math.hypot(
				set[0] + this.x - target.x,
				set[1] + this.y - target.y
			);
			if (!minDistance || dist < minDistance) {
				minDistance = dist;
				minDistanceCoords = set;
			}
		});

		this.cursor = minDistanceCoords;
		this.vx = minDistanceCoords[0] * 0.015;
		this.vy = minDistanceCoords[1] * 0.015;
	}

	chaseFood(foodStuff) {
		let minDistance;
		let minDistanceCoords;

		foodStuff.forEach(food => {
			const dist = Math.hypot(this.x - food.x, this.y - food.y);
			if (!minDistance || dist < minDistance) {
				minDistance = dist;
				minDistanceCoords = [food.x - this.x, food.y - this.y];
			}
		});

		if (minDistanceCoords) {
			this.cursor = minDistanceCoords;
			this.vx = minDistanceCoords[0] * 0.015;
			this.vy = minDistanceCoords[1] * 0.015;
		}
	}
}
