export default class View {
    constructor(element) {
      this.element = element;
    }
  
    show() {
      this.element.classList.add('active');
    }
  
    hide() {
      this.element.classList.remove('active');
    }
  }