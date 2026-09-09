(() => {
  const cfg = window.ADM4377_CONFIG;
  const form = document.getElementById('surveyForm');
  const submitButton = document.getElementById('submitButton');
  const errorBox = document.getElementById('formError');
  const successBox = document.getElementById('formSuccess');
  const frame = document.getElementById('submissionFrame');
  const q15 = document.getElementById('q15');
  const charCount = document.getElementById('charCount');

  if (!cfg) {
    showError('Configuration could not be loaded. Please contact the instructor.');
    submitButton.disabled = true;
    return;
  }

  if (q15 && charCount) {
    q15.addEventListener('input', () => {
      charCount.textContent = q15.value.length;
    });
  }

  // Make "None"-style checkbox choices exclusive.
  document.querySelectorAll('[data-exclusive]').forEach(group => {
    const exclusiveValue = group.dataset.exclusive;
    const boxes = [...group.querySelectorAll('input[type="checkbox"]')];
    boxes.forEach(box => {
      box.addEventListener('change', () => {
        if (!box.checked) return;
        if (box.value === exclusiveValue) {
          boxes.forEach(other => { if (other !== box) other.checked = false; });
        } else {
          const exclusive = boxes.find(other => other.value === exclusiveValue);
          if (exclusive) exclusive.checked = false;
        }
      });
    });
  });

  const storageKey = `adm4377-submitted-${cfg.sessionId}`;
  if (localStorage.getItem(storageKey)) {
    successBox.textContent = 'This browser has already submitted a response for this class session. If you are testing the site, clear this site’s local storage or temporarily change the sessionId in config.js.';
    successBox.classList.remove('hidden');
    submitButton.disabled = true;
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    clearMessages();

    if (!isConfigured()) {
      showError('The survey has not yet been connected to Google Apps Script. The instructor needs to paste the deployed /exec URL into config.js.');
      return;
    }

    const invalid = validateRequiredQuestions();
    if (invalid) {
      invalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showError('Please answer all required questions before submitting.');
      return;
    }

    const answers = collectAnswers();
    const responseId = getOrCreateResponseId();
    const payload = {
      action: 'submit',
      session: cfg.sessionId,
      responseId,
      answers
    };

    submitButton.disabled = true;
    submitButton.textContent = 'Submitting…';

    let settled = false;
    let transportForm = null;

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      if (transportForm && transportForm.parentNode) transportForm.remove();
    };

    const finishSuccess = () => {
      if (settled) return;
      settled = true;
      cleanup();
      localStorage.setItem(storageKey, '1');
      successBox.innerHTML = '<strong>Thank you.</strong> Your class profile has been submitted. You can now return to the class discussion.';
      successBox.classList.remove('hidden');
      form.querySelectorAll('input, textarea').forEach(el => el.disabled = true);
      submitButton.textContent = 'Submitted';
      successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const finishError = message => {
      if (settled) return;
      settled = true;
      cleanup();
      submitButton.disabled = false;
      submitButton.textContent = 'Submit Class Profile';
      showError(message || 'The submission did not complete. Please check your internet connection and try again.');
    };

    const onMessage = event => {
      const data = event.data;
      if (!data || data.source !== 'adm4377-survey-response' || data.responseId !== responseId) return;
      if (data.ok) finishSuccess();
      else finishError(data.message || 'The survey service returned an error.');
    };
    window.addEventListener('message', onMessage);

    // A normal cross-origin HTML form POST avoids browser CORS complexity.
    // The Apps Script response posts a success/error message back to this page.
    transportForm = document.createElement('form');
    transportForm.method = 'POST';
    transportForm.action = cfg.appsScriptUrl;
    transportForm.target = frame.name;
    transportForm.className = 'hidden';

    const payloadInput = document.createElement('input');
    payloadInput.type = 'hidden';
    payloadInput.name = 'payload';
    payloadInput.value = JSON.stringify(payload);
    transportForm.appendChild(payloadInput);
    document.body.appendChild(transportForm);

    try {
      transportForm.submit();
    } catch (err) {
      console.error(err);
      finishError();
      return;
    }

    setTimeout(() => {
      if (!settled) finishError('The survey service did not respond within 15 seconds. Please try once more.');
    }, 15000);
  });

  function isConfigured() {
    return cfg.appsScriptUrl && /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(cfg.appsScriptUrl);
  }

  function validateRequiredQuestions() {
    let firstInvalid = null;
    document.querySelectorAll('.question-card').forEach(card => card.classList.remove('invalid'));

    document.querySelectorAll('.question-card[data-required="true"]').forEach(card => {
      const inputs = [...card.querySelectorAll('input[type="radio"], input[type="checkbox"]')];
      const answered = inputs.some(input => input.checked);
      if (!answered) {
        card.classList.add('invalid');
        if (!firstInvalid) firstInvalid = card;
      }
    });
    return firstInvalid;
  }

  function collectAnswers() {
    const answer = {};
    for (let i = 1; i <= 14; i += 1) {
      const name = `q${i}`;
      const fields = [...form.querySelectorAll(`[name="${name}"]`)];
      const type = fields[0]?.type;
      if (type === 'checkbox') {
        answer[name] = fields.filter(el => el.checked).map(el => el.value);
      } else {
        answer[name] = fields.find(el => el.checked)?.value || '';
      }
    }
    answer.q15 = (q15?.value || '').trim();
    return answer;
  }

  function getOrCreateResponseId() {
    const key = `adm4377-response-id-${cfg.sessionId}`;
    let id = localStorage.getItem(key);
    if (!id) {
      id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(key, id);
    }
    return id;
  }

  function clearMessages() {
    errorBox.classList.add('hidden');
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
  }
})();
