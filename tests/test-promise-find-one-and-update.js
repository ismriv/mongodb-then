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
  })
  .then(function(doc) {
    assert.equal(doc.id, 3);
    assert.equal(doc.hello, 'world');

    // Update and find the old document
    return db.a.findOneAndUpdate({ id: 3 }, {
      $set: { hello: 'me' }
    }, {
      returnOriginal: true
    });
  })
  .then(function(doc) {
    assert.equal(doc.id, 3);
    assert.equal(doc.hello, 'world');

    // Find non existing document
    return db.a.findOneAndUpdate({ id: 0 }, {
      $set: { hello: 'boy' }
    });
  })
  .then(function(doc) {
    // Correct error handling
    return db.a.findOneAndUpdate({
      $illigal: 1
    });
  })
  .catch(function(err) {
    assert(err instanceof Error);
    done();
  });
});
