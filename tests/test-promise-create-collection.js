var assert = require('assert');
var mongojs = require('../index');
var db = mongojs('test', ['test123']);

var errCalled = false;

db.test123.drop()
  .finally(function() {
    db.createCollection('test123')
      .then(function () {
        return db.createCollection('test123');
      })
      .catch(function () {
        errCalled = true;
      })
      .finally(function () {
        assert.ok(errCalled);
        db.close();
      })
      .done();
  });
