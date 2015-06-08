var assert = require('assert');
var insert = require('./insert');

insert([{
  hello:'world'
}], function(db, done) {
  db.a.update({hello:'world'}, {$set:{hello:'verden'}})
    .then(function(result) {
      assert.equal(result.result.nModified, 1);
      assert.equal(result.result.n, 1);

      return db.a.findOne();
    })
    .then(function(doc) {
      assert.equal(doc.hello, 'verden');
      done();
    })
    .done();
});
