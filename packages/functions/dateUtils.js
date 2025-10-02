const { getNextDate, toDateInputString } = require('../shared-logic/src/utils/date'); // CORRECTED PATH

// This file now acts as a simple re-exporter for the shared logic,
// which is a good pattern for keeping backend code clean.
module.exports = { getNextDate, toDateInputString };