// scripts/hash.js
// Usage: npm run hash "YourPassword"

const bcrypt = require("bcrypt");

async function run() {
  const plain = process.argv[2];
  if (!plain) {
    console.error('Usage: npm run hash "YourPassword"');
    process.exit(1);
  }
  const hash = await bcrypt.hash(plain, 12);
  console.log("Plaintext:", plain);
  console.log("Hash:", hash);
}

run();
