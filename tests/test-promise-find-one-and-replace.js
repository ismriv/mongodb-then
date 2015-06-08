var assert = require('assert');
var insert = require('./insert');

insert([{
  _id: 1,
  hello: 'you'
}], function(db, done) {
  // Insert and return the modified document
  db.a.findOneAndReplace({ _id: 1 }, {
    hello: 'world'
  })
  .then(function(doc) {
    assert.equal(doc._id, 1);
    assert.equal(doc.hello, 'you');
    return db.a.findOneAndReplace({ _id: 1 }, {
      hello: 'other'
    });
  })
  .then(function(doc) {
    assert.equal(doc._id, 1);
    assert.equal(doc.hello, 'world');
  })
  .done(done);
});
