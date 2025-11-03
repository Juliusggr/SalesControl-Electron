const form = document.getElementById('reference-form');
const input = document.getElementById('reference-input');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const reference = input.value.trim();
  if (reference) {
    window.api.submitReference(reference);
  }
});