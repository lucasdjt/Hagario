import { io } from 'socket.io-client';
import Camera from './camera.js';
import Router from './Router.js';

const socket = io(window.location.hostname + ':8080');

// Variables globales
let userId;
let userName = 'Sans Emploi';
let particles = [];
let leaderboard = [];
let foodItems = [];
let specialFoodItems = [];
let invincibleBonuses = [];
let bushes = [];
let users = [];
let currentLeaderName = null;

const MAP_WIDTH = 5000;
const MAP_HEIGHT = 5000;

const BUSH_IMAGE_PATHS = ['/images/HAGARIO.png'];
let bushImages = [];

const AVATAR_IMAGES_PATHS = [];
let avatarImages = [];

// Caméra
let camera = null;

// Variables pour gérer l'animation de scindement
let splitEffects = [];

// --- Contrôles ---

let keysPressed = {};

function startKeyboardControls() {
	if (window._keyboardStarted) return;
	window._keyboardStarted = true;
	window.addEventListener('keydown', e => {
		keysPressed[e.key] = true;
	});
	window.addEventListener('keyup', e => {
		keysPressed[e.key] = false;
	});
	updateKeyboardVelocity();
}

// Fonction utilitaire pour calculer la vitesse maximale en fonction du radius
function getMaxSpeed(radius) {
	const baseSpeed = 6; // Vitesse maximale pour radius <= 1600 (70 FPS)
	const minSpeed = 2; // Vitesse minimale pour radius >= 7000 (45 FPS)
	if (radius <= 1600) {
		return baseSpeed;
	} else if (radius >= 7000) {
		return minSpeed;
	} else {
		// Décroissance linéaire entre 1600 et 7000
		const speedRange = baseSpeed - minSpeed; // 6 - 2 = 4
		const radiusRange = 7000 - 1600; // 7000 - 1600 = 5400
		const speedDecrease = ((radius - 1600) / radiusRange) * speedRange;
		return baseSpeed - speedDecrease;
	}
}

function updateKeyboardVelocity() {
	const me = users.find(u => u.id === userId);
	if (!me) {
		requestAnimationFrame(updateKeyboardVelocity);
		return;
	}
	const maxSpeed = getMaxSpeed(me.radius);

	if (keysPressed['ArrowUp'] || keysPressed['w'] || keysPressed['z']) {
		me.vy = -maxSpeed;
	} else if (keysPressed['ArrowDown'] || keysPressed['s']) {
		me.vy = maxSpeed;
	} else {
		me.vy = 0;
	}
	if (keysPressed['ArrowLeft'] || keysPressed['a'] || keysPressed['q']) {
		me.vx = -maxSpeed;
	} else if (keysPressed['ArrowRight'] || keysPressed['d']) {
		me.vx = maxSpeed;
	} else {
		me.vx = 0;
	}
	socket.emit('updateUser', { userId, vx: me.vx, vy: me.vy });
	requestAnimationFrame(updateKeyboardVelocity);
}

function handleMouse() {
	if (window._mouseSet) return;
	window._mouseSet = true;
	window.addEventListener('mousemove', e => {
		const me = users.find(u => u.id === userId);
		if (!me) return;
		const centerX = window.innerWidth / 2;
		const centerY = window.innerHeight / 2;
		const dx = e.clientX - centerX;
		const dy = e.clientY - centerY;
		const distance = Math.sqrt(dx * dx + dy * dy);
		const maxSpeed = getMaxSpeed(me.radius);
		const targetSpeed = Math.min(distance / 100, maxSpeed);
		const angle = Math.atan2(dy, dx);
		me.vx = targetSpeed * Math.cos(angle);
		me.vy = targetSpeed * Math.sin(angle);
		socket.emit('updateUser', { userId, vx: me.vx, vy: me.vy });
	});
}

function handleGyroscope(currentUser) {
	if (currentUser._gyroSet) return;
	currentUser._gyroSet = true;
	window.addEventListener('deviceorientation', e => {
		const maxSpeed = getMaxSpeed(currentUser.radius);
		currentUser.vx = Math.max(
			Math.min(e.gamma ? (e.gamma / 90) * maxSpeed : 0, maxSpeed),
			-maxSpeed
		);
		currentUser.vy = Math.max(
			Math.min(e.beta ? (e.beta / 90) * maxSpeed : 0, maxSpeed),
			-maxSpeed
		);
		socket.emit('updateUser', {
			userId,
			vx: currentUser.vx,
			vy: currentUser.vy,
		});
	});
}

