'use strict';
const bcrypt = require('bcrypt');

const DEFAULT_SALT_ROUNDS = 10;

const hasher = {
  async hash(plainPassword) {
    const rounds = parseInt(process.env.HASH_COST, 10) || DEFAULT_SALT_ROUNDS;
    return bcrypt.hash(plainPassword, rounds);
  }
};

module.exports = hasher;
