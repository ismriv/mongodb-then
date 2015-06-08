var assert = require('assert');
var insert = require('./insert');

insert([{
  hello:'world1'
},{
  hello:'world2'
}], function(db, done) {
  var cursor = db.a.find();
  var runs = 0;

  cursor.next().done(function loop(doc) {
    if (!doc) {
      assert.equal(runs, 2);
      done();
      return;
    }
    assert.ok(doc.hello === 'world1' || doc.hello === 'world2');
    assert.equal(typeof doc, 'object');
    runs++;
    cursor.next().then(loop);
  });
});