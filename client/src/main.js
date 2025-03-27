import { io } from 'socket.io-client';
import Router from './Router.js';
import View from './View.js';
import { initBackgroundGameCanvas, initGameCanvas } from './canva.js';
import displayLeaderboard from './classement.js';
import CreditsAnimator from './credits.js';

const socket = io(window.location.hostname + ':8080');

let userId = localStorage.getItem('userId');
if (!userId) {
	userId = Date.now() + '_' + Math.random().toString(36).substring(2);
	localStorage.setItem('userId', userId);
}
let userName = 'Sans Emploi';

socket.on('updateConnectedUsers', ({ total, users }) => {
	const connectedUsersElement = document.querySelector('.connectedUsers');
	if (connectedUsersElement) {
		connectedUsersElement.innerHTML = `
      Nombre d'utilisateurs connectés : ${total}<br>
      Utilisateurs : ${users.join(', ')}
    `;
	}
});

const homeView = new View(document.querySelector('.section-accueil'));
const gameView = new View(document.querySelector('.section-jeu'));
const replayView = new View(document.querySelector('.section-rejouer'));
const settingsView = new View(document.querySelector('.section-parametres'));
const rulesView = new View(document.querySelector('.section-regles'));
const leaderboardView = new View(document.querySelector('.section-classement'));
const creditsView = new View(document.querySelector('.section-credits'));

const routes = [
	{
		path: '/',
		view: homeView,
		title: 'Hagar.io',
		onNavigate: () => {
			const backgroundCanvas = document.querySelector('.arriere-plan');
			if (backgroundCanvas) {
				initBackgroundGameCanvas(backgroundCanvas);
				backgroundCanvas.classList.add('blurred');
				setTimeout(() => backgroundCanvas.classList.remove('blurred'), 500);
			}
		},
	},
	{
		path: '/game',
		view: gameView,
		title: 'JEU',
		onNavigate: () => {
			const gameCanvas = document.querySelector('.game-canvas');
			const pseudoInput = document.querySelector('.add-newPseudo')?.value.trim()
				? document.querySelector('.add-newPseudo')
				: document.querySelector('.add-pseudo');
			userName =
				pseudoInput && pseudoInput.value.trim()
					? pseudoInput.value
					: 'Sans Emploi';
			socket.emit('rentrerDansLeJeu', { userId, userName });
			if (gameCanvas)
				initGameCanvas(
					gameCanvas,
					userId,
					userName,
					document.querySelector('tbody')
				);
		},
	},
	{
		path: '/replay',
		view: replayView,
		title: 'Rejouer',
		onNavigate: ({ temps, nbNourriture, score }) => {
			const replayTable = document.querySelector('.rejouer_table');
			replayTable.innerHTML = `
        <tr><td>Vous avez survécu ${temps} secondes</td></tr>
        <tr><td>Vous avez mangé ${nbNourriture} points de nourriture</td></tr>
        <tr><td>Votre score : ${score}</td></tr>`;
		},
	},
	{ path: '/settings', view: settingsView, title: 'Paramètres' },
	{ path: '/rules', view: rulesView, title: 'Règles du jeu' },
	{ path: '/leaderboard', view: leaderboardView, title: 'Classement' },
	{ path: '/credits', view: creditsView, title: 'Crédits' },
];

socket.on('gameOver', data => {
	Router.navigate('/replay', true, data);
});

socket.on('deathAnimation', data => {
	// Exemple d'animation simple : afficher un overlay noir avec un fade out
	const overlay = document.createElement('div');
	overlay.style.position = 'fixed';
	overlay.style.top = '0';
	overlay.style.left = '0';
	overlay.style.width = '100%';
	overlay.style.height = '100%';
	overlay.style.backgroundColor = 'black';
	overlay.style.opacity = '1';
	overlay.style.zIndex = '1000';
	document.body.appendChild(overlay);
  
	// Animation de fade out sur 1 seconde
	let opacity = 1;
	const fadeOut = () => {
	  opacity -= 0.05;
	  if (opacity <= 0) {
		overlay.remove();
	  } else {
		overlay.style.opacity = opacity;
		requestAnimationFrame(fadeOut);
	  }
	};
	requestAnimationFrame(fadeOut);
  });
  

window.addEventListener('beforeunload', () => {
	socket.emit('quitterLeJeu', { userId, userName });
});
Router.init(routes, document.querySelector('body'));

document.addEventListener('DOMContentLoaded', () => {
	displayLeaderboard('score');
});

const creditsCanvas = document.querySelector('.creditsCanvas');
const names = ['LUCAS', 'NILS', 'LOUIS'];
let currentIndex = names.indexOf('LUCAS');
let animator = new CreditsAnimator(creditsCanvas, names[currentIndex]);

const updateCreditsDisplay = () => {
	names.forEach(name => {
		const block = document.querySelector(`.credits-block.${name}`);
		if (block)
			block.style.display = name === names[currentIndex] ? 'block' : 'none';
	});
	if (creditsCanvas) {
		animator.stop();
		animator = new CreditsAnimator(creditsCanvas, names[currentIndex]);
		animator.start();
	}
};

updateCreditsDisplay();
document.querySelector('.arrow-left')?.addEventListener('click', () => {
	currentIndex = (currentIndex - 1 + names.length) % names.length;
	updateCreditsDisplay();
});
document.querySelector('.arrow-right')?.addEventListener('click', () => {
	currentIndex = (currentIndex + 1) % names.length;
	updateCreditsDisplay();
});
