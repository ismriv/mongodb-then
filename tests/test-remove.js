var assert = require('assert');
var insert = require('./insert');

// Delete just one
insert([{
  name:'Squirtle', type:'water'
}, {
  name:'Starmie' , type:'water'
}, {
  name:'Lapras'  , type:'water'
}], function(db, done) {
  db.a.remove({type:'water'}, function(err, result) {
    assert.equal(result.n, 3);

    db.a.find({type:'water'}, function(err, docs) {
      assert.equal(docs.length, 0);
      done();
    });
  });
});
