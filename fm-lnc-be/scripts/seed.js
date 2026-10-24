const { spawn } = require('child_process');
const path = require('path');

console.log('Starting seed process from .lnc files...');
const pyScript = path.resolve(__dirname, 'seed_lnc.py');

const proc = spawn('python', [pyScript], {
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '..'),
});

proc.on('close', (code) => {
  if (code === 0) {
    console.log('Seeding completed successfully!');
  } else {
    console.error(`Seeding process exited with code ${code}`);
    process.exit(code);
  }
});
