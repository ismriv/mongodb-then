var mongodb = require('mongodb');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Readable = require('stream').Readable || require('readable-stream');
var Promise = require('bluebird');

var DriverCollection = mongodb.Collection.prototype;
var DriverDb = mongodb.Db.prototype;

/**
 * Executes the given function for each method in the old prototype, which doesn't have a
 * corresponding property in the new prototype.
 */
var forEachMethod = function (oldProto, newProto, fn) {
  Object.keys(oldProto).forEach(function (methodName) {
    if (oldProto.__lookupGetter__(methodName) || newProto[methodName]) return;
    if (methodName[0] === '_' || typeof oldProto[methodName] !== 'function') return;
    fn(methodName, oldProto[methodName]);
  });
};

/**
 * Lazily evaulates an asynchronous callback, once.
 */
var thunk = function (callback) {
  var called = false;
  var cache = null;

  return function () {
    if (called) {
      return cache;
    } else {
      called = true;
      cache = callback();
      return cache;
    }
  };
};

/**
 * Splits the args into args + callback.
 */
var splitArgs = function (args) {
  args = Array.prototype.slice.call(args);
  var callback = args[args.length - 1];

  if (typeof callback === 'function') {
    args.pop();
  } else {
    callback = false;
  }

  return {
    args: args,
    callback: callback
  };
};

// Proxy for the native cursor prototype that normalizes method names and
// arguments to fit the mongo shell.

var Cursor = function (getcursor) {
  Readable.call(this, {objectMode: true, highWaterMark: 0});
  this._get = getcursor;
};

util.inherits(Cursor, Readable);

Cursor.prototype.toArray = function () {
  return this._apply('toArray', arguments);
};

Cursor.prototype.next = function () {
  return this._apply('nextObject', arguments);
};

Cursor.prototype.forEach = function (fn) {
  if (fn.length === 1) {
    // the fn is promise type (function (doc) {...})
    return this._get().then(function (cursor) {
      return new Promise(function (resolve, reject) {
        cursor.each(function (err, doc) {
          if (err) {
            reject(err);
          } else if (doc) {
            fn(doc);
          } else {
            resolve();
          }
        });
      });
    });
  } else {
    // the fn is probably the old type (function (err, doc) {...})
    this._get().then(function (cursor) {
      cursor.each(fn);
    });
  }
};

Cursor.prototype.count = function () {
  return this._apply('count', arguments);
};

Cursor.prototype.explain = function () {
  return this._apply('explain', arguments);
};

Cursor.prototype.limit = function () {
  return this._config('limit', arguments);
};

Cursor.prototype.skip = function () {
  return this._config('skip', arguments);
};

Cursor.prototype.batchSize = function () {
  return this._config('batchSize', arguments);
};

Cursor.prototype.sort = function () {
  return this._config('sort', arguments);
};

Cursor.prototype.rewind = function () {
  return this._config('rewind', arguments);
};

Cursor.prototype.destroy = function () {
  var p = this._apply('close', arguments);
  this.push(null);
  return p;
};

Cursor.prototype.map = function (mapfn, callback) {
  return this.toArray().then(function (arr) {
    return arr.map(mapfn);
  }).nodeify(callback);
};

Cursor.prototype.size = function (callback) {
  return this.count(true).nodeify(callback);
};

// if then() is called on a cursor, invoke toArray() and return promise
Cursor.prototype.then = function () {
  var promise = this.toArray();
  return promise.then.apply(promise, arguments);
};

var fnapply = function (fn, args) {
  return Promise.fromNode(function (callback) {
    fn.apply(fn, args.concat(callback));
  });
};

var fncall = function () {
  var args = Array.prototype.slice.call(arguments);
  return fnapply(args[0], args.slice(1));
};

Cursor.prototype._apply = function (fn, args) {
  var cargs = splitArgs(args);

  // return promise, call the callback if specified.
  return this._get().then(function (cursor) {
    return fnapply(cursor[fn].bind(cursor), cargs.args);
  }).nodeify(cargs.callback);
};

Cursor.prototype._read = function () { // 0.10 stream support (0.8 compat using readable-stream)
  this.next(function (err, data) {
    if (err) return this.emit('error', err);
    this.push(data);
  }.bind(this));
};

Cursor.prototype._config = function (fn, args) {
  var cargs = splitArgs(args);
  var p = this._apply(fn, cargs.args);

  // if callback is specified, toArray() will be automatically called
  // if using promises, toArray() will have to be called manually
  if (cargs.callback) {
    return this.toArray(cargs.callback);
  } else {
    return this;
  }
};

// Proxy for the native collection prototype that normalizes method names and
// arguments to fit the mongo shell.

var Collection = function (name, oncollection) {
  this._get = oncollection;
  this._name = name;
};

Collection.prototype.group = function (group, callback) {
  return this._apply(DriverCollection.group, [group.key ? group.key : group.keyf, group.cond, group.initial, group.reduce, group.finalize, true]).nodeify(callback);
};

