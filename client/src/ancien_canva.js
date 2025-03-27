import { io } from 'socket.io-client';
import User from './User.js';
import Users from './Users.js';
import Camera from './Camera.js';
import Bot from './Bot.js';
import SpecialFoodManager from './SpecialFoodManager.js';
import Router from './Router.js';

const socket = io(window.location.hostname + ':8080');

// ========================
//  Config / Variablesea
// ========================
let userId;
let userName = 'Pascal Feur';
let particles = [];
const users = new Users();
let leaderboard = [];
let foodItems = [];
const MAP_WIDTH = 4000;
const MAP_HEIGHT = 4000;
const INITIAL_FOOD_COUNT = 1000;
const specialFoodManager = new SpecialFoodManager(MAP_WIDTH, MAP_HEIGHT);

// Pour le message de leader
let currentLeaderName = null;

// ========================
//  BUSHES CONFIG
// ========================

// Les images des buissons
const BUSH_IMAGE_PATHS = ['/images/HAGARIO.png'];

// Tableau d'objets Image
let bushImages = [];

// Tableau de buissons
let bushes = [];

/**
 * Précharge les images des bush.
 */
function preloadBushImages() {
	bushImages = BUSH_IMAGE_PATHS.map(path => {
		const img = new Image();
		img.src = path;
		return img;
	});
}

/**
 * Chaque buisson stocke :
 * - (x, y, radius, image)
 * - un tableau d’épines : positions angulaires
 * - shakeTime : timestamp jusqu’à quand le buisson est secoué
 */
function createBushes() {
	bushes = [];
	const bushCount = 20;

	for (let i = 0; i < bushCount; i++) {
		const margin = 50;
		const x = margin + Math.random() * (MAP_WIDTH - margin * 2);
		const y = margin + Math.random() * (MAP_HEIGHT - margin * 2);
		const randomImg = bushImages[Math.floor(Math.random() * bushImages.length)];

		const radius = 50; // taille standard
		const spikeCount = 12; // nombre d'épines

		const spikes = [];
		for (let s = 0; s < spikeCount; s++) {
			spikes.push({
				angle: (2 * Math.PI * s) / spikeCount, // angle de base
				randOffset: Math.random() * 1000, // pour déphasage
			});
		}

		bushes.push({
			x,
			y,
			radius,
			image: randomImg,
			spikes,
			shakeTime: 0, // 0 => pas secoué
		});
	}
}

// ========================
//  MESSAGES
// ========================
function isInGame() {
	const gameSection = document.querySelector('.section-jeu');
	return gameSection && gameSection.classList.contains('active');
}

function addGameMessage(message) {
	if (!isInGame()) return;
	const msgList = document.querySelector('.section-jeu .message-list');
	if (!msgList) return;

	const msgDiv = document.createElement('div');
	msgDiv.style.marginBottom = '5px';
	msgDiv.style.color = 'white';
	msgDiv.style.fontWeight = 'bold';
	msgDiv.innerHTML = message;

	msgList.insertBefore(msgDiv, msgList.firstChild);

	setTimeout(() => {
		if (msgList.contains(msgDiv)) {
			msgList.removeChild(msgDiv);
		}
	}, 3000);
}

// ========================
//  SCORE UI
// ========================
function updatePlayerScoreDisplay() {
	if (!isInGame()) return;

	const scoreBox = document.querySelector('.section-jeu .player-score');
	if (!scoreBox) return;

	const mainUser = users.users.find(u => u.type === 'user');
	scoreBox.textContent = mainUser
		? `Score : ${Math.floor(mainUser.score)}`
		: 'Score : 0';
}

// ========================
//  INITIALISATIONS
// ========================
function initBackgroundGameCanvas(canvasElement) {
	const bgCanvas = canvasElement;
	const bgContext = bgCanvas.getContext('2d');
	resizeCanvas(bgCanvas, bgContext);

	// Particules, images, buissons
	preloadBushImages();
	createParticles();
	createBushes();
	createInitialFood();

	setInterval(createFood, 2000);

	window.addEventListener('resize', () => resizeCanvas(bgCanvas, bgContext));
	renderBackgroundGame(bgContext);
}

