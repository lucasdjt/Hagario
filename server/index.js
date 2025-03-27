import http from 'http';
import { Server as IOServer } from 'socket.io';
import SpecialFoodManager from './SpecialFoodManager.js';
import InvincibleBonus from './InvincibleBonus.js';
import User from './User.js';
import Bot from './Bot.js';
import Users from './Users.js';
import { updateClassement } from './classement.js';

// Création serveur HTTP + Socket.IO
const httpServer = http.createServer((req, res) => {
	res.statusCode = 200;
	res.setHeader('Content-Type', 'text/html');
	res.end('<h1>Serveur OK</h1>');
});
const port = process.env.PORT || 8080;
httpServer.listen(port, () => {
	console.log(`Server running at http://localhost:${port}/`);
});
const io = new IOServer(httpServer, { cors: { origin: '*' } });

// Variables globales
const MAP_WIDTH = 5000;
const MAP_HEIGHT = 5000;
const MAX_BOTS = 15;
const MAX_PLAYERS = 15;

const users = new Users();
const specialFoodManager = new SpecialFoodManager(MAP_WIDTH, MAP_HEIGHT);
const invincibleBonuses = new InvincibleBonus(MAP_WIDTH, MAP_HEIGHT);
let foodItems = [];
const userSessions = {};
const BUSH_IMAGE_PATHS = ['/images/HAGARIO.png'];

let nextBotNumber = 1;

// Buissons
let bushes = [];
function createBushes() {
	bushes = [];
	const bushCount = 20;
	for (let i = 0; i < bushCount; i++) {
		const margin = 50;
		const x = margin + Math.random() * (MAP_WIDTH - margin * 2);
		const y = margin + Math.random() * (MAP_HEIGHT - margin * 2);
		const radius = 50;
		const spikeCount = 12;
		const spikes = [];
		for (let s = 0; s < spikeCount; s++) {
			spikes.push({
				angle: (2 * Math.PI * s) / spikeCount,
				randOffset: Math.random() * 1000,
			});
		}
		bushes.push({ x, y, radius, spikes, shakeTime: 0 });
	}
}
createBushes();

// Fonctions de nourriture
function createInitialFood() {
	foodItems = [];
	for (let i = 0; i < 400; i++) {
		createFood();
	}
}
function createFood() {
	const colors = [
		'#FF0000',
		'#00FF00',
		'#0000FF',
		'#FFFF00',
		'#FF00FF',
		'#00FFFF',
	];
	const type = Math.random() < 0.5 ? '0' : '1';
	const color = colors[Math.floor(Math.random() * colors.length)];
	const margin = 50;
	const x = margin + Math.random() * (MAP_WIDTH - 2 * margin);
	const y = margin + Math.random() * (MAP_HEIGHT - 2 * margin);
	foodItems.push({ x, y, type, color });
}
createInitialFood();

// Création / retrait de bots
function createBot() {
	const botName = `Ravagé n°${nextBotNumber}`;
	nextBotNumber++;
	const bot = new Bot(
		200 + Math.random() * (MAP_WIDTH - 400),
		200 + Math.random() * (MAP_HEIGHT - 400),
		botName,
		MAP_WIDTH,
		MAP_HEIGHT,
		'bot_' + Date.now() + '_' + Math.random().toString(36).substring(2),
		BUSH_IMAGE_PATHS[Math.floor(Math.random() * BUSH_IMAGE_PATHS.length)]
	);
	return bot;
}
function removeLowestScoreBot() {
	const botsOnly = users.users.filter(u => u.type === 'bot');
	if (botsOnly.length === 0) return false;
	let minBot = botsOnly[0];
	for (let i = 1; i < botsOnly.length; i++) {
		if (botsOnly[i].score < minBot.score) {
			minBot = botsOnly[i];
		}
	}
	users.users = users.users.filter(u => u !== minBot);
	users.nbUsers--;
	return true;
}
function fillWithBots() {
	const currentBots = users.users.filter(u => u.type === 'bot').length;
	const botsToAdd = Math.min(
		MAX_BOTS - currentBots,
		MAX_PLAYERS - users.nbUsers
	);
	for (let i = 0; i < botsToAdd; i++) {
		const newBot = createBot();
		users.addUser(newBot);
	}
}

// Réinitialisation des bots au démarrage
function resetBots() {
	users.users = users.users.filter(u => u.type !== 'bot');
	users.nbUsers = users.users.length;
	nextBotNumber = 1;
	fillWithBots();
}
resetBots();

