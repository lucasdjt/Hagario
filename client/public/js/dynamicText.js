const phrases = [
    "Bienvenue dans Hagar.io !",
    "Mange ou sois mangé !",
    "Le CTP sera donc sans session, sans ordinateur, ni internet et sans souris ! ",
    "Prépare-toi à dominer la carte !",
    "Quand il y'a quelqu'un de déprimé, il faut le lacher, ça fait couler ton business !",
    "Des couurs de MasteR !",
    "Deviens le plus gros joueur !",
    "C'est quoi compiler déja ?",
    "On est tous un peu racistes au final ! ",
    "Amuse-toi bien dans l'arène !",
    "Toi on savait que tu volais beaucoup Nils !",
    "C'est quoi 3/4 ?",
    "Euh c'est 200 madame, non ? ah merde..."
];
const dynamicText = document.getElementById('dynamicText');
let currentIndex = 0;

function changeText() {
    dynamicText.style.opacity = '0';
    setTimeout(() => {
        currentIndex = (currentIndex + 1) % phrases.length;
        dynamicText.textContent = phrases[currentIndex];
        dynamicText.style.opacity = '1';
    }, 500);
}

dynamicText.style.transition = 'opacity 0.5s';
dynamicText.textContent = phrases[currentIndex];
dynamicText.style.opacity = '1';

setInterval(changeText, 5000);
