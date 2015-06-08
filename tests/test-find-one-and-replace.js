var assert = require('assert');
var insert = require('./insert');

insert([{
  _id: 1,
  hello: 'you'
}], function(db, done) {
  // Insert and return the modified document
  db.a.findOneAndReplace({ _id: 1 }, {
    hello: 'world'
  }, function (err, doc) {
    assert.ok(!err);
    assert.equal(doc._id, 1);
    assert.equal(doc.hello, 'you');

    db.a.findOneAndReplace({ _id: 1 }, {
      hello: 'other'
    }, function (err, doc) {
      assert.ok(!err);
      assert.equal(doc._id, 1);
      assert.equal(doc.hello, 'world');
      done();
    });
  });
});