// Fonction pour fusionner toutes les parties d’un joueur scindé
function mergeUser(userId) {
	const parts = users.users.filter(u => u.id === userId);
	if (parts.length <= 1) return;
	let totalScore = 0;
	let weightedX = 0;
	let weightedY = 0;
	parts.forEach(part => {
		totalScore += part.score;
		weightedX += part.x * part.score;
		weightedY += part.y * part.score;
	});
	const avgX = weightedX / totalScore;
	const avgY = weightedY / totalScore;
	const merged = new User(
		avgX,
		avgY,
		parts[0].type,
		parts[0].name,
		MAP_WIDTH,
		MAP_HEIGHT,
		userId,
		BUSH_IMAGE_PATHS[Math.floor(Math.random() * BUSH_IMAGE_PATHS.length)],
		true
	);
	merged.score = totalScore;
	merged.radius = totalScore * 0.01;
	merged.invincible = false;
	users.users = users.users.filter(u => u.id !== userId);
	users.nbUsers -= parts.length;
	users.addUser(merged);
	io.emit('gameMessage', `${merged.name} s'est réuni en une cellule unique !`);
}

// Vérification si une fusion est nécessaire
function checkMerge() {
	const userIds = [...new Set(users.users.map(u => u.id))];
	userIds.forEach(uid => {
		const parts = users.users.filter(u => u.id === uid);
		if (parts.length > 1 && parts.some(u => u.score > 3000)) {
			mergeUser(uid);
		}
	});
}

// Vérifier la mort d’un joueur
function checkPlayerDeath(userId) {
	const parts = users.users.filter(u => u.id === userId);
	if (parts.length === 0) {
		const user = userSessions[userId];
		if (user) {
			const sockId = user.socketId;
			io.to(sockId).emit('deathAnimation', {
				temps: user.temps?.toFixed(2) || '0.00',
				nbNourriture: user.nbNourriture || 0,
				score: user.score || 0,
			});
			setTimeout(() => {
				io.to(sockId).emit('gameOver', {
					temps: user.temps?.toFixed(2) || '0.00',
					nbNourriture: user.nbNourriture || 0,
					score: user.score || 0,
				});
				delete userSessions[userId];
			}, 1000);
		}
		fillWithBots();
	}
}

// Boucle de jeu (70 FPS)
function gameLoop() {
	users.users.forEach(player => {
		if (player.score > 1000 && player.bonus === false) {
			player.setInvincible(false);
		}

		// Collision avec les buissons pour utilisateurs et bots
		bushes.forEach(bush => {
			const dist = Math.hypot(player.x - bush.x, player.y - bush.y);
			if (dist < player.radius + bush.radius && player.score >= 300) {
				const newParts = player.split();
				if (newParts) {
					newParts.forEach(part => users.addUser(part));
					io.emit(
						'gameMessage',
						`${player.name} s'est scindé en trois parties !`
					);
					io.emit('splitAnimation', {
						userId: player.id,
						x: player.x,
						y: player.y,
					});
				}
			}
		});

		if (player.type === 'bot' && player.isMainPart) {
			const eatenObj = player.ai(users.users, foodItems);
			if (eatenObj && eatenObj.invincible === false) {
				users.users = users.users.filter(u => u !== eatenObj);
				users.nbUsers--;
				player.updateScore(eatenObj.score);
				io.emit('gameMessage', `${player.name} a mangé ${eatenObj.name} !`);
				checkPlayerDeath(eatenObj.id);
			}
		}

		// Déplacement géré par le serveur
		player.move();

		// Collision nourriture simple
		foodItems.forEach((food, idx) => {
			const dist = Math.hypot(player.x - food.x, player.y - food.y);
			if (dist < player.radius) {
				foodItems.splice(idx, 1);
				createFood();
				player.updateScore(10);
			}
		});

		// Collision nourriture spéciale
		specialFoodManager.foodItems.forEach(sf => {
			const dist = Math.hypot(player.x - sf.x, player.y - sf.y);
			if (dist < player.radius) {
				specialFoodManager.eatFood(sf);
				const gain = player.score > 50000 ? -100 : 100;
				player.updateScore(gain);
				io.emit(
					'gameMessage',
					`${player.name} a attrapé un <span style="color:gold;">~</span> ! ${gain > 0 ? '+' : ''}${gain}`
				);
				if (player.type === 'user') {
					const parts = users.users.filter(u => u.id === player.id);
					if (parts.length > 1) {
						mergeUser(player.id);
					}
				}
			}
		});

		// Collision bonus invincible
		invincibleBonuses.bonus.forEach(b => {
			const dist = Math.hypot(player.x - b.x, player.y - b.y);
			if (dist < player.radius) {
				invincibleBonuses.eatFood(b);
				player.setInvincible(true);
				io.emit(
					'gameMessage',
					`${player.name} devient invincible pour 5 secondes !`
				);
				io.emit(
					'usersUpdate',
					users.users.map(u => ({
						id: u.id,
						x: u.x,
						y: u.y,
						vx: u.vx,
						vy: u.vy,
						radius: u.radius,
						color: u.color,
						name: u.name,
						type: u.type,
						score: u.score,
						invincible: u.invincible,
						image: u.image,
					}))
				);
			}
		});

		// Collision joueur-joueur
		users.users.forEach(other => {
			if (other !== player) {
				const dist = Math.hypot(player.x - other.x, player.y - other.y);
				if (
					dist < player.radius + other.radius &&
					player.invincible === false &&
					other.invincible === false
				) {
					if (player.radius > other.radius) {
						player.updateScore(other.score * 0.1);
						io.emit(
							'gameMessage',
							`${player.name} a mangé une partie de ${other.name} !`
						);
						users.users = users.users.filter(u => u !== other);
						users.nbUsers--;
						checkPlayerDeath(other.id);
					}
				}
			}
		});

		// Faire suivre les parties scindées à la partie principale
		if (player.isMainPart) {
			const parts = users.users.filter(
				u => u.id === player.id && !u.isMainPart
			);
			parts.forEach(part => part.followMainPart(player));
		}
	});

	// Mise à jour des clients
	io.emit(
		'usersUpdate',
		users.users.map(u => ({
			id: u.id,
			x: u.x,
			y: u.y,
			vx: u.vx,
			vy: u.vy,
			radius: u.radius,
			color: u.color,
			name: u.name,
			type: u.type,
			score: u.score,
			invincible: u.invincible,
			image: u.image,
		}))
	);
	io.emit('foodUpdate', foodItems);
	io.emit('specialFoodUpdate', specialFoodManager.foodItems);
	io.emit('invincibleBonusUpdate', invincibleBonuses.bonus);
	io.emit('bushUpdate', bushes);

	// Vérifier la fusion
	checkMerge();
}

