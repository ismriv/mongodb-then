var assert = require('assert');
var insert = require('./insert');

insert([{
  hello:'world1'
},{
  hello:'world2'
}], function(db, done) {
  var cursor = db.a.find();
  cursor.explain().then(function(result) {
    assert.equal(result.executionStats.nReturned, 1);
    done();
  })
  .done();
});

