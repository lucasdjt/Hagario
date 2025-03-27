export default class Camera {
	constructor(canvasWidth, canvasHeight, worldWidth, worldHeight) {
		this.xView = 0;
		this.yView = 0;
		this.wView = canvasWidth;
		this.hView = canvasHeight;
		this.worldWidth = worldWidth;
		this.worldHeight = worldHeight;
		this.followed = null;
		this.zoom = 1;
	}

	follow(gameObj) {
		this.followed = gameObj;
	}
	update() {
		if (this.followed !== null) {
			const playerRadius = this.followed.radius;
			this.zoom = Math.max(0.5, Math.min(2, 100 / playerRadius));
			const targetX = this.followed.x - this.wView / 2 / this.zoom;
			const targetY = this.followed.y - this.hView / 2 / this.zoom;
			this.xView = Math.max(
				0,
				Math.min(targetX, this.worldWidth - this.wView / this.zoom)
			);
			this.yView = Math.max(
				0,
				Math.min(targetY, this.worldHeight - this.hView / this.zoom)
			);
		}
	}

	applyTransform(context) {
		context.setTransform(
			this.zoom,
			0,
			0,
			this.zoom,
			-this.xView * this.zoom,
			-this.yView * this.zoom
		);
	}
}
