const { redis } = require('./env');

// BullMQ crea sus propias conexiones a partir de estas opciones
module.exports = { host: redis.host, port: redis.port, password: redis.password };
