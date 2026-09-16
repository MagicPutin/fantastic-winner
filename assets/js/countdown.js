/**
 * Countdown Timer & Calendar Generator
 * Target Wedding Date: November 17, 2026, 10:50
 * Couple: Иван & Юлия (Санкт-Петербург)
 */

(function () {
  // CONFIGURATION: Wedding date (Month is 0-indexed: 10 = November)
  const WEDDING_DATE = new Date(2026, 10, 17, 10, 50, 0);

  const EVENT_DETAILS = {
    title: 'Свадьба Ивана и Юлии',
    description: 'Торжественная регистрация брака во Дворце бракосочетания № 1 (сбор в 10:50, церемония в 11:20) и праздничный банкет в Особняке Брюллова (12:15 - 16:15).',
    location: 'Дворец бракосочетания № 1 (Английская наб., 28) / Особняк Брюллова (наб. Лейтенанта Шмидта, 37), Санкт-Петербург',
    startDate: new Date(2026, 10, 17, 10, 50, 0),
    endDate: new Date(2026, 10, 17, 16, 15, 0)
  };

  const daysEl = document.getElementById('timer-days');
  const hoursEl = document.getElementById('timer-hours');
  const minutesEl = document.getElementById('timer-minutes');
  const secondsEl = document.getElementById('timer-seconds');

  function updateCountdown() {
    const now = new Date().getTime();
    const distance = WEDDING_DATE.getTime() - now;

    if (distance < 0) {
      if (daysEl) daysEl.innerText = '00';
      if (hoursEl) hoursEl.innerText = '00';
      if (minutesEl) minutesEl.innerText = '00';
      if (secondsEl) secondsEl.innerText = '00';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    if (daysEl) daysEl.innerText = String(days);
    if (hoursEl) hoursEl.innerText = String(hours);
    if (minutesEl) minutesEl.innerText = String(minutes);
    if (secondsEl) secondsEl.innerText = String(seconds);
  }

  // Format date to ICS ISO format (YYYYMMDDTHHmmssZ)
  function formatICSDate(date) {
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  }

  // Generate and Download .ics File (Apple, Outlook, Android)
  function downloadICS() {
    const start = formatICSDate(EVENT_DETAILS.startDate);
    const end = formatICSDate(EVENT_DETAILS.endDate);

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Wedding Invitation//RU',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `SUMMARY:${EVENT_DETAILS.title}`,
      `DESCRIPTION:${EVENT_DETAILS.description}`,
      `LOCATION:${EVENT_DETAILS.location}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      'DESCRIPTION:Напоминание о свадьбе Ивана и Юлии',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'wedding-ivan-yulia.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (window.showToast) {
      window.showToast('Событие добавлено в Apple Календарь!');
    }
  }

  // Generate Google Calendar Link
  function openGoogleCalendar() {
    const start = formatICSDate(EVENT_DETAILS.startDate);
    const end = formatICSDate(EVENT_DETAILS.endDate);
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(EVENT_DETAILS.title)}&dates=${start}/${end}&details=${encodeURIComponent(EVENT_DETAILS.description)}&location=${encodeURIComponent(EVENT_DETAILS.location)}`;
    window.open(url, '_blank');
  }

  // Init
  function startCountdown() {
    updateCountdown();
    setInterval(updateCountdown, 1000);

    const appleBtn = document.getElementById('btn-add-apple');
    const icsBtn = document.getElementById('btn-add-ics');
    const googleBtn = document.getElementById('btn-add-google');

    if (appleBtn) appleBtn.addEventListener('click', downloadICS);
    if (icsBtn) icsBtn.addEventListener('click', downloadICS);
    if (googleBtn) googleBtn.addEventListener('click', openGoogleCalendar);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startCountdown);
  } else {
    startCountdown();
  }
})();
