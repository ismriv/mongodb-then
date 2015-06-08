var assert = require('assert');
var insert = require('./insert');

insert([{
  hello:'world'
}], function(db, done) {
  var sync = true;
  db.a.update({hello:'world'}, {$set:{hello:'verden'}}, function(err, result) {
    assert.ok(!sync);
    assert.ok(!err);
    assert.equal(result.result.nModified, 1);
    assert.equal(result.result.n, 1);

    done();
  });
  sync = false;
});
