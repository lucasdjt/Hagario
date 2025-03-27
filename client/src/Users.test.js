import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import Users from './Users.js';
import User from './User.js';
import { accessSync } from 'node:fs';

describe('Users', () => {
	it('should have 1 user', () => {
		const test = new Users();
		test.addUser(new User(0, 0, 'user', 'test'));
		assert.deepStrictEqual(1, test.nbUsers);
	});
	it('should have 1 user and 19 bots', () => {
		const test = new Users();
		test.addUser(new User(0, 0, 'user', 'test'));
		while (test.nbUsers < 20) {
			let i = 1;
			test.addUser(new User(0, 0, 'bot', `bot${i}`));
			i++;
		}
		assert.deepStrictEqual(19, test.nbBots);
		assert.deepStrictEqual(1, test.nbUsers - test.nbBots);
	});
	it('should have 20 users max if we had 1 more bot', () => {
		const test = new Users();
		test.addUser(new User(0, 0, 'user', 'test'));
		while (test.nbUsers < 20) {
			let i = 1;
			test.addUser(new User(0, 0, 'bot', `bot${i}`));
			i++;
		}
		assert.deepStrictEqual(20, test.nbUsers);
		test.addUser(new User(0, 0, 'bot', 'bot21'));
		assert.deepStrictEqual(20, test.nbUsers);
	});
	it('should have 20 users max if we had 1 more player', () => {
		const test = new Users();
		test.addUser(new User(0, 0, 'user', 'test'));
		while (test.nbUsers < 20) {
			let i = 1;
			test.addUser(new User(0, 0, 'bot', `bot${i}`));
			i++;
		}
		assert.deepStrictEqual(20, test.nbUsers);
		assert.deepStrictEqual(19, test.getNbBots());
		test.addUser(new User(0, 0, 'user', 'user21'));
		assert.deepStrictEqual(20, test.nbUsers);
		assert.deepStrictEqual(18, test.getNbBots());
	});
	it('score and radius should be linked', () => {
		const test = new Users();
		test.addUser(new User(0, 0, 'user', 'test'));
		assert.deepStrictEqual(1, test.nbUsers);
		assert.deepStrictEqual(test.users[0].radius, test.users[0].score * 0.01);
	});
	it('score and radius should be linked with update', () => {
		const test = new Users();
		test.addUser(new User(0, 0, 'user', 'test'));
		const user = test.users[0];
		assert.deepStrictEqual(1, test.nbUsers);
		assert.deepStrictEqual(user.radius, user.score * 0.01);
		user.updateScore(10);
		assert.deepStrictEqual(user.score, 1010);
		assert.deepStrictEqual(user.radius, 1010 * 0.01);
	});
});
