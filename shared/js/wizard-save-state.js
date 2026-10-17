/* Local wizard persistence feedback; never certifies safety or permit validity. */
(function (root) {
  'use strict';
  root.SafePermitWizardSave = function ({form, message, key, read, className, button}) {
    const copy = {
      unsaved:['Unsaved changes. Save before leaving.', 'تغييرات غير محفوظة. احفظ قبل المغادرة.'],
      saving:['Saving draft…', 'جارٍ حفظ المسودة…'],
      saved:['Draft saved locally.', 'حُفظت المسودة محليًا.'],
      failed:['Draft not saved. Your edits remain. Check browser storage and retry Save Draft.', 'لم تُحفظ المسودة. بقيت تعديلاتك. تحقق من تخزين المتصفح وأعد محاولة حفظ المسودة.']
    };
    let baseline = JSON.stringify(read()), state = 'unsaved', timer, version = 0, leaving = false;
    function render() {
      message.dataset.saveState = state;
      message.className = className + (state === 'saved' ? ' is-success' : state === 'failed' ? ' is-error' : '');
      message.setAttribute('role', state === 'failed' ? 'alert' : 'status');
      message.setAttribute('aria-live', state === 'failed' ? 'assertive' : 'polite');
      message.setAttribute('aria-atomic', 'true');
      message.textContent = copy[state][root.document.documentElement.lang === 'ar' ? 1 : 0];
      form.setAttribute('aria-busy', state === 'saving' ? 'true' : 'false');
    }
    function cancel() {
      clearTimeout(timer); version++; leaving = false;
      form.classList.remove('is-completing','is-submitting');
      form.querySelectorAll('[aria-busy=true]').forEach(node => node.removeAttribute('aria-busy'));
      button.classList.remove('is-sp-confirmed');
    }
    function dirty() {cancel();state='unsaved';render();}
    function save() {
      cancel();state='saving';render();
      try {
        const raw = JSON.stringify(read());
        root.localStorage.setItem(key, raw);
        if (root.localStorage.getItem(key) !== raw) throw Error('Persistence could not be confirmed');
        baseline = raw; state='saved'; render(); return true;
      } catch (_) {state='failed';render();return false;}
    }
    form.addEventListener('input',dirty); form.addEventListener('change',dirty);
    root.addEventListener('beforeunload', event => {
      if (!leaving && (state === 'failed' || JSON.stringify(read()) !== baseline)) {
        event.preventDefault();event.returnValue='';
      }
    });
    for (const event of ['safepermit:languagechange','safepermit:i18nready']) document.addEventListener(event,render);
    render();
    return {save, dirty, cancel,
      fail() {cancel();state='failed';render();},
      navigate(url, delay) {
        const snapshot = JSON.stringify(read()), run = version;
        timer = root.setTimeout(() => {
          if (run !== version) return;
          try {
            if (snapshot !== JSON.stringify(read()) || root.localStorage.getItem(key) !== snapshot) {dirty();return;}
            leaving=true;root.location.href=url;
          } catch (_) {cancel();state='failed';render();}
        }, delay);
      }
    };
  };
})(window);
