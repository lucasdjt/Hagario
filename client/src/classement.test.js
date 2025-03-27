import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { players } from './classement.js';

describe('Classement', () => {
	it('should sort players by score correctly', () => {
		players.sort((a, b) => b.score - a.score);
		assert.strictEqual(players[0].name, 'Lucas');
		assert.strictEqual(players[1].name, 'Nils');
		assert.strictEqual(players[2].name, 'Louis');
	});

	it('should sort players by time correctly', () => {
		const timeToSeconds = (time) => {
			const [min, sec] = time.split(':').map(Number);
			return min * 60 + sec;
		};
		players.sort((a, b) => timeToSeconds(b.time) - timeToSeconds(a.time));
		assert.strictEqual(players[0].name, 'Nils');
		assert.strictEqual(players[1].name, 'Louis');
		assert.strictEqual(players[2].name, 'Lucas');
	});

	it('should sort players by playersEaten correctly', () => {
		players.sort((a, b) => b.playersEaten - a.playersEaten);
		assert.strictEqual(players[0].name, 'Louis');
		assert.strictEqual(players[1].name, 'Nils');
		assert.strictEqual(players[2].name, 'Lucas');
	});

	it('should filter players by search query correctly', () => {
		const searchQuery = 'nil';
		const filteredPlayers = players.filter(player =>
			player.name.toLowerCase().includes(searchQuery.toLowerCase())
		);
		assert.strictEqual(filteredPlayers.length, 1);
		assert.strictEqual(filteredPlayers[0].name, 'Nils');
	});
});
