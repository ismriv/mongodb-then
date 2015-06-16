var assert = require('assert');
var insert = require('./insert');

insert([{
  id: 1,
  hello: 'you'
}, {
  id: 2,
  hello: 'other'
}], function(db, done) {
  db.a.count({}, function(err, count) {
    assert.ok(!err);
    assert.equal(count, 2);

    db.a.count({hello: 'other'}, function(err, count) {
      assert.ok(!err);
      assert.equal(count, 1);
      done();
    });
  });
});
