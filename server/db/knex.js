const environment = process.env.NODE_ENV || 'development',
  config = require('../knexfile.js')[environment];
  
module.exports = require('knex')(config);