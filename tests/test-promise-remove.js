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
  db.a.remove({type:'water'})
    .then(function(result) {
      assert.equal(result.n, 3);
      return db.a.find({type:'water'}).toArray();
    })
    .then(function(docs) {
      assert.equal(docs.length, 0);
      done();
    })
    .done();
});
