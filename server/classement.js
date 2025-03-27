export function updateClassement(users) {
	users.sort((a, b) => b.score - a.score);
  }