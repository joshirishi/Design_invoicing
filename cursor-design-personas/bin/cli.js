#!/usr/bin/env node
'use strict';

const path = require('path');
const os = require('os');
const { install, remove, SKILLS } = require('../lib/install');

const SKILLS_DIR = path.join(os.homedir(), '.cursor', 'skills');

const HELP = `
cursor-design-personas — 7 AI design personas for Cursor

Usage:
  npx cursor-design-personas [command] [options]

Commands:
  install    Copy all skills to ~/.cursor/skills/  (default)
  remove     Delete installed skills from ~/.cursor/skills/
  list       Show installed skills

Options:
  --force    Overwrite existing skills on install
  --help     Show this help message

Personas installed:
  Arjun      UX Agent (UX Honeycomb critique)
  Meera      Business Agent (retention, ARR, GTM)
  Priya      Feasibility Agent (effort sizing, risks)
  Zara       Delight Agent (Peak-End, one moment)
  Noor       IA Architect (Concept A, minimalist)
  Anuj       Power-User Advocate (Concept B, dense)
  Raj        Arbitrator (stalemate only)

Orchestrating skills:
  design-critic    4-persona critique → SHIP/REVISE/BLOCK
  ux-ideator       6-phase ideation workflow
  design-personas  Session context template

Reference data (used by all personas automatically):
  design-reference  12 CSV files — colors, styles, typography, UX guidelines,
                    product patterns, charts, icons, stacks (16 frameworks)

Docs: https://github.com/rishikeshjoshi/cursor-design-personas
`;

const fs = require('fs');

const [,, cmd, ...flags] = process.argv;
const force = flags.includes('--force');

switch (cmd) {
  case undefined:
  case 'install':
    install({ force });
    break;

  case 'remove':
  case 'uninstall':
    remove({});
    break;

  case 'list': {
    console.log('\nInstalled cursor-design-personas skills:\n');
    for (const skill of SKILLS) {
      const dest = `${SKILLS_DIR}/${skill}`;
      const exists = fs.existsSync(dest);
      console.log(`  ${exists ? '✅' : '✗ '} ${skill}`);
    }
    console.log('');
    break;
  }

  case '--help':
  case 'help':
  case '-h':
    console.log(HELP);
    break;

  default:
    console.error(`\nUnknown command: "${cmd}"\n`);
    console.log(HELP);
    process.exit(1);
}