function initGameCanvas(canvasElement, newUserID, userNameParam, classement) {
	userName = userNameParam;
	userId = newUserID;
	leaderboard = classement;

	const gameCanvas = canvasElement;
	const gameContext = gameCanvas.getContext('2d');
	resizeCanvas(gameCanvas, gameContext);

	// Particules, images, buissons
	preloadBushImages();
	createParticles();
	createBushes();
	createInitialFood();

	setInterval(createFood, 1000);

	const camera = new Camera(
		window.innerWidth,
		window.innerHeight,
		MAP_WIDTH,
		MAP_HEIGHT
	);
	const currentUser = users.users.find(u => u.type === 'user');
	if (currentUser) {
		camera.follow(currentUser);
		const keyboard =
			document.querySelector('input[name=\"controlOption\"]:checked')?.value ===
			'keyboard';
		keyboard ? handleKeyboard(currentUser) : handleMouse(currentUser);
	}

	setupGameInterface();

	window.addEventListener('resize', () =>
		resizeCanvas(gameCanvas, gameContext)
	);
	renderGame(gameContext, camera);
}

function setupGameInterface() {
	const sectionJeu = document.querySelector('.section-jeu');
	if (!sectionJeu) return;

	let gameInterface = sectionJeu.querySelector('.game-interface');
	if (!gameInterface) {
		gameInterface = document.createElement('div');
		gameInterface.classList.add('game-interface');
		gameInterface.style.position = 'absolute';
		gameInterface.style.bottom = '10px';
		gameInterface.style.left = '10px';
		gameInterface.style.width = '200px';
		sectionJeu.appendChild(gameInterface);
	}

	let msgList = sectionJeu.querySelector('.message-list');
	if (!msgList) {
		msgList = document.createElement('div');
		msgList.classList.add('message-list');
		gameInterface.appendChild(msgList);
	}

	let scoreBox = sectionJeu.querySelector('.player-score');
	if (!scoreBox) {
		scoreBox = document.createElement('div');
		scoreBox.classList.add('player-score');
		scoreBox.style.backgroundColor = 'rgba(0,0,0,0.6)';
		scoreBox.style.color = 'white';
		scoreBox.style.padding = '10px';
		scoreBox.style.marginTop = '10px';
		scoreBox.textContent = 'Score : 0';
		gameInterface.appendChild(scoreBox);
	}
}

// ========================
//  CREATION PARTICULES / FOOD
// ========================
function createParticles() {
	particles = [];
	for (let i = 0; i < 50; i++) {
		particles.push({
			x: Math.random() * MAP_WIDTH,
			y: Math.random() * MAP_HEIGHT,
			vx: (Math.random() - 0.5) * 0.5,
			vy: (Math.random() - 0.5) * 0.5,
			radius: 2 + Math.random() * 3,
			color: `rgba(255, 255, 255, ${0.5 + Math.random() * 0.5})`,
		});
	}

	users.users = [];
	users.nbUsers = 0;

	// un joueur
	users.addUser(
		new User(
			151 + 100 + Math.random() * (MAP_WIDTH - 301 - 100),
			151 + 100 + Math.random() * (MAP_HEIGHT - 301 - 100),
			'user',
			userName,
			MAP_WIDTH,
			MAP_HEIGHT
		)
	);

	// des bots
	while (users.nbUsers < 20) {
		users.addUser(
			new Bot(
				151 + Math.random() * (MAP_WIDTH - 301),
				151 + Math.random() * (MAP_HEIGHT - 301),
				`Ravagé n°${users.nbUsers}`,
				MAP_WIDTH,
				MAP_HEIGHT
			)
		);
	}

	users.users.forEach(user => {
		startChrono(user);
	});
}

