/* Read-only completion feedback. Never writes or reverses a permit decision. */
(function (root) {
  'use strict';
  let active = null;
  function open(overlay, opener) {
    const dialog = overlay.querySelector('[role="dialog"]');
    if (!dialog) return false;
    if (active?.overlay === overlay) return true;
    const competing = Array.from(document.querySelectorAll('[role="dialog"][aria-modal="true"]'))
      .some(node => node !== dialog && node.getClientRects().length && !node.closest('[inert]'));
    if (competing) {
      // An approval may finish while a reference dialog is open. Do not steal
      // its focus or create two competing focus traps; present after dismissal.
      if (!overlay._completionWaiting) {
        const observer = new MutationObserver(() => {
          if (!Array.from(document.querySelectorAll('[role="dialog"][aria-modal="true"]'))
            .some(node => node !== dialog && node.getClientRects().length)) {
            observer.disconnect(); overlay._completionWaiting = false; open(overlay, opener);
          }
        });
        overlay._completionWaiting = true;
        observer.observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['hidden','class','style']});
      }
      return false;
    }
    const previousOverflow = document.body.style.overflow;
    const background = Array.from(document.body.children).filter(node => node !== overlay && !node.matches('script,style,link'))
      .map(node => [node, node.inert]);
    const heading = dialog.querySelector('h1,h2,h3') || dialog;
    heading.tabIndex = -1;
    let closeButton = dialog.querySelector('[data-completion-close]');
    if (!closeButton) {
      closeButton = document.createElement('button'); closeButton.type = 'button';
      closeButton.className = 'sp-btn sp-btn--secondary'; closeButton.dataset.completionClose = '';
      closeButton.setAttribute('data-i18n-ignore','');
      (dialog.querySelector('[class$="__actions"]') || dialog).append(closeButton);
    }
    const label = () => { closeButton.textContent = document.documentElement.lang === 'ar' ? 'إغلاق التأكيد' : 'Close confirmation'; };
    label();
    const controls = () => Array.from(dialog.querySelectorAll('a[href],button,[tabindex]'))
      .filter(node => !node.disabled && node.tabIndex >= 0 && !node.closest('[inert],[hidden]') && node.getClientRects().length);
    function close() {
      overlay.hidden = true; overlay.classList.remove('is-open');
      background.forEach(([node,inert]) => { node.inert = inert; });
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', key, true); document.removeEventListener('focusin', focus);
      document.removeEventListener('safepermit:languagechange',label); closeButton.removeEventListener('click',close);
      active = null;
      const feedback = document.getElementById('reviewMessage') || document.querySelector('main h1');
      if (feedback) { feedback.tabIndex = -1; feedback.setAttribute('role','status'); if (feedback.id === 'reviewMessage' && !feedback.textContent.trim()) feedback.textContent = heading.textContent; }
      const target = opener?.isConnected && !opener.disabled && !opener.closest('[hidden],[inert]') ? opener : feedback;
      target?.focus({preventScroll:true});
    }
    function key(event) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); }
      else if (event.key === 'Tab') {
        const list = controls(), index = list.indexOf(document.activeElement);
        if (!list.length) { event.preventDefault(); heading.focus(); }
        else if (index < 0 || (!event.shiftKey && index === list.length-1) || (event.shiftKey && index === 0)) {
          event.preventDefault(); list[event.shiftKey ? list.length-1 : 0].focus();
        }
      }
    }
    function focus(event) { if (!dialog.contains(event.target)) heading.focus({preventScroll:true}); }
    overlay.hidden = false; overlay.classList.add('is-open');
    background.forEach(([node]) => { node.inert = true; }); document.body.style.overflow = 'hidden';
    active = {overlay}; closeButton.addEventListener('click',close);
    document.addEventListener('keydown',key,true); document.addEventListener('focusin',focus);
    document.addEventListener('safepermit:languagechange',label); heading.focus({preventScroll:true});
    return true;
  }
  root.SafePermitCompletion = Object.freeze({open});
})(window);
