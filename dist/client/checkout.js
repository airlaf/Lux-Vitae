const render = document.querySelector('#checkout-render');
const caption = document.querySelector('#finish-name');
const detailImages = document.querySelectorAll('.finish-details img');
function updatePreview() {
  const bronze = document.querySelector('input[name="finish"]:checked').value === 'bronze';
  const name = bronze ? 'Bacchus Bronze' : 'Stellaris Steel';
  const finish = bronze ? 'bronze' : 'steel';
  render.src = `preview/${finish}-device.jpg`;
  for (const image of detailImages) {
    image.src = `preview/${finish}-${image.dataset.detail}.jpg`;
    image.alt = `${image.dataset.description} in ${name}`;
  }
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
