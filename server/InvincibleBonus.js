export default class InvincibleBonus {
	constructor(width, height) {
		this.width = width;
		this.height = height;
		this.bonus = [];
		this.MAX_BONUS_INVINCIBLE = 3;
		this.initBonus();
	}

	initBonus() {
		for (let i = 0; i < this.MAX_BONUS_INVINCIBLE; i++) {
			this.spawnBonus();
		}
	}

	spawnBonus() {
		const margin = 10;
		const bonu = {
			x: margin + Math.random() * (this.width - margin * 2),
			y: margin + Math.random() * (this.height - margin * 2),
		};
		this.bonus.push(bonu);
	}

	eatFood({ x, y }) {
		this.bonus = this.bonus.filter(f => {
			const dist = Math.hypot(f.x - x, f.y - y);
			return dist > 0.1;
		});
		setTimeout(() => this.spawnBonus(), 80000);
	}
}
