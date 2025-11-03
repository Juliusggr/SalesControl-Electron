const form = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');
const quitButton = document.getElementById('quit-button');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = usernameInput.value;
  const password = passwordInput.value;

  errorMessage.classList.add('hidden');
  errorMessage.textContent = '';

  const response = await window.api.login({ username, password });

  if (response.success) {
    // El proceso principal se encargará de cerrar esta ventana
    // y abrir la principal.
  } else {
    errorMessage.textContent = response.error || 'Error al iniciar sesión.';
    errorMessage.classList.remove('hidden');
  }
});

quitButton.addEventListener('click', () => {
  window.api.quit();
});