Collection.prototype.runCommand = function (cmd, opts, callback) {
  opts = opts || {};
  if (typeof opts === 'function') {
    callback = opts;
  }
  return this._get().then(function (collection) {
    var commandObject = {};
    commandObject[cmd] = collection.collectionName;
    Object.keys(opts).forEach(function (key) {
      commandObject[key] = opts[key];
    });
    return fncall(collection.db.command.bind(collection.db), commandObject).nodeify(callback);
  });
};

Collection.prototype.find = function () {
  var cargs = splitArgs(arguments);

  var getcursor = thunk(function () {
    return this._get().then(function (collection) {
      return fnapply(collection.find.bind(collection), cargs.args);
    });
  }.bind(this));

  if (cargs.callback) {
    // run toArray if callback specified
    return getcursor().then(function (cursor) {
      return fncall(cursor.toArray.bind(cursor));
    }).nodeify(cargs.callback);
  } else {
    // otherwise just return the cursor
    return new Cursor(getcursor);
  }
};

Collection.prototype.findAndModify = function(options, callback) {
  var args = [options.query, options.sort || [], options.update || {}, {
    new: !!options.new,
    remove: !!options.remove,
    upsert: !!options.upsert,
    fields: options.fields
  }];

  if (callback) {
    args.push(function (err, doc) {
      callback(err, doc && doc.value);
    });
  }

  return this._apply(DriverCollection.findAndModify, args);
};

Collection.prototype.findOneAndUpdate = function() {
  var cargs = splitArgs(arguments);
  return this._apply(DriverCollection.findOneAndUpdate, cargs.args).then(function (result) {
    return result && result.value;
  }).nodeify(cargs.callback);
};

Collection.prototype.findOneAndDelete = function() {
  var cargs = splitArgs(arguments);
  return this._apply(DriverCollection.findOneAndDelete, cargs.args).then(function (result) {
    return result && result.value;
  }).nodeify(cargs.callback);
};

Collection.prototype.findOneAndReplace = function() {
  var cargs = splitArgs(arguments);
  return this._apply(DriverCollection.findOneAndReplace, cargs.args).then(function (result) {
    return result && result.value;
  }).nodeify(cargs.callback);
};

Collection.prototype.insert = function() {
  var cargs = splitArgs(arguments);
  return this._apply(DriverCollection.insert, cargs.args).then(function (result) {
    if (Array.isArray(cargs.args[0])) {
      return result.ops;
    } else {
      return result.ops[0];
    }
  }).nodeify(cargs.callback);
};

Collection.prototype.insertOne = function () {
  var cargs = splitArgs(arguments);
  return this._apply(DriverCollection.insertOne, cargs.args).then(function (result) {
    return result.ops[0];
  }).nodeify(cargs.callback);
};

Collection.prototype.insertMany = function () {
  var cargs = splitArgs(arguments);
  return this._apply(DriverCollection.insertMany, cargs.args).then(function (result) {
    return result.ops;
  }).nodeify(cargs.callback);
};

Collection.prototype.remove = function () {
  var cargs = splitArgs(arguments);
  return this._apply(DriverCollection.remove, cargs.args).then(function (result) {
    return result.result;
  }).nodeify(cargs.callback);
};

Collection.prototype.toString = function () {
  return this._name;
};

forEachMethod(DriverCollection, Collection.prototype, function (methodName, fn) {
  Collection.prototype[methodName] = function () { // we just proxy the rest of the methods directly
    return this._apply(fn, arguments);
  };
});

Collection.prototype._apply = function (fn, args) {
  var cargs = splitArgs(args);

  return this._get().then(function (collection) {
    if (cargs.callback) {
      fn.apply(collection, args);
    } else {
      return fnapply(fn.bind(collection), cargs.args);
    }
  });
};

var toConnectionString = function (conf) { // backwards compat config map (use a connection string instead)
  var options = [];
  var hosts = conf.replSet ? conf.replSet.members || conf.replSet : [conf];
  var auth = conf.username ? (conf.username + ':' + conf.password + '@') : '';

  hosts = hosts.map(function (server) {
    if (typeof server === 'string') {
      return server;
    }
    return (server.host || '127.0.0.1') + ':' + (server.port || 27017);
  }).join(',');

  if (conf.slaveOk) {
    options.push('slaveOk=true');
  }

  return 'mongodb://' + auth + hosts + '/' + conf.db + '?' + options.join('&');
};