// --- Écoute des événements Socket ---
socket.on('usersUpdate', serverUsers => {
	users = serverUsers;

	if (camera && camera.followed) {
		const currentId = camera.followed.id;
		const updatedFollowed = users.find(u => u.id === currentId);
		if (updatedFollowed) {
			camera.follow(updatedFollowed);
		}
	} else {
		const me = users.find(u => u.id === userId);
		if (me && camera) {
			camera.follow(me);
		}
	}

	const controlOption = document.querySelector(
		'input[name="controlOption"]:checked'
	)?.value;
	if (controlOption === 'keyboard') {
		startKeyboardControls();
	} else if (controlOption === 'mouse') {
		handleMouse();
	}
	if ('DeviceOrientationEvent' in window) {
		const currentUser = users.find(u => u.id === userId);
		if (currentUser) handleGyroscope(currentUser);
	}

	users = serverUsers.map((u, index) => {
		if (users[index] && users[index].image) {
			u.image = users[index].image;
		} else {
			u.image = bushImages[Math.floor(Math.random() * bushImages.length)];
		}
		return u;
	});
	console.log(
		'Updated user:',
		users.find(u => u.id === userId)
	);
});

socket.on('foodUpdate', serverFood => {
	foodItems = serverFood;
});

socket.on('specialFoodUpdate', serverSpecialFood => {
	specialFoodItems = serverSpecialFood;
});

socket.on('invincibleBonusUpdate', serverInvincible => {
	invincibleBonuses = serverInvincible;
});

socket.on('bushUpdate', serverBushes => {
	bushes = serverBushes.map((bush, index) => {
		if (bushes[index] && bushes[index].image) {
			bush.image = bushes[index].image;
		} else {
			bush.image = bushImages[Math.floor(Math.random() * bushImages.length)];
		}
		return bush;
	});
});

socket.on('gameMessage', message => {
	addGameMessage(message);
});

socket.on('gameOver', data => {
	Router.navigate('/replay', false, data);
});

// Écouteur pour l'événement splitAnimation
socket.on('splitAnimation', ({ userId, x, y }) => {
	splitEffects.push({
		userId,
		x,
		y,
		startTime: Date.now(),
		duration: 500, // Durée de l'animation en millisecondes
	});
});

// --- Initialisations ---
function initBackgroundGameCanvas(canvasElement) {
	const bgCanvas = canvasElement;
	const bgContext = bgCanvas.getContext('2d');
	resizeCanvas(bgCanvas, bgContext);
	preloadImages();
	createParticles();
	renderBackgroundGame(bgContext);
}

function initGameCanvas(canvasElement, newUserID, userNameParam, classement) {
	userId = newUserID;
	userName = userNameParam || userName;
	leaderboard = classement;
	const gameCanvas = canvasElement;
	const gameContext = gameCanvas.getContext('2d');
	resizeCanvas(gameCanvas, gameContext);
	preloadImages();
	createParticles();

	camera = new Camera(
		window.innerWidth,
		window.innerHeight,
		MAP_WIDTH,
		MAP_HEIGHT
	);
	const currentUser = users.find(u => u.id === userId);
	if (currentUser) {
		camera.follow(currentUser);
		const controlOption = document.querySelector(
			'input[name="controlOption"]:checked'
		)?.value;
		if (controlOption === 'keyboard') {
			startKeyboardControls();
		} else if (controlOption === 'mouse') {
			handleMouse();
		}
		if ('DeviceOrientationEvent' in window) {
			handleGyroscope(currentUser);
		}
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

function preloadImages() {
	bushImages = BUSH_IMAGE_PATHS.map(path => {
		const img = new Image();
		img.src = path;
		return img;
	});
	avatarImages = AVATAR_IMAGES_PATHS.map(path => {
		const img = new Image();
		img.src = path;
		return img;
	});
}

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
}

function updateParticles() {
	particles.forEach(p => {
		p.x += p.vx;
		p.y += p.vy;
		if (p.x < 0 || p.x > MAP_WIDTH) p.vx *= -1;
		if (p.y < 0 || p.y > MAP_HEIGHT) p.vy *= -1;
	});
	updateClassement();
	updatePlayerScoreDisplay();
}

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
		if (msgList.contains(msgDiv)) msgList.removeChild(msgDiv);
	}, 3000);
}

function updatePlayerScoreDisplay() {
	if (!isInGame()) return;
	const scoreBox = document.querySelector('.section-jeu .player-score');
	if (!scoreBox) return;
	const mainUser = users.find(u => u.id === userId);
	scoreBox.textContent = mainUser
		? `Score : ${Math.floor(mainUser.score)}`
		: 'Score : 0';
}