function createInitialFood() {
	foodItems = [];
	for (let i = 0; i < INITIAL_FOOD_COUNT; i++) {
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
	const x = margin + Math.random() * (MAP_WIDTH - margin * 2);
	const y = margin + Math.random() * (MAP_HEIGHT - margin * 2);
	foodItems.push({ x, y, type, color });
}

// ========================
//  UPDATE LOGIC
// ========================
function updateParticles() {
	foodItems.forEach(food => {
		users.users.forEach(user => {
			if (
				food.x < user.x + user.radius &&
				food.x > user.x - user.radius &&
				food.y < user.y + user.radius &&
				food.y > user.y - user.radius
			) {
				user.updateScore(100);
				foodItems.splice(foodItems.indexOf(food), 1);
				createFood();
			}
		});
	});
	users.users.forEach(user => {
		users.users.forEach(otherUser => {
			if (user !== otherUser) {
				const distance = Math.hypot(user.x - otherUser.x, user.y - otherUser.y);

				// Vérifie que otherUser est complètement à l'intérieur de user
				if (
					user.radius > otherUser.radius &&
					distance + otherUser.radius <= user.radius
				) {
					user.updateScore(otherUser.score * 0.1);
					killUser(otherUser);
				}
			}
		});
	});

	particles.forEach(particle => {
		particle.x += particle.vx;
		particle.y += particle.vy;
		if (particle.x < 0 || particle.x > MAP_WIDTH) particle.vx *= -1;
		if (particle.y < 0 || particle.y > MAP_HEIGHT) particle.vy *= -1;
	});

	// Parcours des joueurs (ou bots)
	users.users.forEach(user => {
		// 1) Déplacement
		user.move();

		// 2) IA des bots
		if (user.type === 'bot') {
			const eatObj = user.ai(users.users, foodItems);
			if (eatObj) {
				users.users = users.users.filter(u => u !== eatObj);
				users.nbUsers--;
				user.updateScore(eatObj.score);
				addGameMessage(`${user.name} a tué ${eatObj.name} !`);
			}
		}

		// 3) Gérer la nourriture normale
		const foodEaten = user.senseFood(foodItems);
		if (foodEaten) {
			const [bit, idx] = foodEaten;
			foodItems.splice(idx, 1);
			user.updateScore(10);
		}

		// 4) Gérer la nourriture spéciale (tild)
		const specialFoodEaten = user.senseFood(specialFoodManager.foodItems);
		if (specialFoodEaten) {
			const [tilde, tildeIdx] = specialFoodEaten;
			const gain = user.score > 50000 ? '-100' : '+100';
			user.nbNourriture++;
			addGameMessage(
				`${user.name} a attrapé un <span style=\"color:gold;\">tild</span> ! ${gain}`
			);
			specialFoodManager.consumeFood(user);
			specialFoodManager.eatFood(tilde);
		}

		// 5) Gérer le fait de manger un autre joueur
		const cellEaten = user.senseCells(users.users);
		if (cellEaten && cellEaten !== user) {
			users.users = users.users.filter(u => u !== cellEaten);
			users.nbUsers--;
			user.updateScore(cellEaten.score);
			addGameMessage(`${user.name} a tué ${cellEaten.name} !`);
		}

		// 6) Vérifier la collision user <-> *toute* la nourriture
		//    (au cas où tu gères autrement que senseFood)
		foodItems.forEach((food, index) => {
			const withinX = Math.abs(food.x - user.x) < user.radius;
			const withinY = Math.abs(food.y - user.y) < user.radius;
			if (withinX && withinY) {
				user.updateScore(10);
				user.nbNourriture++;
				foodItems.splice(index, 1);
				createFood();
			}
		});

		// 7) Collision user <-> user
		users.users.forEach(otherUser => {
			if (otherUser !== user) {
				const dx = otherUser.x - user.x;
				const dy = otherUser.y - user.y;
				const dist = Math.hypot(dx, dy);
				if (dist < user.radius + otherUser.radius) {
					if (user.radius > otherUser.radius) {
						user.updateScore(otherUser.score * 0.1);
						addGameMessage(`${user.name} a tué ${otherUser.name} !`);
						killUser(otherUser);
					}
				}
			}
		});

		// 8) Collision user <-> bush
		bushes.forEach(bush => {
			const dx = bush.x - user.x;
			const dy = bush.y - user.y;
			const dist = Math.hypot(dx, dy);
			if (dist <= bush.radius + user.radius) {
				bush.shakeTime = Date.now() + 2000; // on secoue
				if (user.score > 3000) {
					splitUser(user);
				}
			}
		});
	});

	// Mise à jour de l'UI
	updateClassement();
	updateLeaderCheck();
	updatePlayerScoreDisplay();
}

/**
 * Collision buisson : si user.score > 3000 => split
 */
function updateBushCollisions() {
	users.users.forEach(user => {
		bushes.forEach(bush => {
			const dx = bush.x - user.x;
			const dy = bush.y - user.y;
			const dist = Math.hypot(dx, dy);

			if (dist <= bush.radius + user.radius) {
				// On secoue le buisson
				bush.shakeTime = Date.now() + 2000;

				if (user.score > 3000) {
					splitUser(user);
				}
			}
		});
	});
}

/**
 * Scinde un user (joueur ou bot) en 3 entités
 */
function splitUser(user) {
	const oldScore = user.score;
	const newScore = oldScore / 3;

	const index = users.users.indexOf(user);
	if (index >= 0) {
		users.users.splice(index, 1);
		users.nbUsers--;
	}

	for (let i = 0; i < 3; i++) {
		const angle = (Math.PI * 2 * i) / 3;
		const offset = 30;

		const spawnX = user.x + offset * Math.cos(angle);
		const spawnY = user.y + offset * Math.sin(angle);

		const newUser = new user.constructor(
			spawnX,
			spawnY,
			user.type,
			user.name,
			MAP_WIDTH,
			MAP_HEIGHT
		);
		newUser.score = newScore;
		newUser.radius = newUser.score * 0.01;
		newUser.color = user.color;
		users.addUser(newUser);
	}

	addGameMessage(`${user.name} s'est scindé en 3 !`);
}

// ========================
//  DESSIN DES BUSHES + épines animées
// ========================

function drawBushes(context) {
	const now = Date.now();

	bushes.forEach(bush => {
		// 1) Cercle vert de base
		context.save();
		context.beginPath();
		context.arc(bush.x, bush.y, bush.radius, 0, Math.PI * 2);
		context.fillStyle = 'green';
		context.globalAlpha = 0.7;
		context.fill();
		context.restore();

		// 2) Dessin de l'image par-dessus (si chargée)
		if (bush.image && bush.image.complete) {
			context.save();
			context.globalAlpha = 0.6;
			context.drawImage(
				bush.image,
				bush.x - bush.radius,
				bush.y - bush.radius,
				bush.radius * 2,
				bush.radius * 2
			);
			context.restore();
		}

		// 3) Épines animées
		drawBushSpikes(context, bush, now);
	});
}

/**
 * Dessine les épines autour du buisson, qui bougent lentement au rythme du vent.
 * Si bush.shakeTime > now => l'amplitude de mouvement est plus grande.
 */
function drawBushSpikes(context, bush, now) {
	// Amplitude du vent standard
	let windAmp = 2;
	// Si le buisson est secoué, on augmente
	if (bush.shakeTime > now) {
		windAmp = 8;
	}

	// Paramètre de temps pour faire bouger
	const timeFactor = now * 0.001; // en secondes environ
	const baseRadius = bush.radius;

	context.save();
	context.strokeStyle = '#083'; // épines de couleur vert foncé
	context.lineWidth = 2;
	context.globalAlpha = 0.9;

	bush.spikes.forEach(spike => {
		const angle = spike.angle;
		// On fait osciller la longueur avec un sinus du temps + un offset
		const lengthOsc = Math.sin(timeFactor + spike.randOffset) * windAmp;
		// Longueur finale : un quart du rayon ± l'oscillation
		const spikeLen = baseRadius * 0.25 + lengthOsc;

		// Position de la pointe
		const px = bush.x + (baseRadius + spikeLen) * Math.cos(angle);
		const py = bush.y + (baseRadius + spikeLen) * Math.sin(angle);

		// On trace la ligne depuis le bord du buisson
		context.beginPath();
		context.moveTo(
			bush.x + baseRadius * Math.cos(angle),
			bush.y + baseRadius * Math.sin(angle)
		);
		context.lineTo(px, py);
		context.stroke();
	});
	context.restore();
}

// ========================
//  AFFICHAGE
// ========================
function drawParticles(context) {
	particles.forEach(p => {
		context.beginPath();
		context.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
		context.fillStyle = p.color;
		context.fill();
	});

	users.users.forEach(u => {
		context.beginPath();
		context.arc(u.x, u.y, u.radius, 0, Math.PI * 2);
		context.fillStyle = u.color;
		context.fill();

		context.font = '16px Arial';
		context.fillStyle = 'white';
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		context.fillText(u.name, u.x, u.y);

		if (u.type === 'user') {
			u.name = document.querySelector('.add-pseudo')?.value || u.name;
		}
	});
}

function drawFood(context) {
	context.font = '12px Arial';
	foodItems.forEach(f => {
		context.fillStyle = f.color;
		context.fillText(f.type, f.x, f.y);
	});
}

function drawSpecialFood(context) {
	specialFoodManager.foodItems.forEach(food => {
		context.save();
		context.font = 'bold 20px monospace';
		context.fillStyle = 'gold';
		context.shadowColor = 'yellow';
		context.shadowBlur = 15;
		context.fillText('~', food.x, food.y);
		context.restore();
	});
}

function drawGameBoard(context) {
	const borderWidth = 20;
	context.fillStyle = '#2c3e50';
	context.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

	context.fillStyle = 'rgba(255, 0, 0, 0.5)';
	context.fillRect(0, 0, MAP_WIDTH, borderWidth);
	context.fillRect(0, MAP_HEIGHT - borderWidth, MAP_WIDTH, borderWidth);
	context.fillRect(0, 0, borderWidth, MAP_HEIGHT);
	context.fillRect(MAP_WIDTH - borderWidth, 0, borderWidth, MAP_HEIGHT);
}

// ========================
//  RENDER FUNCTIONS
// ========================
function renderBackgroundGame(context) {
	context.clearRect(0, 0, window.innerWidth, window.innerHeight);
	drawGameBoard(context);
	drawParticles(context);
	drawFood(context);
	drawBushes(context);
	drawSpecialFood(context);
	updateParticles();
	requestAnimationFrame(() => renderBackgroundGame(context));
}

function renderGame(context, camera) {
	context.clearRect(0, 0, window.innerWidth, window.innerHeight);
	camera.update();
	context.save();
	camera.applyTransform(context);

	drawGameBoard(context);
	drawParticles(context);
	drawFood(context);
	drawBushes(context);
	drawSpecialFood(context);

	context.restore();
	updateParticles();
	requestAnimationFrame(() => renderGame(context, camera));
}

// ========================
//  CLASSEMENT & LEADER
// ========================
function updateClassement() {
	let html = '';
	let i = 1;
	users.users.sort((a, b) => b.score - a.score);
	users.users.forEach(u => {
		if (i <= 10) {
			html += `<tr ${
				i === 1 ? 'style=\"color: gold\"' : ''
			} ${u.type === 'user' ? 'style=\"color: red\"' : ''}><td>${i}</td><td>${
				u.name
			} ${u.type === 'bot' ? '🤖' : ''}</td><td>${Math.floor(u.score)}</td></tr>`;
		}
		i++;
	});
	const indexUser = users.users.findIndex(u => u.type === 'user');
	if (indexUser >= 10) {
		html += `<tr style=\"color: red\"><td>${
			indexUser + 1
		}</td><td>${users.users[indexUser].name}</td><td>${Math.floor(
			users.users[indexUser].score
		)}</td></tr>`;
	}
	leaderboard.innerHTML = html;
}

function updateLeaderCheck() {
	if (users.users.length === 0) return;
	const sorted = [...users.users].sort((a, b) => b.score - a.score);
	const leader = sorted[0];
	if (!leader) return;
	if (leader.name !== currentLeaderName) {
		if (currentLeaderName !== null) {
			addGameMessage(`${leader.name} est maintenant le leader !`);
		}
		currentLeaderName = leader.name;
	}
}

function killUser(otherUser) {
	stopChrono(otherUser);
	if (otherUser.type === 'user') {
		socket.emit('quitterLeJeu', { userId, userName });
		console.log(otherUser.score);
		console.log(otherUser.nbNourriture);
		Router.navigate(
			'/replay',
			true,
			otherUser.temps,
			otherUser.nbNourriture,
			otherUser.score
		);
	}
	users.users.splice(users.users.indexOf(otherUser), 1);
	users.nbUsers--;
}

// ========================
//  KEY / MOUSE
// ========================
function handleKeyboard(currentUser) {
	window.addEventListener('keydown', e => {
		switch (e.key) {
			case 'ArrowUp':
			case 'w':
				currentUser.vy = -1;
				break;
			case 'ArrowDown':
			case 's':
				currentUser.vy = 1;
				break;
			case 'ArrowLeft':
			case 'a':
				currentUser.vx = -1;
				break;
			case 'ArrowRight':
			case 'd':
				currentUser.vx = 1;
				break;
		}
	});

	window.addEventListener('keyup', e => {
		switch (e.key) {
			case 'ArrowUp':
			case 'w':
			case 'ArrowDown':
			case 's':
				currentUser.vy = 0;
				break;
			case 'ArrowLeft':
			case 'a':
			case 'ArrowRight':
			case 'd':
				currentUser.vx = 0;
				break;
		}
	});
}

function handleMouse(currentUser) {
	window.addEventListener('mousemove', e => {
		const centerX = window.innerWidth / 2;
		const centerY = window.innerHeight / 2;

		const dx = e.clientX - centerX;
		const dy = e.clientY - centerY;

		if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
			const angle = Math.atan2(dy, dx);
			currentUser.vx = Math.cos(angle);
			currentUser.vy = Math.sin(angle);
		} else {
			currentUser.vx = 0;
			currentUser.vy = 0;
		}
	});
}

function resizeCanvas(canvas, context) {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
}

function startChrono(user) {
	user.temps = Date.now();
}

function stopChrono(user) {
	user.temps = (Date.now() - user.temps) / 1000;
}

// ========================
//  EXPORT
// ========================
export { initBackgroundGameCanvas, initGameCanvas };