setInterval(gameLoop, 1000 / 70);
setInterval(clignote, 700);
function clignote() {
	users.users.forEach(player => {
		if (player.invincible === true) {
			player.clignote();
		}
	});
}
setInterval(() => {
	updateClassement(users.users);
	io.emit(
		'classementUpdate',
		users.users.map(u => ({
			name: u.name,
			score: u.score,
			time: u.temps,
			playersEaten: u.playersEaten,
			date: u.date,
		}))
	);
}, 1000);

// Événements Socket.IO
io.on('connection', socket => {
	console.log('Nouvelle connexion :', socket.id);
	socket.on('rentrerDansLeJeu', ({ userId, userName }) => {
		if (!userSessions[userId]) {
			userSessions[userId] = {
				name: userName,
				score: 1000,
				socketId: socket.id,
				temps: 0,
				nbNourriture: 0,
			};
		} else {
			userSessions[userId].socketId = socket.id;
		}
		if (users.nbUsers >= MAX_PLAYERS) {
			const success = removeLowestScoreBot();
			if (!success) {
				console.log(
					`Impossible d’ajouter ${userName}, déjà ${MAX_PLAYERS} joueurs`
				);
				return;
			}
		}
		const newUser = new User(
			200 + Math.random() * (MAP_WIDTH - 400),
			200 + Math.random() * (MAP_HEIGHT - 400),
			'user',
			userName,
			MAP_WIDTH,
			MAP_HEIGHT,
			userId,
			BUSH_IMAGE_PATHS[Math.floor(Math.random() * BUSH_IMAGE_PATHS.length)],
			true // Partie principale
		);
		users.addUser(newUser);
		fillWithBots();
		console.log(`Utilisateur connecté : ${userName} (${userId})`);
		socket.emit('foodUpdate', foodItems);
		socket.emit('specialFoodUpdate', specialFoodManager.foodItems);
		socket.emit('invincibleBonusUpdate', invincibleBonuses.bonus);
		socket.emit(
			'usersUpdate',
			users.users.map(u => ({
				id: u.id,
				x: u.x,
				y: u.y,
				vx: u.vx,
				vy: u.vy,
				radius: u.radius,
				color: u.color,
				name: u.name,
				type: u.type,
				score: u.score,
				invincible: u.invincible,
				image: u.image,
			}))
		);
		socket.emit('bushUpdate', bushes);
		io.emit('updateConnectedUsers', {
			total: Object.keys(userSessions).length,
			users: Object.values(userSessions).map(u => u.name),
		});
	});
	socket.on('updateUser', ({ userId, vx, vy }) => {
		const user = users.users.find(u => u.id === userId && u.isMainPart);
		if (user) {
			user.vx = vx || 0;
			user.vy = vy || 0;
		}
	});
	socket.on('quitterLeJeu', ({ userId }) => {
		if (userId && userSessions[userId]) {
			delete userSessions[userId];
			users.users = users.users.filter(u => u.id !== userId);
			io.emit('updateConnectedUsers', {
				total: Object.keys(userSessions).length,
				users: Object.values(userSessions).map(u => u.name),
			});
		}
	});
	socket.on('disconnect', () => {
		const [foundId] =
			Object.entries(userSessions).find(([, s]) => s.socketId === socket.id) ||
			[];
		if (foundId) {
			delete userSessions[foundId];
			users.users = users.users.filter(u => u.id !== foundId);
			io.emit('updateConnectedUsers', {
				total: Object.keys(userSessions).length,
				users: Object.values(userSessions).map(u => u.name),
			});
		}
	});
});