function updateClassement() {
	let html = '';
	let i = 1;
	users.sort((a, b) => b.score - a.score);
	users.forEach(u => {
		if (i <= 10) {
			html += `<tr ${i === 1 ? 'style="color: gold"' : ''} ${u.id === userId ? 'style="color: red"' : ''}>
                <td>${i}</td><td>${u.name} ${u.type === 'bot' ? '🤖' : ''}</td><td>${Math.floor(u.score)}</td>
              </tr>`;
		}
		i++;
	});
	const indexUser = users.findIndex(u => u.id === userId);
	if (indexUser >= 10) {
		html += `<tr style="color: red"><td>${indexUser + 1}</td><td>${users[indexUser].name}</td><td>${Math.floor(users[indexUser].score)}</td></tr>`;
	}
	leaderboard.innerHTML = html;
}

function drawParticles(context) {
	particles.forEach(p => {
		context.beginPath();
		context.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
		context.fillStyle = p.color;
		context.fill();
	});
	users.forEach(u => {
		context.beginPath();
		context.arc(u.x, u.y, u.radius, 0, Math.PI * 2);
		context.fillStyle = u.color;
		context.fill();
		context.font = '10px Arial';
		context.fillStyle = 'white';
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		context.fillText(u.name, u.x, u.y);
		if (u.id === userId) {
			const pseudo = document.querySelector('.add-pseudo');
			if (pseudo && pseudo.value.trim()) u.name = pseudo.value;
		}
		const img = new Image();
		img.src = u.image;

		context.save();
		context.globalAlpha = 0.6;
		context.drawImage(
			img,
			u.x - u.radius,
			u.y - u.radius,
			u.radius * 2,
			u.radius * 2
		);
		context.restore();
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
	context.save();
	context.font = 'bold 20px monospace';
	context.fillStyle = 'gold';
	context.shadowColor = 'yellow';
	context.shadowBlur = 15;
	specialFoodItems.forEach(sf => {
		context.fillText('~', sf.x, sf.y);
	});
	context.restore();
}

function drawInvincibleBonus(context) {
	context.save();
	context.font = 'bold 20px monospace';
	context.fillStyle = 'red';
	context.shadowColor = 'yellow';
	context.shadowBlur = 15;
	invincibleBonuses.forEach(i => {
		context.fillText('!', i.x, i.y);
	});
	context.restore();
}

function drawBushes(context) {
	const now = Date.now();
	bushes.forEach(bush => {
		context.save();
		context.beginPath();
		context.arc(bush.x, bush.y, bush.radius, 0, Math.PI * 2);
		context.fillStyle = 'green';
		context.globalAlpha = 0.7;
		context.fill();
		context.restore();
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
		drawBushSpikes(context, bush, now);
	});
}

function drawBushSpikes(context, bush, now) {
	let windAmp = bush.shakeTime > now ? 8 : 2;
	const timeFactor = now * 0.001;
	const baseRadius = bush.radius;
	context.save();
	context.strokeStyle = '#083';
	context.lineWidth = 2;
	context.globalAlpha = 0.9;
	bush.spikes.forEach(spike => {
		const angle = spike.angle;
		const lengthOsc = Math.sin(timeFactor + spike.randOffset) * windAmp;
		const spikeLen = baseRadius * 0.25 + lengthOsc;
		const px = bush.x + (baseRadius + spikeLen) * Math.cos(angle);
		const py = bush.y + (baseRadius + spikeLen) * Math.sin(angle);
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

function renderBackgroundGame(context) {
	context.clearRect(0, 0, window.innerWidth, window.innerHeight);
	drawGameBoard(context);
	drawParticles(context);
	drawFood(context);
	drawBushes(context);
	drawSpecialFood(context);
	drawInvincibleBonus(context);
	updateParticles();
	requestAnimationFrame(() => renderBackgroundGame(context));
}

function renderGame(context, camera) {
	context.clearRect(0, 0, window.innerWidth, window.innerHeight);
	camera.update();
	context.save();
	camera.applyTransform(context);

	// Dessiner le plateau, particules, nourriture, etc.
	drawGameBoard(context);
	drawParticles(context);
	drawFood(context);
	drawBushes(context);
	drawSpecialFood(context);
	drawInvincibleBonus(context);

	// Dessiner les effets de scindement
	const now = Date.now();
	splitEffects = splitEffects.filter(
		effect => now - effect.startTime < effect.duration
	);
	splitEffects.forEach(effect => {
		const progress = (now - effect.startTime) / effect.duration;
		context.save();
		context.beginPath();
		context.arc(effect.x, effect.y, 50 * (1 - progress), 0, Math.PI * 2); // Cercle qui rétrécit
		context.strokeStyle = `rgba(255, 255, 0, ${1 - progress})`; // Jaune qui s'estompe
		context.lineWidth = 5;
		context.stroke();
		context.restore();
	});

	context.restore();
	updateParticles();
	requestAnimationFrame(() => renderGame(context, camera));
}

function resizeCanvas(canvas, context) {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
}

export { initBackgroundGameCanvas, initGameCanvas };
