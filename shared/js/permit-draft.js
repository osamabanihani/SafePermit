/* Basic Info recovery only. Canonical creation/validation remains with the wizard. */
(function () {
  'use strict';
  window.SafePermitDraft = function (options) {
    const key = 'safePermitDraftBasicInfo', recoveryKey = key + ':recovery:v1';
    const form = options.form;
    const panel = document.getElementById('draftRecovery');
    const message = document.getElementById('draftRecoveryMessage');
    const restore = document.getElementById('recoverDraft');
    const fresh = document.getElementById('newDraft');
    const contextLink = document.getElementById('draftContextLink');
    const state = document.getElementById('draftState');
    const attachmentNote = document.getElementById('attachmentRetention');
    const fields = options.fields.map(input => input.id);
    const query = new URLSearchParams(location.search);
    const context = query.get('mode') === 'correction' ? 'correction:' + (query.get('id') || '') : 'new';
    const pick = (en, ar) => document.documentElement.lang === 'ar' ? ar : en;
    let baseline = JSON.stringify(options.read()), expected, expectedRecovery, candidate, timer;
    let blocked = false, leaving = false, status = 'unsaved', failure = false;
    let candidateMeta = null, contextMismatch = false;
    let recoveryCopy = null;
    const copy = {
      unsaved: ['Unsaved changes. Save a draft or wait for browser recovery.', 'تغييرات غير محفوظة. احفظ المسودة أو انتظر حفظ الاسترداد في المتصفح.'],
      saving: ['Saving on this browser…', 'جارٍ الحفظ في هذا المتصفح…'],
      saved: ['Saved on this browser only. Validation is still required before continuing.', 'محفوظ في هذا المتصفح فقط. لا يزال التحقق مطلوبًا قبل المتابعة.'],
      recovered: ['Recovered. Review every field and schedule before continuing.', 'تم الاسترداد. راجع جميع الحقول والجدول الزمني قبل المتابعة.'],
      failed: ['Save failed or storage changed in another tab. Your entries remain here. Retry Save as Draft; reload to inspect another tab’s changes.', 'فشل الحفظ أو تغير التخزين في علامة تبويب أخرى. بياناتك باقية هنا. أعد محاولة حفظ المسودة؛ أعد التحميل لفحص تغييرات التبويب الآخر.']
    };
    function paint(next) {
      status = next; state.dataset.state = next; state.textContent = pick(...copy[next]);
      attachmentNote.textContent = pick('Files are selected for this page only. File contents and metadata are not saved or uploaded. Reselect files after leaving or recovering this page.', 'اختيار الملفات لهذه الصفحة فقط. لا تُحفظ محتويات الملفات أو بياناتها ولا تُرفع. أعد اختيار الملفات بعد مغادرة الصفحة أو استردادها.');
      document.getElementById('draftScopeNote').textContent = pick('Recovery and Start fresh apply only to Basic Info. Saved Risk Assessment and Checklist steps remain; review them separately.', 'ينطبق الاسترداد والبدء من جديد على المعلومات الأساسية فقط. تبقى خطوات تقييم المخاطر وقائمة التحقق المحفوظة؛ راجعهما بشكل منفصل.');
    }
    function dirty() { return JSON.stringify(options.read()) !== baseline; }
    function valid(data) {
      return data && typeof data === 'object' && !Array.isArray(data) &&
        fields.every(id => data[id] === undefined || typeof data[id] === 'string') &&
        Object.keys(data).every(id => fields.includes(id) || id === '_draftMeta');
    }
    function current() {
      if (expected === undefined) {
        expected = localStorage.getItem(key);
        expectedRecovery = localStorage.getItem(recoveryKey);
      }
      return localStorage.getItem(key) === expected && localStorage.getItem(recoveryKey) === expectedRecovery;
    }
    function persist(canonical) {
      if (blocked) return false;
      clearTimeout(timer); paint('saving');
      try {
        if (!current()) throw Error('Storage conflict');
        const data = options.read();
        const meta = {version:1, context, savedAt:new Date().toISOString()};
        if (canonical) {
          const raw = JSON.stringify({...data, workTitle:data.workTitle.trim(), description:data.description.trim(), _draftMeta:meta});
          localStorage.setItem(key, raw);
          // A successful setItem is required; failures never advance the wizard.
          expected = raw;
        } else {
          const raw = JSON.stringify({data, meta, base:expected});
          localStorage.setItem(recoveryKey, raw); expectedRecovery = raw;
        }
        baseline = JSON.stringify(options.read()); failure = false; paint('saved'); return true;
      } catch (_) { failure = true; paint('failed'); return false; }
    }
    function change(event) {
      if (blocked || event.target.type === 'file') return;
      if (!dirty()) return;
      paint('unsaved'); clearTimeout(timer);
      timer = setTimeout(() => persist(false), 700);
    }
    form.addEventListener('input', change); form.addEventListener('change', change);
    function unlock() {
      blocked = false; panel.hidden = true; form.inert = false;
      options.fields[0].focus({preventScroll:true});
    }
    function offer(data, meta, text) {
      recoveryCopy = text;
      candidate = data; candidateMeta = meta;
      blocked = true; form.inert = true; panel.hidden = false;
      message.textContent = pick(...text);
      restore.hidden = !data;
      restore.textContent = pick('Recover and review draft', 'استرداد المسودة ومراجعتها');
      fresh.textContent = pick('Start fresh on this page', 'بدء مسودة جديدة في هذه الصفحة');
      panel.dataset.recoveryKind = !data ? 'invalid' : !meta ? 'legacy' :
        Date.now() - Date.parse(meta.savedAt) > 7 * 86400000 ? 'stale' : 'current';
      if (meta?.savedAt) message.textContent += pick(' Saved at: ', ' وقت الحفظ: ') + meta.savedAt;
      if (panel.dataset.recoveryKind === 'stale') message.textContent += pick(' This draft is older than 7 days. Confirm recovery explicitly.', ' عمر هذه المسودة يتجاوز ٧ أيام. أكّد الاسترداد صراحةً.');
      panel.setAttribute('aria-label', pick('Draft recovery','استرداد المسودة'));
    }
    restore.addEventListener('click', () => {
      if (!candidate) return;
      options.restore(candidate); baseline = JSON.stringify(options.read());
      unlock(); paint('recovered');
    });
    fresh.addEventListener('click', () => {
      if (contextMismatch) return;
      // Do not erase another step or a correction context. Existing bytes remain until an explicit save.
      baseline = ''; unlock(); paint('unsaved');
    });
    window.addEventListener('beforeunload', event => {
      if (!leaving && !blocked && (dirty() || failure || document.getElementById('attachment').files.length)) {
        event.preventDefault(); event.returnValue = '';
      }
    });
    window.addEventListener('storage', event => {
      if (event.key === key || event.key === recoveryKey || event.key === null) {
        clearTimeout(timer); failure = true; paint('failed');
      }
    });
    function refreshLanguage() {
      paint(status);
      if (blocked && recoveryCopy) offer(candidate, candidateMeta, recoveryCopy);
      if (contextMismatch) contextLink.textContent = pick('Return to the intended permit workflow','العودة إلى مسار التصريح المقصود');
    }
    document.addEventListener('safepermit:languagechange', refreshLanguage);
    document.addEventListener('safepermit:i18nready', refreshLanguage);
    paint('unsaved');
    try {
      expected = localStorage.getItem(key); expectedRecovery = localStorage.getItem(recoveryKey);
      const correctionRaw = localStorage.getItem('safePermitCorrectionContext');
      const correction = correctionRaw ? JSON.parse(correctionRaw) : null;
      const contextMatches = correction ? context === 'correction:' + correction.id : context === 'new';
      if (!contextMatches) {
        contextMismatch = true;
        offer(null, null, ['A different correction workflow is stored. Return to that permit before editing; this page cannot overwrite its draft.', 'يوجد مسار تصحيح مختلف في التخزين. عُد إلى ذلك التصريح قبل التحرير؛ لا يمكن لهذه الصفحة استبدال مسودته.']);
        fresh.hidden = true; contextLink.hidden = false;
        contextLink.href = correction ? '?mode=correction&id='+encodeURIComponent(correction.id) : '../../permits/';
        contextLink.textContent = pick('Return to the intended permit workflow','العودة إلى مسار التصريح المقصود');
        return {save:() => false, allowLeave:() => {}, isDirty:dirty, isBlocked:() => true};
      }
      let data = expected ? JSON.parse(expected) : null;
      let meta = data?._draftMeta;
      let usableRecovery = false;
      if (expectedRecovery) {
        const recovery = JSON.parse(expectedRecovery);
        if (recovery.base === expected) { data = recovery.data; meta = recovery.meta; usableRecovery = true; }
      }
      const receiptRaw = localStorage.getItem('safePermitSubmittedDraftReceipt');
      let receipt;
      try { receipt = receiptRaw ? JSON.parse(receiptRaw) : null; } catch (_) { receipt = null; }
      const consumed = receipt?.basicRaw === expected && (!usableRecovery || receipt.recoveryRaw === expectedRecovery);
      if (!consumed && (data || expectedRecovery)) {
        const compatible = contextMatches && valid(data) && (!options.compatible || options.compatible(data)) && (!meta || (meta.version === 1 && meta.context === context &&
          Number.isFinite(Date.parse(meta.savedAt)) && Date.parse(meta.savedAt) <= Date.now() + 60000));
        offer(compatible ? data : null, meta, compatible
          ? ['Browser draft found. Confirm this is the intended permit before recovering. Drafts older than 7 days or without version information require review. No files are retained.', 'عُثر على مسودة في المتصفح. تأكد من التصريح المقصود قبل الاسترداد. تتطلب المسودات الأقدم من ٧ أيام أو بلا معلومات إصدار مراجعة. لا يتم الاحتفاظ بالملفات.']
          : ['Invalid, incompatible or different-workflow draft. Recovery is blocked. Start fresh without deleting the stored copy.', 'مسودة تالفة أو غير متوافقة أو لمسار آخر. الاسترداد محظور. ابدأ من جديد دون حذف النسخة المخزنة.']);
      }
    } catch (_) {
      // A malformed payload is different from unavailable storage; both remain untouched.
      offer(null, null, ['Draft could not be read. Start fresh; existing stored data will remain untouched until a successful save.', 'تعذرت قراءة المسودة. ابدأ من جديد؛ ستبقى البيانات المخزنة دون تغيير حتى نجاح الحفظ.']);
      failure = true; paint('failed');
    }
    return {save:() => persist(true), allowLeave:() => {leaving = true; clearTimeout(timer);},
      isDirty:dirty, isBlocked:() => blocked};
  };
})();
