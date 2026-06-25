#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const SKILLS_DIR = path.join(os.homedir(), '.cursor', 'skills');
const PACKAGE_SKILLS_DIR = path.join(__dirname, '..', 'skills');

const SKILLS = [
  'arjun',
  'meera',
  'priya',
  'zara',
  'noor',
  'anuj',
  'raj',
  'design-critic',
  'ux-ideator',
  'design-personas',
  'design-reference',
];

// Copies a directory recursively
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function install({ silent = false, force = false } = {}) {
  const log = silent ? () => {} : console.log;
  const warn = silent ? () => {} : console.warn;

  fs.mkdirSync(SKILLS_DIR, { recursive: true });

  const installed = [];
  const skipped = [];
  const errors = [];

  for (const skill of SKILLS) {
    const src = path.join(PACKAGE_SKILLS_DIR, skill);
    const dest = path.join(SKILLS_DIR, skill);

    if (!fs.existsSync(src)) {
      warn(`  ⚠  Skill source not found: ${skill}`);
      errors.push(skill);
      continue;
    }

    // If dest exists and not forcing, skip
    if (fs.existsSync(dest) && !force) {
      skipped.push(skill);
      continue;
    }

    try {
      copyDir(src, dest);
      installed.push(skill);
    } catch (err) {
      warn(`  ✗  Failed to install ${skill}: ${err.message}`);
      errors.push(skill);
    }
  }

  if (installed.length > 0) {
    log(`\n✅ cursor-design-personas installed ${installed.length} skill(s) to ~/.cursor/skills/:`);
    for (const s of installed) log(`   • ${s}`);
  }

  if (skipped.length > 0) {
    log(`\n⏭  Skipped ${skipped.length} already-existing skill(s) (use --force to overwrite):`);
    for (const s of skipped) log(`   • ${s}`);
  }

  if (errors.length > 0) {
    log(`\n✗  ${errors.length} skill(s) failed to install.`);
  }

  if (installed.length > 0 || skipped.length > 0) {
    log(`\n💡 Usage:`);
    log(`   /design-critic   — multi-persona critique (Arjun, Meera, Priya, Zara)`);
    log(`   /ux-ideator      — full ideation workflow (all 7 personas, 6 phases)`);
    log(`   /design-personas — fill in session context before a session\n`);
  }

  return { installed, skipped, errors };
}

function remove({ silent = false } = {}) {
  const log = silent ? () => {} : console.log;

  const removed = [];
  const missing = [];

  for (const skill of SKILLS) {
    const dest = path.join(SKILLS_DIR, skill);
    if (!fs.existsSync(dest)) {
      missing.push(skill);
      continue;
    }
    fs.rmSync(dest, { recursive: true, force: true });
    removed.push(skill);
  }

  if (removed.length > 0) {
    log(`\n🗑  Removed ${removed.length} skill(s) from ~/.cursor/skills/:`);
    for (const s of removed) log(`   • ${s}`);
  }
  if (missing.length > 0) {
    log(`\n   ${missing.length} skill(s) were not installed (nothing to remove).`);
  }
  log('');
}

module.exports = { install, remove, SKILLS };

// Run directly (postinstall)
if (require.main === module) {
  const silent = process.argv.includes('--silent');
  install({ silent });
}
