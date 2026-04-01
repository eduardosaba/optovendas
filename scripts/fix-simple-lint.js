const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
      files.push(...walk(full));
    } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function processFile(file) {
  let src = fs.readFileSync(file, 'utf8');
  let orig = src;
  let changed = false;

  // 1) Add alt="" to <img ...> tags missing alt attribute
  src = src.replace(/<img\b([^>]*?)>/gmi, (match, attrs) => {
    if (/\balt\s*=/.test(attrs)) return match;
    changed = true;
    // place before closing
    const closing = match.endsWith('/>') ? '/>' : '>';
    const inner = attrs.trim();
    const space = inner.length ? ' ' : '';
    return `<img${space}${inner} alt=""${closing}`;
  });

  // 2) Convert catch (e) { ... } to catch { ... } when identifier not used
  // Use a regex that finds catch (id) { ... } occurrences
  src = src.replace(/catch\s*\(\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\)\s*\{([\s\S]*?)\}/gmi, (match, id, body) => {
    // if id appears in body, keep as is
    const re = new RegExp('\\b' + id + '\\b');
    if (re.test(body)) return match;
    changed = true;
    return 'catch {' + body + '}';
  });

  if (changed && src !== orig) {
    fs.copyFileSync(file, file + '.bak');
    fs.writeFileSync(file, src, 'utf8');
    return { file, changed: true };
  }
  return { file, changed: false };
}

function main() {
  const root = path.join(__dirname, '..');
  const srcDir = path.join(root, 'src');
  if (!fs.existsSync(srcDir)) {
    console.error('src/ not found, aborting');
    process.exit(1);
  }
  const files = walk(srcDir);
  const modified = [];
  for (const f of files) {
    try {
      const res = processFile(f);
      if (res.changed) modified.push(res.file);
    } catch (e) {
      console.error('error processing', f, e.message);
    }
  }

  console.log('Modified files:', modified.length);
  for (const m of modified) console.log(' -', m);
}

main();
