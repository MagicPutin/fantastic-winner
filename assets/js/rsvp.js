/**
 * RSVP Form Handling with Web3Forms Integration,
 * Personalized Single / Couple Flows & Dynamic Hot Dish / +1 Logic
 */

(function () {
  const RSVP_FORM_ID = 'wedding-rsvp-form';
  const SUCCESS_MODAL_ID = 'rsvp-success-modal';
  const KEY_STORAGE_KEY = 'web3forms_wedding_key';

  // 1. HELPER: Universal Safe Copy to Clipboard
  function safeCopy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      return fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    return new Promise((resolve, reject) => {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (success) resolve();
        else reject(new Error('Copy failed'));
      } catch (err) {
        reject(err);
      }
    });
  }

  // 2. HELPER: Russian Declension for Genitive Case (Родительный падеж — «для кого?»)
  function declineWord(word) {
    if (!word || word.length < 2) return word;
    const lower = word.toLowerCase();

    // Irregular and fleeting vowel names
    const irregulars = {
      'павел': 'Павла',
      'петр': 'Петра',
      'пётр': 'Петра',
      'лев': 'Льва',
      'любовь': 'Любови',
      'илья': 'Ильи'
    };
    if (irregulars[lower]) {
      const res = irregulars[lower];
      return word[0] === word[0].toUpperCase() ? res : res.toLowerCase();
    }

    // Adjective-like surnames and titles (Крестный -> Крестного, Крестная -> Крестной)
    if (lower.endsWith('ый') || lower.endsWith('ой')) {
      return word.slice(0, -2) + (word.slice(-2) === 'ОЙ' || word.slice(-2) === 'ЫЙ' ? 'ОГО' : 'ого');
    }
    if (lower.endsWith('ая')) {
      return word.slice(0, -2) + (word.slice(-2) === 'АЯ' ? 'ОЙ' : 'ой');
    }
    if (lower.endsWith('яя')) {
      return word.slice(0, -2) + (word.slice(-2) === 'ЯЯ' ? 'ЕЙ' : 'ей');
    }

    // -ия -> -ии (Анастасия -> Анастасии, Мария -> Марии, Юлия -> Юлии)
    if (lower.endsWith('ия')) {
      return word.slice(0, -2) + (word.slice(-2) === 'ИЯ' ? 'ИИ' : 'ии');
    }

    // -ья -> -ьи (Дарья -> Дарьи, Софья -> Софьи, Наталья -> Натальи)
    if (lower.endsWith('ья')) {
      return word.slice(0, -2) + (word.slice(-2) === 'ЬЯ' ? 'ЬИ' : 'ьи');
    }

    // -а -> -и or -ы
    if (lower.endsWith('а')) {
      const prevChar = lower[lower.length - 2];
      // If preceded by vowel (e.g. Франсуа) -> indeclinable
      if ('аеёиоуыэюя'.includes(prevChar)) {
        return word;
      }
      const sibilantOrVelar = 'гкхжчшщ';
      const isUpper = word.endsWith('А');
      if (sibilantOrVelar.includes(prevChar)) {
        return word.slice(0, -1) + (isUpper ? 'И' : 'и');
      } else {
        return word.slice(0, -1) + (isUpper ? 'Ы' : 'ы');
      }
    }

    // -я -> -и (Настя -> Насти, Катя -> Кати, Ваня -> Вани, Дядя -> Дяди, Тетя -> Тети)
    if (lower.endsWith('я')) {
      const isUpper = word.endsWith('Я');
      return word.slice(0, -1) + (isUpper ? 'И' : 'и');
    }

    // -й -> -я (Алексей -> Алексея, Дмитрий -> Дмитрия, Сергей -> Сергея)
    if (lower.endsWith('й')) {
      const isUpper = word.endsWith('Й');
      return word.slice(0, -1) + (isUpper ? 'Я' : 'я');
    }

    // -ь -> -я (Игорь -> Игоря)
    if (lower.endsWith('ь')) {
      const isUpper = word.endsWith('Ь');
      return word.slice(0, -1) + (isUpper ? 'Я' : 'я');
    }

    // Hard consonants -> +а (Александр -> Александра, Иван -> Ивана, Михаил -> Михаила)
    const consonants = 'бвгджзклмнпрстфхцчшщ';
    const lastChar = lower[lower.length - 1];
    if (consonants.includes(lastChar)) {
      const isUpper = word[word.length - 1] === word[word.length - 1].toUpperCase();
      return word + (isUpper ? 'А' : 'а');
    }

    return word;
  }

  function toGenitive(str) {
    if (!str || typeof str !== 'string') return '';
    const trimmed = str.trim();
    if (!trimmed) return '';
    const clean = trimmed.replace(/^для\s+/i, '');

    // Split compound names with conjunctions: 'и', '&', '+'
    const parts = clean.split(/(\s+(?:и|&|\+)\s+)/i);
    if (parts.length > 1) {
      return parts.map((p, idx) => idx % 2 === 0 ? toGenitive(p) : p).join('');
    }

    // Multi-word names: "Дядя Сережа" -> "Дяди Сережи", "Тетя Лена" -> "Тети Лены"
    return clean.split(/\s+/).map(declineWord).join(' ');
  }

  // 3. HELPER: Parse URL Search Parameters for Personalized Invitations
  function parsePersonalizedParams() {
    const urlParams = new URLSearchParams(window.location.search);

    let guestName = urlParams.get('to') || urlParams.get('guest') || urlParams.get('name') || '';
    guestName = guestName.trim();

    let typeParam = urlParams.get('type') || urlParams.get('kind') || '';
    typeParam = typeParam.toLowerCase().trim();

    let guest1 = urlParams.get('g1') || urlParams.get('guest1') || '';
    let guest2 = urlParams.get('g2') || urlParams.get('guest2') || '';
    guest1 = guest1.trim();
    guest2 = guest2.trim();

    let toGen = urlParams.get('to_gen') || '';
    let g1Gen = urlParams.get('g1_gen') || '';
    let g2Gen = urlParams.get('g2_gen') || '';
    toGen = toGen.trim();
    g1Gen = g1Gen.trim();
    g2Gen = g2Gen.trim();

    let type = 'single';
    if (typeParam === 'couple' || typeParam === 'pair' || typeParam === '2') {
      type = 'couple';
    } else if (typeParam === 'single' || typeParam === '1') {
      type = 'single';
    } else if (guestName) {
      // Auto-detect couple if not explicitly set
      if (
        guestName.includes(' и ') ||
        guestName.includes(' & ') ||
        guestName.includes(' + ') ||
        guestName.toLowerCase().includes('семья') ||
        guestName.toLowerCase().includes('папа') ||
        guestName.toLowerCase().includes('дедушка')
      ) {
        type = 'couple';
      }
    }

    let appeal = urlParams.get('appeal') || '';
    appeal = appeal.trim();

    let customMsg = urlParams.get('msg') || '';
    customMsg = customMsg.trim();

    if (guestName && !appeal) {
      appeal = (type === 'couple') ? 'Дорогие' : 'Дорогой(ая)';
    }

    // Split names if couple and separate names not provided
    if (type === 'couple' && (!guest1 || !guest2) && guestName) {
      const parts = guestName.split(/\s+и\s+|\s*&\s*|\s*\+\s*/i);
      if (parts.length >= 2) {
        if (!guest1) guest1 = parts[0].trim();
        if (!guest2) guest2 = parts[1].trim();
      }
    }

    // Calculate genitive forms if not explicitly provided in URL
    if (!toGen && guestName) {
      toGen = toGenitive(guestName);
    }
    if (!g1Gen && guest1) {
      g1Gen = toGenitive(guest1);
    }
    if (!g2Gen && guest2) {
      g2Gen = toGenitive(guest2);
    }

    return {
      isPersonalized: Boolean(guestName),
      guestName: guestName,
      toGen: toGen,
      type: type,
      guest1: guest1,
      guest2: guest2,
      g1Gen: g1Gen,
      g2Gen: g2Gen,
      appeal: appeal || (type === 'couple' ? 'Дорогие' : 'Дорогие'),
      customMsg: customMsg
    };
  }

  // 4. APPLY PERSONALIZED GREETING & FORM FLOW TO DOM
  function applyPersonalization() {
    const { isPersonalized, guestName, toGen, type, guest1, guest2, g1Gen, g2Gen, appeal, customMsg } = parsePersonalizedParams();

    const heroAppeal = document.getElementById('hero-greeting-appeal');
    const heroGuest = document.getElementById('hero-guest-name');
    const heroMsg = document.getElementById('hero-greeting-msg');

    const badgeSubtitle = document.getElementById('rsvp-badge-subtitle');
    const badge = document.getElementById('rsvp-personalized-badge');
    const badgeName = document.getElementById('rsvp-badge-name-display');
    const hiddenNameInput = document.getElementById('guest-name-hidden');
    const typeHiddenInput = document.getElementById('invitation-type-hidden');
    const guestNameGroup = document.getElementById('guest-name-group');
    const guestNameInput = document.getElementById('guest-name');

    const form = document.getElementById(RSVP_FORM_ID);
    const singleFlow = document.getElementById('rsvp-single-flow');
    const coupleFlow = document.getElementById('rsvp-couple-flow');
    const attendanceSingleOptions = document.getElementById('attendance-single-options');
    const attendanceCoupleOptions = document.getElementById('attendance-couple-options');
    const coupleSoloAttendeeSelect = document.getElementById('couple-solo-attendee-select');
    const soloGuest1Name = document.getElementById('solo-guest1-name');
    const soloGuest2Name = document.getElementById('solo-guest2-name');

    const coupleDishBlock1 = document.getElementById('couple-dish-block-1');
    const coupleDishBlock2 = document.getElementById('couple-dish-block-2');
    const coupleDishTitle1 = document.getElementById('couple-dish-title-1');
    const coupleDishTitle2 = document.getElementById('couple-dish-title-2');
    const singleHotDishTitle = document.getElementById('single-hot-dish-title');

    const plusOneDetails = document.getElementById('rsvp-plus-one-details');
    const plusOneRadios = document.querySelectorAll('input[name="has_plus_one"]');
    const extendedDetails = document.getElementById('rsvp-extended-details');
    const foodDrinksBlock = document.getElementById('rsvp-food-drinks');
    const wishesGroup = document.getElementById('rsvp-wishes-group');
    const wishesLabel = document.getElementById('rsvp-wishes-label');

    if (typeHiddenInput) {
      typeHiddenInput.value = type;
    }

    if (isPersonalized) {
      if (heroAppeal) heroAppeal.innerText = appeal;
      if (heroGuest) heroGuest.innerText = guestName;
      if (heroMsg) {
        heroMsg.innerText = customMsg || 'Этой осенью мы станем семьёй. И нам очень хочется разделить этот день с вами!';
      }

      if (badge && badgeName && hiddenNameInput) {
        badge.style.display = 'flex';
        // Display polite genitive in badge after "Приглашение для:"
        const displayBadgeName = toGen || guestName;
        badgeName.innerText = displayBadgeName;
        hiddenNameInput.value = guestName;

        if (badgeSubtitle) {
          badgeSubtitle.innerText = 'Приглашение для:';
        }

        if (guestNameGroup) guestNameGroup.style.display = 'none';
        if (guestNameInput) {
          guestNameInput.value = guestName;
          guestNameInput.removeAttribute('required');
        }
      }
    } else {
      if (badge) badge.style.display = 'none';
      if (guestNameGroup) guestNameGroup.style.display = 'flex';
      if (guestNameInput && hiddenNameInput) {
        guestNameInput.setAttribute('required', 'true');
        guestNameInput.addEventListener('input', () => {
          hiddenNameInput.value = guestNameInput.value.trim();
        });
      }
    }

    // Configure Single vs Couple Flow
    if (type === 'couple') {
      if (singleFlow) singleFlow.style.display = 'none';
      if (coupleFlow) coupleFlow.style.display = 'flex';

      if (attendanceSingleOptions) attendanceSingleOptions.style.display = 'none';
      if (attendanceCoupleOptions) attendanceCoupleOptions.style.display = 'flex';

      const g1Label = guest1 || 'Гость 1';
      const g2Label = guest2 || 'Гость 2';
      const g1GenTitle = g1Gen || toGenitive(g1Label) || 'Гостя 1';
      const g2GenTitle = g2Gen || toGenitive(g2Label) || 'Гостя 2';

      if (soloGuest1Name) soloGuest1Name.innerText = g1Label;
      if (soloGuest2Name) soloGuest2Name.innerText = g2Label;

      if (coupleDishTitle1) coupleDishTitle1.innerText = `Горячее блюдо для ${g1GenTitle}:`;
      if (coupleDishTitle2) coupleDishTitle2.innerText = `Горячее блюдо для ${g2GenTitle}:`;

      function updateCoupleAttendanceUI() {
        const attEl = document.querySelector('input[name="attendance_couple"]:checked');
        const selectedAttendance = attEl ? attEl.value : 'обязательно будем вдвоем!';
        const soloWhoEl = document.querySelector('input[name="couple_solo_guest"]:checked');
        const soloWho = soloWhoEl ? soloWhoEl.value : 'guest1';

        const isOnlyZags = selectedAttendance.includes('только в ЗАГСе');
        const isDeclined = selectedAttendance.includes('не сможем');

        if (isDeclined) {
          if (extendedDetails) extendedDetails.style.display = 'none';
          if (coupleSoloAttendeeSelect) coupleSoloAttendeeSelect.classList.remove('visible');
        } else if (isOnlyZags) {
          if (extendedDetails) extendedDetails.style.display = 'flex';
          if (foodDrinksBlock) foodDrinksBlock.style.display = 'none';
          if (wishesGroup) wishesGroup.style.display = 'block';
          if (wishesLabel) wishesLabel.innerText = 'Пожелания или комментарии:';
          if (coupleSoloAttendeeSelect) coupleSoloAttendeeSelect.classList.remove('visible');
        } else if (selectedAttendance === 'буду один / одна') {
          if (extendedDetails) extendedDetails.style.display = 'flex';
          if (foodDrinksBlock) foodDrinksBlock.style.display = 'flex';
          if (wishesGroup) wishesGroup.style.display = 'block';
          if (wishesLabel) wishesLabel.innerText = 'Пожелания или комментарии (аллергии, любимая песня):';
          if (coupleSoloAttendeeSelect) coupleSoloAttendeeSelect.classList.add('visible');

          if (soloWho === 'guest2') {
            if (coupleDishBlock1) coupleDishBlock1.style.display = 'none';
            if (coupleDishBlock2) coupleDishBlock2.style.display = 'flex';
          } else {
            if (coupleDishBlock1) coupleDishBlock1.style.display = 'flex';
            if (coupleDishBlock2) coupleDishBlock2.style.display = 'none';
          }
        } else {
          // 'обязательно будем вдвоем!'
          if (extendedDetails) extendedDetails.style.display = 'flex';
          if (foodDrinksBlock) foodDrinksBlock.style.display = 'flex';
          if (wishesGroup) wishesGroup.style.display = 'block';
          if (wishesLabel) wishesLabel.innerText = 'Пожелания или комментарии (аллергии, любимая песня):';
          if (coupleSoloAttendeeSelect) coupleSoloAttendeeSelect.classList.remove('visible');
          if (coupleDishBlock1) coupleDishBlock1.style.display = 'flex';
          if (coupleDishBlock2) coupleDishBlock2.style.display = 'flex';
        }

        syncAllOptionCards();
      }

      document.querySelectorAll('input[name="attendance_couple"]').forEach(r => {
        r.addEventListener('change', updateCoupleAttendanceUI);
      });
      document.querySelectorAll('input[name="couple_solo_guest"]').forEach(r => {
        r.addEventListener('change', updateCoupleAttendanceUI);
      });

      window.__refreshAttendanceUI = updateCoupleAttendanceUI;
      updateCoupleAttendanceUI();
    } else {
      // Single Flow
      if (singleFlow) singleFlow.style.display = 'flex';
      if (coupleFlow) coupleFlow.style.display = 'none';

      if (attendanceSingleOptions) attendanceSingleOptions.style.display = 'flex';
      if (attendanceCoupleOptions) attendanceCoupleOptions.style.display = 'none';
      if (coupleSoloAttendeeSelect) coupleSoloAttendeeSelect.classList.remove('visible');

      if (singleHotDishTitle) {
        if (guestName) {
          const singleGen = toGen || toGenitive(guestName);
          singleHotDishTitle.innerHTML = `Горячее блюдо для ${singleGen}: <span class="req-star">*</span>`;
        } else {
          singleHotDishTitle.innerHTML = 'Что предпочитаете из горячего? <span class="req-star">*</span>';
        }
      }

      function updateSingleAttendanceUI() {
        const attRadio = document.querySelector('input[name="attendance"]:checked');
        const val = attRadio ? attRadio.value : 'обязательно буду!';
        const isDeclined = val.includes('не получится');
        const isOnlyZags = val.includes('только в ЗАГСе');

        if (isDeclined) {
          if (extendedDetails) extendedDetails.style.display = 'none';
        } else if (isOnlyZags) {
          if (extendedDetails) extendedDetails.style.display = 'flex';
          if (foodDrinksBlock) foodDrinksBlock.style.display = 'none';
          if (wishesGroup) wishesGroup.style.display = 'block';
          if (wishesLabel) wishesLabel.innerText = 'Пожелания или комментарии:';
        } else {
          if (extendedDetails) extendedDetails.style.display = 'flex';
          if (foodDrinksBlock) foodDrinksBlock.style.display = 'flex';
          if (wishesGroup) wishesGroup.style.display = 'block';
          if (wishesLabel) wishesLabel.innerText = 'Пожелания или комментарии (аллергии, любимая песня):';
        }

        syncAllOptionCards();
      }

      // Single attendance change handler
      document.querySelectorAll('input[name="attendance"]').forEach(radio => {
        radio.addEventListener('change', updateSingleAttendanceUI);
      });

      window.__refreshAttendanceUI = updateSingleAttendanceUI;
      updateSingleAttendanceUI();
    }
  }

  // 4. INTERACTIVE RADIO & CHECKBOX CARDS
  function syncAllOptionCards() {
    document.querySelectorAll('.custom-option-card').forEach(card => {
      const input = card.querySelector('input');
      if (!input) return;
      if (input.checked) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }

  function initOptionCards() {
    syncAllOptionCards();

    // Global listener on form to ensure all card states stay 100% in sync
    document.addEventListener('change', (e) => {
      if (e.target && (e.target.type === 'radio' || e.target.type === 'checkbox')) {
        syncAllOptionCards();
      }
    });

    const cards = document.querySelectorAll('.custom-option-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        setTimeout(syncAllOptionCards, 0);
      });
    });
  }

  // 5. MAIN RSVP LOGIC & WEB3FORMS SUBMISSION
  function startRsvp() {
    applyPersonalization();
    initOptionCards();

    const form = document.getElementById(RSVP_FORM_ID);
    const accessKeyInput = document.getElementById('web3forms-access-key') || (form ? form.querySelector('input[name="access_key"]') : null);
    const modal = document.getElementById(SUCCESS_MODAL_ID);
    const modalCloseBtn = document.getElementById('modal-close-btn');

    // Load stored key if available
    const savedKey = localStorage.getItem(KEY_STORAGE_KEY);
    if (savedKey && accessKeyInput) {
      accessKeyInput.value = savedKey;
    }

    // Form Submission Handler
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('rsvp-submit-btn');
        const submitText = document.getElementById('submit-btn-text');
        const submitSpinner = document.getElementById('submit-spinner');

        // Resolve Guest Name
        const hiddenNameInput = document.getElementById('guest-name-hidden');
        const manualNameInput = document.getElementById('guest-name');
        const typeHiddenInput = document.getElementById('invitation-type-hidden');
        const currentType = typeHiddenInput ? typeHiddenInput.value : 'single';
        const { guest1, guest2 } = parsePersonalizedParams();

        let guestNameVal = '';
        if (hiddenNameInput && hiddenNameInput.value.trim()) {
          guestNameVal = hiddenNameInput.value.trim();
        } else if (manualNameInput && manualNameInput.value.trim()) {
          guestNameVal = manualNameInput.value.trim();
          if (hiddenNameInput) hiddenNameInput.value = guestNameVal;
        }

        if (!guestNameVal) {
          if (window.showToast) window.showToast('Пожалуйста, укажите ваше имя', 'error');
          if (manualNameInput) manualNameInput.focus();
          return;
        }

        // Attendance value based on type
        let attendanceVal = '';
        if (currentType === 'couple') {
          const attRadio = form.querySelector('input[name="attendance_couple"]:checked');
          attendanceVal = attRadio ? attRadio.value : 'обязательно будем вдвоем!';
        } else {
          const attRadio = form.querySelector('input[name="attendance"]:checked');
          attendanceVal = attRadio ? attRadio.value : 'обязательно буду!';
        }

        const isDeclined = attendanceVal.includes('не получится') || attendanceVal.includes('не сможем');
        const keyInput = document.getElementById('web3forms-access-key') || (form ? form.querySelector('input[name="access_key"]') : null);
        const currentKey = keyInput ? keyInput.value.trim() : '';

        // Check hCaptcha if present in DOM
        const captchaContainer = form.querySelector('.h-captcha');
        const hCaptchaResponse = form.querySelector('[name="h-captcha-response"]')?.value || form.querySelector('[name="g-recaptcha-response"]')?.value || '';
        if (captchaContainer && !hCaptchaResponse && currentKey && currentKey !== 'YOUR_ACCESS_KEY_HERE') {
          if (window.showToast) {
            window.showToast('Пожалуйста, подтвердите капчу («Я не робот»)', 'warning');
          } else {
            alert('Пожалуйста, подтвердите капчу');
          }
          return;
        }

        // Set button loading state
        if (submitBtn) submitBtn.disabled = true;
        if (submitText) submitText.innerText = 'Отправка...';
        if (submitSpinner) submitSpinner.style.display = 'inline-block';

        const formData = new FormData();
        if (currentKey) formData.set('access_key', currentKey);
        if (hCaptchaResponse) formData.set('h-captcha-response', hCaptchaResponse);
        formData.set('subject', `💍 Подтверждение присутствия: ${guestNameVal}`);
        formData.set('from_name', 'Свадебный сайт Ивана и Юлии');
        formData.set('Guest_Name', guestNameVal);
        formData.set('Invitation_Type', currentType === 'couple' ? 'На пару' : 'На 1 человека');
        formData.set('Attendance_Status', attendanceVal);

        const isOnlyZags = attendanceVal.includes('только в ЗАГСе') || attendanceVal.includes('только на регистрации');

        if (isOnlyZags) {
          formData.set('Presence_Format', 'Только торжественная регистрация в ЗАГСе (без банкета)');
          const wishesVal = form.querySelector('textarea[name="wishes"]')?.value.trim();
          formData.set('Wishes_and_Comments', wishesVal || '—');
        } else if (!isDeclined) {
          if (currentType === 'couple') {
            const g1Name = guest1 || 'Гость 1';
            const g2Name = guest2 || 'Гость 2';

            if (attendanceVal === 'буду один / одна') {
              const soloWho = form.querySelector('input[name="couple_solo_guest"]:checked')?.value || 'guest1';
              const attendingName = (soloWho === 'guest2') ? g2Name : g1Name;
              const nonAttendingName = (soloWho === 'guest2') ? g1Name : g2Name;
              const dish = (soloWho === 'guest2')
                ? form.querySelector('input[name="hot_dish_g2"]:checked')?.value
                : form.querySelector('input[name="hot_dish_g1"]:checked')?.value;

              formData.set('Presence_Format', 'Сможет прийти только один гость из пары');
              formData.set('Attending_Guest', attendingName);
              formData.set('Declined_Guest', nonAttendingName);
              formData.set('Hot_Dish_Attending_Guest', `${attendingName}: ${dish || 'Мясо (свинина)'}`);
            } else {
              // Both attend
              const dishG1 = form.querySelector('input[name="hot_dish_g1"]:checked')?.value || 'Мясо (свинина)';
              const dishG2 = form.querySelector('input[name="hot_dish_g2"]:checked')?.value || 'Мясо (свинина)';

              formData.set('Presence_Format', 'Будут вдвоем');
              formData.set('Hot_Dish_Guest1', `${g1Name}: ${dishG1}`);
              formData.set('Hot_Dish_Guest2', `${g2Name}: ${dishG2}`);
            }
          } else {
            // Single Flow
            const dishSingle = form.querySelector('input[name="hot_dish"]:checked')?.value || 'Мясо (свинина)';
            formData.set('Hot_Dish', dishSingle);
          }

          // Drinks preferences
          const checkedDrinks = Array.from(form.querySelectorAll('input[name="drinks"]:checked'))
            .map(cb => cb.value)
            .join(', ');
          formData.set('Drinks_Preferences', checkedDrinks || 'Не указано');

          // Wishes
          const wishesVal = form.querySelector('textarea[name="wishes"]')?.value.trim();
          formData.set('Wishes_and_Comments', wishesVal || '—');
        }

        try {
          let response;
          // Demo simulation if key is empty or placeholder
          if (!currentKey || currentKey === 'YOUR_ACCESS_KEY_HERE' || currentKey === 'YOUR_WEB3FORMS_ACCESS_KEY') {
            await new Promise(resolve => setTimeout(resolve, 800));
            response = { status: 200, json: async () => ({ success: true }) };
          } else {
            response = await fetch('https://api.web3forms.com/submit', {
              method: 'POST',
              body: formData
            });
          }

          const result = await response.json();

          if ((response.status === 200 || response.status === 201) && result.success) {
            const modalGuestName = document.getElementById('modal-guest-name');
            if (modalGuestName) {
              modalGuestName.innerText = guestNameVal ? `${guestNameVal}, спасибо!` : 'Спасибо!';
            }
            if (modal) {
              modal.classList.add('active');
            }

            triggerConfetti();
            form.reset();

            // Explicitly restore food & drinks visibility and refresh UI
            const extendedDetails = document.getElementById('rsvp-extended-details');
            if (extendedDetails) extendedDetails.style.display = 'flex';
            const foodDrinksBlock = document.getElementById('rsvp-food-drinks');
            if (foodDrinksBlock) foodDrinksBlock.style.display = 'flex';

            if (window.__refreshAttendanceUI) {
              window.__refreshAttendanceUI();
            }

            // Reset option cards active styling
            syncAllOptionCards();

            if (hiddenNameInput) hiddenNameInput.value = guestNameVal;
            if (manualNameInput && guestNameVal) manualNameInput.value = guestNameVal;

            const coupleSoloAttendeeSelect = document.getElementById('couple-solo-attendee-select');
            if (coupleSoloAttendeeSelect) coupleSoloAttendeeSelect.classList.remove('visible');

            const coupleDishBlock1 = document.getElementById('couple-dish-block-1');
            const coupleDishBlock2 = document.getElementById('couple-dish-block-2');
            if (coupleDishBlock1) coupleDishBlock1.style.display = 'flex';
            if (coupleDishBlock2) coupleDishBlock2.style.display = 'flex';

            const plusOneDetails = document.getElementById('rsvp-plus-one-details');
            if (plusOneDetails) plusOneDetails.classList.remove('visible');
          } else {
            throw new Error(result.message || 'Ошибка отправки формы. Попробуйте снова.');
          }
        } catch (error) {
          console.error('RSVP Error:', error);
          if (window.showToast) {
            window.showToast(error.message || 'Произошла ошибка при отправке.', 'error');
          } else {
            alert(error.message || 'Ошибка отправки');
          }
        } finally {
          if (submitBtn) submitBtn.disabled = false;
          if (submitText) submitText.innerText = 'Отправить';
          if (submitSpinner) submitSpinner.style.display = 'none';
          if (window.hcaptcha && typeof window.hcaptcha.reset === 'function') {
            try {
              window.hcaptcha.reset();
            } catch (err) { }
          }
        }
      });
    }

    // Modal Close
    if (modalCloseBtn && modal) {
      modalCloseBtn.addEventListener('click', () => modal.classList.remove('active'));
    }
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startRsvp);
  } else {
    startRsvp();
  }

  // 6. Confetti Particle Animation
  function triggerConfetti() {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '3000';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#8C2730', '#C5A059', '#F6F1E5', '#A6323D', '#EADBCC', '#FFFFFF'];
    const particles = [];
    const count = 120;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2 + 50,
        r: Math.random() * 6 + 4,
        d: Math.random() * count,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.floor(Math.random() * 10) - 10,
        tiltAngleIncremental: Math.random() * 0.07 + 0.05,
        tiltAngle: 0,
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 0.7) * 20,
        gravity: 0.35,
        opacity: 1
      });
    }

    let animationFrame;
    const startTime = Date.now();

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let active = false;

      particles.forEach(p => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2 + p.vy;
        p.x += Math.sin(p.d) * 2 + p.vx;
        p.vy += p.gravity;
        p.vx *= 0.98;
        p.opacity = Math.max(0, 1 - (Date.now() - startTime) / 3500);

        if (p.opacity > 0 && p.y < canvas.height + 20) {
          active = true;
          ctx.beginPath();
          ctx.lineWidth = p.r / 2;
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = p.opacity;
          ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
          ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
          ctx.stroke();
        }
      });

      if (active) {
        animationFrame = requestAnimationFrame(draw);
      } else {
        cancelAnimationFrame(animationFrame);
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
      }
    }

    draw();
  }
})();
