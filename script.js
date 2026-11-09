/* ---------- Настройки отправки заявок ----------
   1) endpoint — адрес вашего сервера или прокси, он сам перешлёт заявку
      в Telegram. Токен в этом случае живёт на сервере и в коде его нет.
   2) token + chatId — прямая отправка через Bot API (токен виден в коде).
   3) Если ничего не задано — форма откроет чат с готовым текстом заявки. */
const TELEGRAM = {
  endpoint: '',
  token: '',
  chatId: '',
  fallbackChat: 'https://t.me/irinatumbusova',
};

(() => {
  /* ---------- Фото: показываем, только если файл на месте ---------- */
  const portrait = document.querySelector('[data-portrait]');
  if (portrait) {
    const sources = ['photo.jpg', 'photo.jpeg', 'photo.png', 'photo.webp'];
    let index = 0;

    const tryNext = () => {
      index += 1;
      if (index < sources.length) {
        portrait.src = sources[index];
      } else {
        portrait.remove();
      }
    };

    portrait.addEventListener('error', tryNext);
    if (portrait.complete && portrait.naturalWidth === 0) tryNext();
  }

  /* ---------- Форма записи ---------- */
  const form = document.getElementById('signup-form');
  if (!form) return;

  const body = form.querySelector('.form__body');
  const success = form.querySelector('.form__success');
  const nameInput = document.getElementById('name');
  const phoneInput = document.getElementById('phone');
  const nameError = document.getElementById('name-error');
  const phoneError = document.getElementById('phone-error');
  const consent = document.getElementById('consent');
  const consentError = document.getElementById('consent-error');
  const formError = document.getElementById('form-error');
  const consentLabel = consent.closest('.consent');
  const submitBtn = form.querySelector('button[type="submit"]');

  const successTitle = success.querySelector('h3');
  const successText = success.querySelector('p');
  const successTitleDefault = successTitle.textContent;
  const successTextDefault = successText.textContent;

  /* ---------- Маска телефона: +7 (999) 123-45-67 ---------- */
  function formatPhone(raw) {
    let digits = raw.replace(/\D/g, '');

    if (digits.startsWith('8')) digits = '7' + digits.slice(1);
    if (digits && !digits.startsWith('7')) digits = '7' + digits;
    digits = digits.slice(0, 11);

    const rest = digits.slice(1);
    let out = '+7';

    if (rest.length) out += ' (' + rest.slice(0, 3);
    if (rest.length >= 3) out += ')';
    if (rest.length > 3) out += ' ' + rest.slice(3, 6);
    if (rest.length > 6) out += '-' + rest.slice(6, 8);
    if (rest.length > 8) out += '-' + rest.slice(8, 10);

    return out;
  }

  phoneInput.addEventListener('input', () => {
    const atEnd = phoneInput.selectionStart === phoneInput.value.length;
    phoneInput.value = formatPhone(phoneInput.value);
    if (atEnd) phoneInput.setSelectionRange(phoneInput.value.length, phoneInput.value.length);
    if (phoneInput.getAttribute('aria-invalid') === 'true') validatePhone();
  });

  phoneInput.addEventListener('focus', () => {
    if (!phoneInput.value) phoneInput.value = '+7 (';
  });

  phoneInput.addEventListener('blur', () => {
    if (phoneInput.value === '+7 (' || phoneInput.value === '+7') phoneInput.value = '';
  });

  /* ---------- Валидация ---------- */
  function setError(input, errorEl, message) {
    errorEl.textContent = message;
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    return !message;
  }

  function validateName() {
    const value = nameInput.value.trim().replace(/\s+/g, ' ');
    const words = value.split(' ').filter(Boolean);

    if (!value) return setError(nameInput, nameError, 'Укажите фамилию и имя.');
    if (words.length < 2) return setError(nameInput, nameError, 'Введите фамилию и имя полностью.');
    if (!/^[А-Яа-яЁёA-Za-z][А-Яа-яЁёA-Za-z-]*$/.test(words[0])) {
      return setError(nameInput, nameError, 'Имя может содержать только буквы и дефис.');
    }
    if (value.length > 80) return setError(nameInput, nameError, 'Слишком длинное значение.');

    return setError(nameInput, nameError, '');
  }

  function validatePhone() {
    const digits = phoneInput.value.replace(/\D/g, '');

    if (!digits) return setError(phoneInput, phoneError, 'Укажите номер телефона.');
    if (digits.length !== 11) return setError(phoneInput, phoneError, 'Введите номер полностью: +7 (999) 123-45-67.');

    return setError(phoneInput, phoneError, '');
  }

  function validateConsent() {
    const message = consent.checked ? '' : 'Отметьте согласие на обработку персональных данных.';
    consentError.textContent = message;
    consent.setAttribute('aria-invalid', message ? 'true' : 'false');
    consentLabel.classList.toggle('is-invalid', Boolean(message));
    return !message;
  }

  consent.addEventListener('change', () => {
    if (consent.checked) validateConsent();
  });

  nameInput.addEventListener('blur', validateName);
  phoneInput.addEventListener('blur', validatePhone);

  nameInput.addEventListener('input', () => {
    if (nameInput.getAttribute('aria-invalid') === 'true') validateName();
  });

  /* ---------- Отправка заявки ---------- */
  function buildMessage(lead) {
    return [
      'Новая заявка с сайта',
      '',
      'ФИО: ' + lead.name,
      'Телефон: ' + lead.phone,
      'Время: ' + new Date().toLocaleString('ru-RU'),
    ].join('\n');
  }

  async function sendLead(lead) {
    const text = buildMessage(lead);

    if (TELEGRAM.endpoint) {
      const response = await fetch(TELEGRAM.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...lead, text }),
      });

      if (!response.ok) throw new Error('Endpoint: ' + response.status);
      return 'sent';
    }

    if (TELEGRAM.token && TELEGRAM.chatId) {
      const response = await fetch(
        'https://api.telegram.org/bot' + TELEGRAM.token + '/sendMessage',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM.chatId,
            text,
            disable_web_page_preview: true,
          }),
        }
      );

      if (!response.ok) throw new Error('Telegram: ' + response.status);
      return 'sent';
    }

    // Без токена — открываем чат с готовым текстом заявки
    window.open(
      TELEGRAM.fallbackChat + '?text=' + encodeURIComponent(text),
      '_blank',
      'noopener'
    );
    return 'opened';
  }

  function showSuccess(mode) {
    successTitle.textContent = mode === 'opened' ? 'Остался один шаг' : successTitleDefault;
    successText.textContent =
      mode === 'opened'
        ? 'Telegram открылся в новой вкладке — отправьте сообщение, и я отвечу в течение дня.'
        : successTextDefault;

    body.hidden = true;
    success.hidden = false;
    successTitle.focus();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formError.textContent = '';

    const nameOk = validateName();
    const phoneOk = validatePhone();
    const consentOk = validateConsent();

    if (!nameOk || !phoneOk || !consentOk) {
      if (!nameOk) nameInput.focus();
      else if (!phoneOk) phoneInput.focus();
      else consent.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправляем…';

    try {
      const mode = await sendLead({
        name: nameInput.value.trim(),
        phone: phoneInput.value.trim(),
      });
      showSuccess(mode);
    } catch (error) {
      formError.textContent =
        'Не удалось отправить заявку. Попробуйте ещё раз или напишите в Telegram: @irinatumbusova.';
      console.error(error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Записаться';
    }
  });

  /* ---------- Новая заявка ---------- */
  form.querySelector('[data-reset-form]').addEventListener('click', () => {
    form.reset();
    nameInput.removeAttribute('aria-invalid');
    phoneInput.removeAttribute('aria-invalid');
    consent.removeAttribute('aria-invalid');
    consentLabel.classList.remove('is-invalid');
    nameError.textContent = '';
    phoneError.textContent = '';
    consentError.textContent = '';
    formError.textContent = '';
    successTitle.textContent = successTitleDefault;
    successText.textContent = successTextDefault;
    success.hidden = true;
    body.hidden = false;
    nameInput.focus();
  });

  /* ---------- CTA: фокус на форме ---------- */
  document.querySelectorAll('[data-focus-form]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const target = document.getElementById('signup');
      const rect = target.getBoundingClientRect();
      const visible = rect.top >= 0 && rect.bottom <= window.innerHeight;

      if (!visible) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => nameInput.focus({ preventScroll: true }), 350);
      } else {
        nameInput.focus({ preventScroll: true });
      }
    });
  });
})();
