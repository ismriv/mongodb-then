var assert = require('assert');
var insert = require('./insert');

insert([{
  id: 1,
  hello: 'you'
}, {
  id: 2,
  hello: 'other'
}], function(db, done) {
  // Insert and return the modified document
  db.a.findOneAndUpdate({ id: 3 }, {
    $set: { hello: 'world' }
  }, {
    returnOriginal: false,
    upsert: true
  }, function(err, doc) {
    assert.ok(!err);
    assert.equal(doc.id, 3);
    assert.equal(doc.hello, 'world');

    // Update and find the old document
    db.a.findOneAndUpdate({ id: 3 }, {
      $set: { hello: 'me' }
    }, {
      returnOriginal: true
    }, function(err, doc) {
      assert.ok(!err);
      assert.equal(doc.id, 3);
      assert.equal(doc.hello, 'world');

      // Find non existing document
      db.a.findOneAndUpdate({ id: 0 }, {
        $set: { hello: 'boy' }
      }, function(err, doc) {
        assert.ok(!err);
        assert.equal(doc, null);

        // Correct error handling
        db.a.findOneAndUpdate({
          $illigal: 1
        }, function(err, doc) {
          assert(err instanceof Error);
          assert.equal(doc, null);
          done();
        });
      });
    });
  });
});
