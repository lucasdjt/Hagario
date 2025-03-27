export default class Router {
	static routes = [];
	static currentRoute;
	static menuElement;
	
	static init(routes, menuElement) {
	  this.routes = routes;
	  this.menuElement = menuElement;
	  this.updateMenuLinks();
	  this.navigate(window.location.pathname, true);
	  window.onpopstate = () => this.navigate(window.location.pathname, true);
	}
	
	static updateMenuLinks() {
	  const links = this.menuElement?.querySelectorAll('a') || [];
	  links.forEach(link => {
		link.addEventListener('click', event => {
		  event.preventDefault();
		  const href = event.currentTarget.getAttribute('href');
		  this.navigate(href);
		});
	  });
	}
	
	static matchRoute(path) {
	  return this.routes.find(route => route.path === path);
	}
	
	static navigate(path, pushState = true, data = {}) {
	  const route = this.matchRoute(path);
	  if (!route) {
		console.error(`Aucune route trouvée pour : ${path}`);
		return this.navigate('/');
	  }
	
	  if (this.currentRoute?.view?.hide) this.currentRoute.view.hide();
	  this.currentRoute = route;
	  route.view.show();
	  document.title = route.title;
	
	  if (pushState) window.history.pushState({}, route.title, path);
	
	  if (typeof route.onNavigate === 'function') route.onNavigate(data);
	}
  }
  