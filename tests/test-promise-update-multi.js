var assert = require('assert');
var insert = require('./insert');

insert([{
  hello:'world1'
},{
  hello:'world2'
}], function(db, done) {
  db.a.update({}, {$set:{updated:true}}, {multi:true})
    .then(function(result) {
      assert.equal(result.result.nModified, 2);
      assert.equal(result.result.n, 2);
      return db.a.find().toArray();
    })
    .then(function(docs) {
      assert.equal(docs.length, 2);
      assert.ok(docs[0].updated);
      assert.equal(docs[0].hello, 'world1');
      assert.ok(docs[1].updated);
      assert.equal(docs[1].hello, 'world2');
      done();
    })
    .done();
});
