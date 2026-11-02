// Small reusable UI primitives for the vanilla browser build.

(function createGameUI() {
  const asset = (name) => `/static/assets/ui/${name}.svg`;

  function createPixelButton({ label, variant = 'primary', icon = '', onClick, className = '' }) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `pixel-button pixel-button--${variant} ${className}`.trim();
    button.textContent = label;
    if (icon) button.dataset.icon = icon;
    if (onClick) button.addEventListener('click', onClick);
    return button;
  }

  function createPixelIconButton({ icon, ariaLabel, onClick, image = true }) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pixel-icon-button';
    button.setAttribute('aria-label', ariaLabel);
    if (image && ['sound', 'settings'].includes(icon)) {
      const iconImage = document.createElement('img');
      iconImage.src = asset(icon === 'sound' ? 'sounds' : 'settings');
      iconImage.alt = '';
      button.append(iconImage);
    } else {
      button.textContent = icon === 'pause' ? 'Ⅱ' : '×';
    }
    if (onClick) button.addEventListener('click', onClick);
    return button;
  }

  function createPixelModal({ id, title, className = '', onClose }) {
    const root = document.createElement('section');
    root.id = id;
    root.className = `pixel-modal-backdrop hidden ${className}`.trim();
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = `
      <div class="pixel-modal" role="dialog" aria-modal="true" aria-labelledby="${id}-title">
        <div class="pixel-modal__header">
          <h2 id="${id}-title"></h2>
          <button class="pixel-icon-button pixel-icon-button--close" type="button" aria-label="Close">×</button>
        </div>
        <div class="pixel-modal__content"></div>
      </div>`;
    root.querySelector(`#${id}-title`).textContent = title;
    root.querySelector('.pixel-icon-button--close').addEventListener('click', onClose);
    document.querySelector('.app-shell').append(root);
    return root;
  }

  function openModal(root) {
    const content = root.querySelector('.pixel-modal__content');
    if (content) content.scrollTop = 0;
    root.classList.remove('hidden');
    root.setAttribute('aria-hidden', 'false');
  }

  function closeModal(root) {
    root.classList.add('hidden');
    root.setAttribute('aria-hidden', 'true');
  }

  window.GameUI = { createPixelButton, createPixelIconButton, createPixelModal, openModal, closeModal };
}());
