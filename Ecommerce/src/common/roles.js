const { adminRole } = require('../config/env');

const esAdmin = (user) => user?.rol === adminRole;

module.exports = { esAdmin, adminRole };
