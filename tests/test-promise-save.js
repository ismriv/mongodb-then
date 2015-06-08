var assert = require('assert');
var mongojs = require('../index');
var db = mongojs('test', ['a','b']);

db.a.save({hello: "world"})
  .then(function(result) {
    assert.equal(result.ops[0].hello, "world");
    assert.ok(result.ops[0]._id);

    result.ops[0].hello = "verden";
    return db.a.save(result.ops[0]);
  })
  .then(function(result) {
    assert.equal(result.result.nModified, 1);

    return db.a.remove();
  })
  .done(function () {
    db.close();
  });
