var assert = require('assert');
var insert = require('./insert');

insert([{
  hello:'world'
}], function(db, done) {
  var sync = true;
  db.a.update({hello:'world'}, {$set:{hello:'verden'}})
    .then(function(result) {
      assert.ok(!sync);
      assert.equal(result.result.nModified, 1);
      assert.equal(result.result.n, 1);
      done();
    })
    .done();
  sync = false;
});
