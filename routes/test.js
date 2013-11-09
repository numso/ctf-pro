/* jshint node:true */
'use strict';

module.exports = function (app) {
  app.get('/test', test);
};

function test(req, res) {
  res.send('it works');
}
