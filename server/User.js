export default class User {
	constructor(
		x,
		y,
		type,
		name,
		worldWidth,
		worldHeight,
		id,
		img,
		isMainPart = true
	) {
		this.x = x;
		this.y = y;
		this.vx = type === 'bot' ? (Math.random() - 0.5) * 1 : 0;
		this.vy = type === 'bot' ? (Math.random() - 0.5) * 1 : 0;
		this.color = `rgba(255, 0, 0, 0.1)`;
		this.type = type;
		this.name = name;
		this.score = 1000;
		this.radius = this.score * 0.01;
		this.worldWidth = worldWidth;
		this.worldHeight = worldHeight;
		this.id = id;
		this.temps = 0;
		this.playersEaten = 0;
		this.nbNourriture = 0;
		this.date = new Date().toISOString().split('T')[0];
		this.image = img;
		this.invincible = true;
		this.bonus = false;
		this.isMainPart = isMainPart; // Identifie si c'est la partie principale
	}

	setInvincible(bool) {
		this.invincible = bool;
		this.bonus = bool;
		if (bool) {
			setTimeout(() => {
				this.invincible = false;
				this.bonus = false;
			}, 5000);
		}
	}

	clignote() {
		if (this.color === `rgba(255, 0, 0, 0.1)`) {
			this.color = `rgba(255, 0, 0, 1)`;
		} else {
			this.color = `rgba(255, 0, 0, 0.1)`;
		}
	}

	updateScore(score) {
		this.score += score;
		this.radius = this.score * 0.01;
		if (score > 0) this.nbNourriture++;
	}

	move() {
		this.x += this.vx;
		this.y += this.vy;

		if (this.x < this.radius) {
			this.x = this.radius;
			this.vx = 0;
		} else if (this.x > this.worldWidth - this.radius) {
			this.x = this.worldWidth - this.radius;
			this.vx = 0;
		}
		if (this.y < this.radius) {
			this.y = this.radius;
			this.vy = 0;
		} else if (this.y > this.worldHeight - this.radius) {
			this.y = this.worldHeight - this.radius;
			this.vy = 0;
		}

		this.temps += 1 / 70; // Aligné avec la boucle de jeu à 70 FPS
	}

	split() {
		if (this.score < 300) return null; // Ne pas scinder si le score est trop faible

		const newScore = this.score / 3;
		const newRadius = newScore * 0.01;

		// Créer deux nouvelles parties
		const part1 = new User(
			this.x + (Math.random() - 0.5) * 50,
			this.y + (Math.random() - 0.5) * 50,
			this.type,
			this.name,
			this.worldWidth,
			this.worldHeight,
			this.id,
			this.image,
			false // Ces parties ne sont pas principales
		);
		part1.score = newScore;
		part1.radius = newRadius;
		part1.invincible = this.invincible;

		const part2 = new User(
			this.x + (Math.random() - 0.5) * 50,
			this.y + (Math.random() - 0.5) * 50,
			this.type,
			this.name,
			this.worldWidth,
			this.worldHeight,
			this.id,
			this.image,
			false // Ces parties ne sont pas principales
		);
		part2.score = newScore;
		part2.radius = newRadius;
		part2.invincible = this.invincible;

		// Ajuster la partie originale
		this.score = newScore;
		this.radius = newRadius;

		return [part1, part2];
	}

	followMainPart(mainPart) {
		if (!this.isMainPart) {
			const dx = mainPart.x - this.x;
			const dy = mainPart.y - this.y;
			const distance = Math.sqrt(dx * dx + dy * dy);
			if (distance > 0) {
				this.vx = (dx / distance) * 2; // Vitesse de suivi
				this.vy = (dy / distance) * 2;
			}
		}
	}
}
