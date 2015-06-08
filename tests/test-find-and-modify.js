var assert = require('assert');
var insert = require('./insert');

insert([{
  id: 1,
  hello: 'you'
}, {
  id: 2,
  hello: 'other'
}], function(db, done) {
  // Update and find the old document
  db.a.findAndModify({
    query: { id: 1 },
    update: { $set: { hello: 'world' } },
  },
  function(err, doc) {
    assert.ok(!err);
    assert.equal(doc.id, 1);
    assert.equal(doc.hello, 'you');

    // Update and find the new document
    db.a.findAndModify({
      query: { id: 2 },
      'new': true,
      update: { $set: { hello: 'me' } }
    }, function(err, doc) {
      assert.ok(!err);
      assert.equal(doc.id, 2);
      assert.equal(doc.hello, 'me');

      // Remove and find document
      db.a.findAndModify({
        query: { id: 1 },
        remove: true
      }, function(err, doc) {
        assert.ok(!err);
        assert.equal(doc.id, 1);

        // Insert document using upsert
        db.a.findAndModify({
          query: { id: 3 },
          update: { id: 3, hello: 'girl' },
          'new': true,
          upsert: true
        }, function(err, doc) {
          assert.ok(!err);
          assert.equal(doc.id, 3);
          assert.equal(doc.hello, 'girl');

          // Find non existing document
          db.a.findAndModify({
            query: { id: 0 },
            update: { $set: { hello: 'boy' } }
          }, function(err, doc) {
            assert.ok(!err);
            assert.equal(doc, null);

            // Correct error handling
            db.a.findAndModify({
              update: { $illigal: 1 }
            }, function(err, doc) {
              assert(err instanceof Error);
              assert.equal(doc, null);

              done();
            });
          });
        });
      });
    });
  });
});
