const render = document.querySelector('#checkout-render');
const caption = document.querySelector('#finish-name');
function updatePreview() {
  const bronze = document.querySelector('input[name="finish"]:checked').value === 'bronze';
  const name = bronze ? 'Bacchus Bronze' : 'Stellaris Steel';
  render.classList.toggle('bronze', bronze);
  render.alt = 'ANTIK in ' + name;
  caption.textContent = name;
}
document.querySelector('#signup fieldset').addEventListener('change', updatePreview);
window.addEventListener('pageshow', updatePreview);
updatePreview();
