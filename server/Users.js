export default class Users {
	constructor() {
	  this.users = [];
	  this.nbUsers = 0;
	}
  
	addUser(user) {
	  this.users.push(user);
	  this.nbUsers++;
	}
  
	moveUsers() {
	  this.users.forEach(user => user.move());
	}
  }