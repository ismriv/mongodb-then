var assert = require('assert');
var insert = require('./insert');

insert([{
  id: 1,
  hello: 'you'
}, {
  id: 2,
  hello: 'other'
}], function(db, done) {
  // Find document and delete
  db.a.findOneAndDelete({ id: 1 }, function(err, doc) {
    assert.ok(!err);
    assert.equal(doc.id, 1);
    assert.equal(doc.hello, 'you');
    done();
  });
});
