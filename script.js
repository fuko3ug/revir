// Counter functionality
let counter = 0;
const counterElement = document.getElementById('counter');
const incrementBtn = document.getElementById('incrementBtn');
const decrementBtn = document.getElementById('decrementBtn');
const resetBtn = document.getElementById('resetBtn');

function updateCounter() {
    counterElement.textContent = counter;
    // Add animation
    counterElement.style.transform = 'scale(1.2)';
    setTimeout(() => {
        counterElement.style.transform = 'scale(1)';
    }, 200);
}

incrementBtn.addEventListener('click', () => {
    counter++;
    updateCounter();
});

decrementBtn.addEventListener('click', () => {
    counter--;
    updateCounter();
});

resetBtn.addEventListener('click', () => {
    counter = 0;
    updateCounter();
});

// Greeting functionality
const nameInput = document.getElementById('nameInput');
const greetBtn = document.getElementById('greetBtn');
const greetingMessage = document.getElementById('greetingMessage');

greetBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (name) {
        greetingMessage.textContent = `Merhaba, ${name}! Hoş geldiniz! 👋`;
        greetingMessage.style.opacity = '0';
        setTimeout(() => {
            greetingMessage.style.opacity = '1';
        }, 50);
    } else {
        greetingMessage.textContent = 'Lütfen adınızı girin! 😊';
        greetingMessage.style.color = '#e74c3c';
    }
});

// Allow Enter key to submit
nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        greetBtn.click();
    }
});

// Theme switcher
const lightThemeBtn = document.getElementById('lightThemeBtn');
const darkThemeBtn = document.getElementById('darkThemeBtn');

lightThemeBtn.addEventListener('click', () => {
    document.body.classList.remove('dark-theme');
    localStorage.setItem('theme', 'light');
});

darkThemeBtn.addEventListener('click', () => {
    document.body.classList.add('dark-theme');
    localStorage.setItem('theme', 'dark');
});

// Load saved theme on page load
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
});

// Add smooth transition to counter
counterElement.style.transition = 'transform 0.2s ease';
greetingMessage.style.transition = 'opacity 0.3s ease';
