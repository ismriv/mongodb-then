var assert = require('assert');
var mongojs = require('../index');
var db = mongojs('test', ['a','b']);

db.a.save({hello: "world"}, function(err, result) {
  assert.equal(result.ops[0].hello, "world");
  assert.ok(result.ops[0]._id);

  result.ops[0].hello = "verden";
  db.a.save(result.ops[0], function(err, result) {
    assert.equal(result.result.nModified, 1);
    db.a.remove(function() {
      db.close();
    });
  });
});