var parseConfig = function (cs) {
  if (typeof cs === 'object' && cs) return toConnectionString(cs);
  if (typeof cs !== 'string') throw new Error('connection string required'); // to avoid undef errors on bad conf
  cs = cs.replace(/^\//, '');

  if (cs.indexOf('/') < 0) return parseConfig('127.0.0.1/' + cs);
  if (cs.indexOf('mongodb://') !== 0) return parseConfig('mongodb://' + cs);

  return cs;
};

var Database = function (name, getdb) {
  EventEmitter.call(this);
  this._get = getdb;
  this._name = name;
};

util.inherits(Database, EventEmitter);

Database.prototype.runCommand = function (opts, callback) {
  if (typeof opts === 'string') {
    var tmp = opts;
    opts = {};
    opts[tmp] = 1;
  }
  return this._get().then(function (db) {
    var dbcommand = Promise.promisify(db.command, db);
    if (opts.shutdown === undefined) {
      return dbcommand(opts);
    }
    // if the command in question is a shutdown, should shut down the server without crashing.
    return dbcommand(opts).then(function (result) {
      db.close();
      return result;
    });
  }).nodeify(callback);
};

Database.prototype.open = function (callback) {
  return this._get().nodeify(callback); // a way to force open the db, 99.9% of the times this is not needed
};

Database.prototype.getCollectionNames = function (callback) {
  return this.collections().then(function (cols) {
    return cols.map(function (c) {
      return c.collectionName;
    });
  }).nodeify(callback);
};

Database.prototype.createCollection = function (name, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};
  options.strict = options.strict !== false;
  return this._apply(DriverDb.createCollection, [name, options]).nodeify(callback);
};

Database.prototype.collection = function (name, options) {
  var getcollection = thunk(function () {
    return this._get().then(function (db) {
      return fncall(db.collection.bind(db), name, options);
    });
  }.bind(this));
  return new Collection(this._name + '.' + name, getcollection);
};

Database.prototype.bind = function (colName, options) {
  var parts = colName.split('.');
  var last = parts.pop();
  var parent = parts.reduce(function (parent, prefix) {
    parent[prefix] = parent[prefix] || {};
    return parent[prefix];
  }, this);
  parent[last] = this.collection(colName);
};

Database.prototype.getSiblingDb = function (connectionString, collections) {
  var newConnectionString;
  // [match, host, options]
  var currentConnection = this.connectionString.match(/^mongodb:\/\/([^\/]+)\/[^?]+(\?.*)?/);
  // [match, mongodb://, host or db, maybe db]
  var newConnection = connectionString.match(/^(mongodb:\/\/)?([^\/]+)(\/[^?]+)?/);
  // if newConnection has the host set then it'll override the current connection
  if (newConnection[3] !== undefined) {
    newConnectionString = connectionString;
  } else {
    newConnectionString = 'mongodb://' + currentConnection[1] + '/' + newConnection[2];
  }
  return module.exports(newConnectionString, collections);
};

Database.prototype.toString = function () {
  return this._name;
};

Database.prototype.getLastError = function (callback) {
  return this.runCommand('getLastError').then(function (result) {
    return result.err;
  }).nodeify(callback);
};

Database.prototype.getLastErrorObj = function (callback) {
  return this.runCommand('getLastError').nodeify(callback);
};

Database.prototype._apply = function (fn, args) {
  var cargs = splitArgs(args);

  return this._get().then(function (db) {
    return fnapply(fn.bind(db), cargs.args);
  }).nodeify(cargs.callback);
};

Database.prototype.db = function (dbName, callback) {
  return this._get().then(function (db) {
    var getdb = thunk(function () {
      return new Promise(function (resolve) {
        db = db.db(dbName);
        database.client = db;
        database.emit('ready');
        db.on('error', function (err) {
          process.nextTick(function () {
            database.emit('error', err);
          });
        });
        resolve(db);
      });
    });

    var database = new Database(dbName, getdb);
    database.bson = mongodb.BSONPure;
    database.ObjectId = mongodb.ObjectID;

    return database;
  }).nodeify(callback);
};

forEachMethod(DriverDb, Database.prototype, function (methodName, fn) {
  Database.prototype[methodName] = function () {
    return this._apply(fn, arguments);
  };
});

var connect = function (config, collections) {
  var connectionString = parseConfig(config);
  var dbName = (connectionString.match(/\/([^\/\?]+)(\?|$)/) || [])[1] || 'db';

  var getdb = thunk(function () {
    return fncall(mongodb.MongoClient.connect.bind(mongodb.MongoClient), connectionString).then(function (db) {
      database.client = db;
      database.emit('ready');
      db.on('error', function (err) {
        process.nextTick(function () {
          database.emit('error', err);
        });
      });
      return db;
    });
  });

  var database = new Database(dbName, getdb);
  database.connectionString = connectionString;
  database.bson = mongodb.BSONPure; // backwards compat (require('bson') instead)
  database.ObjectId = mongodb.ObjectID; // backwards compat

  collections = collections || config.collections || [];
  collections.forEach(function (colName) {
    var parts = colName.split('.');
    var last = parts.pop();
    var parent = parts.reduce(function (parent, prefix) {
      parent[prefix] = parent[prefix] || {};
      return parent[prefix];
    }, database);

    parent[last] = database.collection(colName);
  });

  return database;
};

connect.ObjectId = mongodb.ObjectID;
connect.DBRef = mongodb.DBRef;
connect.Timestamp = mongodb.Timestamp;
connect.MinKey = mongodb.MinKey;
connect.MaxKey = mongodb.MaxKey;
connect.NumberLong = mongodb.Long;

connect.Cursor = Cursor;
connect.Collection = Collection;
connect.Database = Database;

module.exports = connect;
