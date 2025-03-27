import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import Bot from './bots.js';
import User from './User.js';

describe('Bot', () => {
	const bot = new Bot(100, 100, 'TestBot', 1000, 1000);

	it('should initialize with correct properties', () => {
		assert.strictEqual(bot.x, 100);
		assert.strictEqual(bot.y, 100);
		assert.strictEqual(bot.name, 'TestBot');
		assert.strictEqual(bot.type, 'bot');
	});

	it('should chase food correctly', () => {
		const foodStuff = [{ x: 200, y: 200 }, { x: 120, y: 120 }];
		bot.chaseFood(foodStuff);

		assert(bot.cursor[0] === 20 && bot.cursor[1] === 20);
	});

	it('should sense food correctly', () => {
		const foodStuff = [{ x: 101, y: 101 }, { x: 500, y: 500 }];
		const sensedFood = bot.senseFood(foodStuff);

		assert(sensedFood[0].x === 101 && sensedFood[0].y === 101);
	});

	it('should run away from a bigger player', () => {
		const bigPlayer = new User(110, 110, 'user', 'BigPlayer', 1000, 1000);
		bigPlayer.radius = 50; 
		bot.radius = 10;

		bot.run(bigPlayer, bigPlayer.x, bigPlayer.y);

		assert(bot.vx !== 0 || bot.vy !== 0); 
	});

	it('should chase a smaller player', () => {
		const smallPlayer = new User(150, 150, 'user', 'SmallPlayer', 1000, 1000);
		smallPlayer.radius = 5; 
		bot.radius = 20;

		bot.chase(smallPlayer);

		assert(bot.vx !== 0 || bot.vy !== 0); 
	});
});
