// Required first by every test file: isolates each test run's data dir from
// the user's real ~/.ai-learning-harness and from other test files, so
// leftover rows from one run (or one file) never pollute another's assertions.
const os = require('os');
const path = require('path');
const crypto = require('crypto');

process.env.AI_LEARNING_HARNESS_DATA_DIR = path.join(os.tmpdir(), `alh-test-${crypto.randomUUID()}`);
