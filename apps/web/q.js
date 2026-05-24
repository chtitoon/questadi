/* global fetch, document, window */
(function () {
  'use strict';

  const API_BASE = '__API_BASE_URL__'; // replaced at deploy time, e.g. https://api.questadi.com

  const $ = (id) => document.getElementById(id);
  const token = window.location.pathname.split('/').filter(Boolean).pop() || '';

  function show(id)  { $(id).classList.remove('hidden'); }
  function hide(id)  { $(id).classList.add('hidden'); }
  function setState(msg) {
    hide('loading'); hide('quote-card');
    $('state-msg').textContent = msg;
    show('state-msg');
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  async function init() {
    if (!token) { setState('This link was not found.'); return; }

    let data;
    try {
      const res = await fetch(`${API_BASE}/tokens/${token}`);
      if (res.status === 404) { setState('This link was not found.'); return; }
      if (res.status === 410) {
        const body = await res.json().catch(() => ({}));
        setState(body.code === 'QUOTE_DELETED'
          ? 'This quote has been removed.'
          : 'This link has expired.');
        return;
      }
      if (!res.ok) { setState('Something went wrong. Please try again.'); return; }
      data = await res.json();
    } catch {
      setState('Could not load. Check your connection and try again.');
      return;
    }

    // Render quote
    const quoteBody = escapeHtml(data.quoteText.replace(/^"|"$/g, '').trim());
    $('quote-text').innerHTML = '<span class="quote-mark quote-open">“</span>' + quoteBody + '<span class="quote-mark quote-close">”</span>';
    const authorLink = document.createElement('a');
    authorLink.href = `/authors/${encodeURIComponent(data.authorAccountId)}`;
    authorLink.textContent = data.authorDisplayName;
    $('quote-meta').innerHTML = '— ';
    $('quote-meta').appendChild(authorLink);
    $('quote-secondary').textContent = `Captured by ${escapeHtml(data.capturerFirstName)} · ${formatDate(data.captured_at)}`;
    show('quote-secondary');

    if (data.is_public) {
      hide('btn-public');
      show('badge-public');
    }

    if (data.removal_requested) {
      hide('btn-removal');
      show('label-removal');
    }

    hide('loading');
    show('quote-card');
    show('quote-badges');

    // Make public flow
    $('btn-public').addEventListener('click', () => show('confirm-dialog'));
    $('btn-cancel').addEventListener('click',  () => hide('confirm-dialog'));
    $('btn-confirm').addEventListener('click', async () => {
      hide('confirm-dialog');
      $('btn-public').disabled = true;
      $('btn-public').textContent = '…';
      try {
        await fetch(`${API_BASE}/tokens/${token}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPublic: true }),
        });
        hide('btn-public');
        show('badge-public');
      } catch {
        $('btn-public').textContent = 'Make this public';
        $('btn-public').disabled = false;
      }
    });

    // Request removal flow
    $('btn-removal').addEventListener('click', async () => {
      $('btn-removal').disabled = true;
      $('btn-removal').textContent = '…';
      try {
        await fetch(`${API_BASE}/tokens/${token}/removal-requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        hide('btn-removal');
        show('label-removal');
      } catch {
        $('btn-removal').textContent = 'Request removal';
        $('btn-removal').disabled = false;
      }
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  init();
})();
