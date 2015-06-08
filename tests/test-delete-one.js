var assert = require('assert');
var insert = require('./insert');

insert([{
  id: 1,
  hello: 'you'
}, {
  id: 2,
  hello: 'other'
}], function(db, done) {
  db.a.deleteOne({ hello: 'you' }, function(err, result) {
    assert.ok(!err);
    assert.equal(result.deletedCount, 1);

    db.a.find({}, function (err, docs) {
      assert.ok(!err);
      assert.equal(docs.length, 1);

      done();
    });
  });
});
