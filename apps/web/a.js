/* global fetch, document, window */
(function () {
  'use strict';

  const API_BASE = '__API_BASE_URL__'; // replaced at deploy time

  const $ = (id) => document.getElementById(id);
  const accountId = window.location.pathname.split('/').filter(Boolean).pop() || '';

  function show(id) { $(id).classList.remove('hidden'); }
  function hide(id) { $(id).classList.add('hidden'); }
  function setState(msg) {
    hide('loading');
    $('state-msg').textContent = msg;
    show('state-msg');
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  async function init() {
    if (!accountId) { setState('Author not found.'); return; }

    let data;
    try {
      const res = await fetch(`${API_BASE}/a/${accountId}`);
      if (res.status === 404) { setState('Author not found.'); return; }
      if (!res.ok) { setState('Something went wrong. Please try again.'); return; }
      data = await res.json();
    } catch {
      setState('Could not load. Check your connection and try again.');
      return;
    }

    hide('loading');

    $('author-name').textContent = data.displayName;
    const count = data.quotes.length;
    $('quote-count').textContent = count === 0
      ? 'No public quotes yet.'
      : count === 1 ? '1 public quote' : `${count} public quotes`;
    show('profile');

    if (count === 0) return;

    const list = $('quote-list');
    for (const q of data.quotes) {
      const item = document.createElement('div');
      item.className = 'quote-item';

      const text = document.createElement('p');
      text.className = 'quote-text';
      const body = escapeHtml(q.text.replace(/^"|"$/g, '').trim());
      text.innerHTML = '<span class="quote-mark quote-open">"</span>' + body + '<span class="quote-mark quote-close">"</span>';

      const date = document.createElement('p');
      date.className = 'quote-date';
      date.textContent = formatDate(q.captured_at);

      item.appendChild(text);
      item.appendChild(date);
      list.appendChild(item);
    }
    show('quote-list');
  }

  init();
})();
