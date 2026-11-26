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

const source = document.querySelector('#signup [name="referral_source"]');
const referrerField = document.querySelector('#referrer-field');
function updateReferrerField() {
  const show = source.value === 'Friend or colleague';
  referrerField.hidden = !show;
  referrerField.querySelector('input').disabled = !show;
}
source.addEventListener('change', updateReferrerField);
window.addEventListener('pageshow', updateReferrerField);
updateReferrerField();
