import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import SpecialFoodManager from './SpecialFoodManager.js';
import User from '../client/src/User.js';

describe('SpecialFoodManager', () => {
	let foodManager;
	const MAP_WIDTH = 4000;
	const MAP_HEIGHT = 4000;

	beforeEach(() => {
		foodManager = new SpecialFoodManager(MAP_WIDTH, MAP_HEIGHT);
	});

	it('should initialize with exactly 50 special foods', () => {
		assert.strictEqual(foodManager.foodItems.length, 50);
	});

	it('should respawn food after 80 seconds (1min20) when eaten', () => {
		const eatenFood = foodManager.foodItems[0];
		foodManager.eatFood(eatenFood);
		assert.strictEqual(foodManager.foodItems.length, 49);

		setTimeout(() => {
			assert.strictEqual(foodManager.foodItems.length, 50);
		}, 81000); // 81 secondes pour la marge d'erreur
	});

	it('should increase score by 400 if player score <= 50000', () => {
		const player = new User(100, 100, 'user', 'player', MAP_WIDTH, MAP_HEIGHT);
		player.score = 40000;
		foodManager.consumeFood(player);
		assert.strictEqual(player.score, 40400);
	});

	it('should decrease score by 400 if player score > 50000', () => {
		const player = new User(100, 100, 'user', 'player', MAP_WIDTH, MAP_HEIGHT);
		player.score = 51000;
		foodManager.consumeFood(player);
		assert.strictEqual(player.score, 50600);
	});
});
