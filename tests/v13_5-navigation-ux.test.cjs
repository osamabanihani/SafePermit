const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const roles = ['worker','supervisor','safety','admin'];
const js = read('shared/js/session-sidebar.js');
const style = read('shared/css/session-sidebar.css');
const motion = read('shared/js/motion.js');

test('four role sidebars provide Home and prioritized core routes without deleting any route', () => {
  for (const role of roles) {
    assert.match(js, new RegExp(role + ': \\["home", "dashboard"'));
    const shell = read(role + '/dashboard/index.html');
    assert.ok(shell.includes(role + 'Sidebar'));
  }
  assert.match(js, /nav\.prepend\(homeLink\)/);
  assert.match(js, /if \(!hasConfiguredGroups\) nav\.replaceChildren\(\.\.\.links\)/);
  assert.match(js, /const secondaryLinks = links\.filter/);
  assert.match(js, /group\.contains\(current\)/);
});
// v13.6: Quick Find also opens permits by ID (approved), labelled as local demo records, never as access control.
test('finder works with keyboard, localizes search, and stays a navigation aid', () => {
  for (const needle of ['event.key.toLowerCase() === "k"', 'event.key === "Escape"', 'event.key === "ArrowDown"', 'event.key === "Enter"', 'dataset.spNavAr', 'sp-session-search-result']) {
    assert.ok(js.includes(needle), needle);
  }
  assert.ok(js.includes('"بحث سريع"'));
  assert.ok(js.includes('this list is not access control'));
  assert.ok(!js.includes('localStorage.setItem("safePermitQuickSearch')); // no sensitive query persistence
  assert.match(style, /prefers-reduced-motion: reduce/);
});
test('existing role navigation stays native and page transitions are subtle', () => {
  assert.ok(motion.includes('sp-role-subtle-transition'));
  assert.ok(read('shared/css/motion.css').includes('sp-workspace-arrive'));
  assert.ok(read('shared/js/theme-init.js').includes('(worker|supervisor|safety|admin)'));
});
test('updated asset versions in all role pages avoid stale old shell', () => {
  for (const role of roles) {
    for (const html of walk(path.join(root, role))) {
      const src = fs.readFileSync(html, 'utf8');
      if (!src.includes('shared/js/shared.js')) continue;
      assert.match(src, /shared\/js\/shared\.js\?v=13\.6\.0/);
      if (src.includes('shared/js/motion.js')) assert.match(src, /shared\/js\/motion\.js\?v=13\.6\.0/);
    }
  }
  assert.ok(read('shared/js/shared.js').includes('session-sidebar.js?v=13.6.0'));
});
function walk(folder) {
  return fs.readdirSync(folder, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(folder,e.name)) : /\.html$/.test(e.name) ? [path.join(folder,e.name)] : []);
}
