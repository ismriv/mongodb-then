var assert = require('assert');
var insert = require('./insert');

insert([{
  id: 1,
  hello: 'you'
}, {
  id: 2,
  hello: 'other'
}], function(db, done) {
  db.a.count({}).then(function(count) {
    assert.equal(count, 2);
    return db.a.count({hello: 'other'});
  }).then(function (count) {
    assert.equal(count, 1);
  }).done(done);
});
