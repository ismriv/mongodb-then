var assert = require('assert');
var mongojs = require('../index');
var db = mongojs('test', ['a','b']);

db.a.insertMany([{name: "Squirtle"}, {name: "Charmander"}, {name: "Bulbasaur"}])
  .then(function(docs) {
    assert.ok(docs[0]._id);
    assert.ok(docs[1]._id);
    assert.ok(docs[2]._id);

    return db.a.remove();
  })
  .done(function () {
    db.close();
  });
