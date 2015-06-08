var assert = require('assert');
var insert = require('./insert');

insert([{
  id: 1,
  hello: 'you'
}, {
  id: 2,
  hello: 'you'
}], function(db, done) {
  db.a.deleteOne({ hello: 'you' }).then(function(result) {
    assert.equal(result.deletedCount, 1);

    return db.a.find({});
  }).then(function (docs) {
    assert.equal(docs.length, 1);
  }).done(done);
});
