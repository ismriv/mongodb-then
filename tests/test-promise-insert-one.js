var assert = require('assert');
var mongojs = require('../index');
var db = mongojs('test', ['a','b']);

db.a.insertOne({name: "Pidgeotto"})
  .then(function(doc) {
    assert.ok(doc._id);
    assert.equal(doc.name, "Pidgeotto");

    return db.a.remove();
  })
  .done(function () {
    db.close();
  });
