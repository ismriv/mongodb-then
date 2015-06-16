# mongodb-then
[![NPM version][npm-image]][npm-url]

A promise-based wrapper for mongodb 2.x diver. Its API is almost the same as [node-mongodb-native](https://github.com/mongodb/node-mongodb-native), and but all functions that accept callbacks now return promises too. Promises are Promises/A+ compatible, powered by [bluebird](https://github.com/petkaantonov/bluebird).

[mongodb-then](https://github.com/ismriv/mongodb-then) is a fork of [promised-mongo](https://github.com/gordonmleigh/promised-mongo) rewrite of mongojs to support promises.

## Install
```sh
$ npm install mongodb-then --save
```

## Usage

```javascript
var mongodb = require('mongodb-then');
var db = mongodb('example.com:27017/mydb', [
  'mycollection'
]);

db.mycollection.insertOne({hello: 'world'}).then(function () {
  return db.mycollection.find({}).toArray();
}).then(function (docs) {
  // docs = [{ hello: 'world', _id: 5574aef0faecfb556ed376a8 }]
  return db.mycollection.count({});
}).then(function (count) {
  // count = 1
});
```

## Migrating your application to mongodb@~2.0

There are some key changes in the driver going from 1.x to 2.x that one needs to be aware off before changing your application to using the new 2.x versions. There has been some cleanup of API's and some deprecations of 1.x features. For more details please check http://mongodb.github.io/node-mongodb-native/2.0/tutorials/changes-from-1.0/.

[npm-image]: https://img.shields.io/npm/v/mongodb-then.svg?style=flat
[npm-url]: https://npmjs.org/package/mongodb-then
