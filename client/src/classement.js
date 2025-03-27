import { io } from 'socket.io-client';

const socket = io(window.location.hostname + ':8080');

let players = [];

socket.on('classementUpdate', (serverPlayers) => {
  players = serverPlayers;
  displayLeaderboard('score');
});

export default function displayLeaderboard(currentSort) {
  const leaderboardBody = document.getElementById('leaderboardBody');
  if (!leaderboardBody) return;

  leaderboardBody.innerHTML = '';

  players.sort((a, b) => {
    if (currentSort === 'time') {
      return b.time - a.time;
    } else if (currentSort === 'eat') {
      return b.playersEaten - a.playersEaten;
    } else {
      return b[currentSort] - a[currentSort];
    }
  });

  const searchQuery = document.querySelector('.btn-search-player')?.value.toLowerCase() || '';

  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchQuery)
  );

  filteredPlayers.forEach((player, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${player.name}</td>
      <td>${Math.floor(player.score)}</td>
      <td>${Math.floor(player.time)}</td>
      <td>${player.playersEaten}</td>
      <td>${player.date}</td>
    `;
    leaderboardBody.appendChild(row);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('.btn-search-player')?.addEventListener('keyup', () => displayLeaderboard('score'));
  document.querySelector('.btn-sort-score')?.addEventListener('click', () => displayLeaderboard('score'));
  document.querySelector('.btn-sort-time')?.addEventListener('click', () => displayLeaderboard('time'));
  document.querySelector('.btn-sort-players')?.addEventListener('click', () => displayLeaderboard('eat'));
});