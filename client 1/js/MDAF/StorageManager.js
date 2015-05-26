function StorageManager(){
    this.storageUsed = 0;
}

/** 
 * Requests permission for storing data on the client side
 * @param numberOfMegabytes - amount of memory in megabytes to request
 */

StorageManager.prototype.requestStorage = function StorageManager_requestStorage(numberOfMegabytes){
  var _this = this;
  navigator.webkitPersistentStorage.requestQuota((_this.storageQuota + numberOfMegabytes)*1024*1024, function(bytes) {
    _this.storageQuota = bytes;
        window.webkitRequestFileSystem(window.PERSISTENT, bytes, function(fs){
            _this.directory = fs.root;
            var directoryReader = _this.directory.createReader();
      directoryReader.readEntries(function onSuccess(entries){
        entries.forEach(function readMetadata(entry){
          entry.getMetadata(function onDone(meta){
            _this.storageUsed += meta.size;
          });
        });
      }, function onFailure(err){
        console.log(err);
      });


        }, _this.errorHandler);
    }, this.errorHandler);
};

/** 
 * Logs an error for asynchronous functions
 */

StorageManager.prototype.errorHandler = function StorageManager_errorHandler(e){
  console.error(e);
};


/** 
 * Deletes cached data and files including local storage.
 */

StorageManager.prototype.clearCache = function StorageManager_clearCache() {

  // deleting a single entry - either directory or file
  function delEntry(anEntry) {
    return new Promise(function(resolve, reject) {
      if (anEntry.isFile) {

         // remove entries that are files
        var fileName = anEntry.name;
        anEntry.remove(function success() {
            console.log('File ' + fileName + ' removed from cache.');
            resolve();
        }, function error(){
          reject(new Error('File ' + fileName + 'could not be deleted from cache'));
        });
      } else if (anEntry.isDirectory) { 
        
        // remove entries that are directories
        var dirName = anEntry.name;
        anEntry.removeRecursively(function success() {
            console.log('Directory ' + dirName + ' removed from cache.');
            resolve();
        }, function error(){
          reject(new Error('Directory ' + dirName + 'could not be deleted from cache'));
        });
      } else {

        // neither file nor directory, what can I do?
        reject(new Error('Entry can not be deleted as it is neither a file nor a directory'));
      }
    });
  }

  // clear the chrome storage
  this.get('enterprise').then(function onResolve(type){
    this.clearKeyValueStorage()
    this.cache('enterprise', type);
  }.bind(this), 
  function onReject(){
    this.clearKeyValueStorage()
  }.bind(this));
  // remove loaded file
  var directoryReader = this.directory.createReader();
  directoryReader.readEntries(function success(entries){
    
    // going through all the entries - promises done right
    entries.reduce(function(sequence, anEntry) {
      return sequence.then(function() {
        return delEntry(anEntry);
      });
    }, Promise.resolve()).then(function success(){
      console.log("cache deleted");
    }).catch(function(err) {
      console.error('could not delete cache', err);
    });
  }, function fail(){
    console.error("No access to cache, could not delete cached items.");
  });
};

/** Removes a single key-value pair
 * key - the key to be removed
 */

StorageManager.prototype.removeField = function(key){
  if (chrome.storage){
    chrome.storage.local.remove(key);
  } else {
    localStorage.removeItem(key);
  }
}

/** clears the key-value part of the storage
 */

StorageManager.prototype.clearKeyValueStorage = function(){
  if (chrome.storage){
    chrome.storage.local.clear()
  } else {
    localStorage.clear();
  }
}

/** Returns the value from local storage within a Promise
 * @param key - string value of key 
 * @return a Promise object which is resolved with the value with certain key 
 * from chrome.storage.local (if it is specified) and rejects, if there is no archive cached
 */ 

StorageManager.prototype.get = function(key) {
  console.log("Cache Manager requesting from local storage: " + key);
  return new Promise(function(resolve, reject){
    if (chrome.storage){
        chrome.storage.local.get(key, function(result){
          var myResult = result[key];
          if (myResult){
            console.log("Cache Manager got from local storage: " + key +" : " + JSON.stringify(myResult));
            resolve(myResult);
          } else {
            reject(new Error("key '" + key + " not found in local storage"));
          }
        });
    } else {
      var result = localStorage.getItem(key);
      if (result){
        console.log("Cache Manager got from local storage: " + key +" : " + result);
        resolve(JSON.parse(result));
      } else {
          reject(new Error("key '" + key + " not found in local storage"));
      }
    }
  });
};

/** Checks if the value is already in the cache, by searching in the chrome.storage.local.
 * @param key - key of the record in the local storage to look through.
 * @param value - value which is searched for.
 * @return - Promise object which resolves if the value is cached and rejects otherwise.
 */

StorageManager.prototype.isCached = function StorageManager_isCached(key, value){
  return new Promise (function(resolve, reject){
    if (chrome.storage){
        chrome.storage.local.get(key, function(result){
          var outputList = result[key];
          if (outputList !== undefined && outputList.indexOf(value) > -1){
            resolve();
          } else {
            reject();
          }
        });
    } else {
      var outputList = JSON.parse(localStorage.getItem(key));
      if (outputList !== undefined && outputList.indexOf(value) > -1){
        resolve();
      } else {
        reject();
      }
    }
  });
};

/** Adds value to the array of data cached under this key.
 * @param key - string value of key 
 * @param value - value to be cached. Could be array, string or a number.
 */

StorageManager.prototype.addToCache = function StorageManager_addToCache(key, value){
  var toCache = {};
  console.log("Cache Manger writing to cache: " + key);
  if (value.constructor === Array) {
    this.get(key).then(function onSuccess(result){
      value.forEach(function (input){
        if (result.indexOf(input) === -1){
          result.push(input);
        }
      });
      this.cache(key, result);
    }.bind(this), 
    function onReject(){
      this.cache(key, result);
    }.bind(this));
    console.log("calledArray");
  } else {
    this.get(key).then(function onSuccess(result){
      if (result.indexOf(value) === -1){
        result.push(value);
        this.cache(key, result);
      }
    }.bind(this), 
    function onReject(){
      var inputArray = [];
      inputArray.push(value);
      this.cache(key, inputArray);
    }.bind(this));
  }
};

/** Caches the value under this key. Overrides previously cached data.
 * @param key - string value of key 
 * @param value - value to be cached 
 */ 
StorageManager.prototype.cache = function StorageManager_cache(key, value){
  if (chrome.storage) {
      var toCache = {};
      console.log("write to cache :" + key);
      toCache[key] = value;
      chrome.storage.local.set(toCache);
  } else 
  localStorage.setItem(key, JSON.stringify(value));
};

////////// functions to access FileSystem

/** Writes file into local file System
 * @param fileName - string - name of the file in the application domain
 * @param content - blob - content to write to the file
 * @param callback - function to be called after content is written to the file
 */
StorageManager.prototype.writeFile = function StorageManager_writeFile(fileName, content, callback){
  //local file names should not contain special characters
  fileName = fileName.replace(/[^\w\s]/gi, '');
  var _this = this;
  this.directory.getFile(fileName, {create: true}, function(fileEntry){
    fileEntry.createWriter(function(writer){
      writer.onwrite = function(){
        fileEntry.getMetadata(function(meta){
          _this.storageUsed += meta.size;
        });
        callback();
      };
      writer.onerror = function(e){
        console.error(e);
      };
      if (!!content){
        writer.write(content);
      }
    });
  }, this.errorHandler);
};

/**
 * Loads file from the file system as an Array Buffer
 * @param fileName - string - name of the file in the application domain
 * @param callback
 */

StorageManager.prototype.loadFile = function StorageManager_loadFile(fileName, callback){
  var _this = this;
  fileName = fileName.replace(/[^\w\s]/gi, '');
  this.directory.getFile(fileName, {create: false}, function onSuccess(fileEntry){
    fileEntry.file(function success (file){
      var reader = new FileReader();
      reader.onload = callback;
      reader.onerror = function(e){
        console.error(e);
      };
      reader.readAsArrayBuffer(file);
    }, _this.errorHandler);
  }, _this.errorHandler);
};

/** Removes file from local file system
 * @fileName - string - name of file to remove in application domain
 * @callback - function to be called after file is removed
 */

StorageManager.prototype.removeFile = function StorageManager_removeFile(fileName, callback){
  var removingFile = fileName.replace(/[^\w\s]/gi, '');
  var _this = this;
  this.directory.getFile(removingFile, {create: false}, function(fileEntry){
    fileEntry.getMetadata(function(meta){
      _this.storageUsed -= meta.size;
    });
    fileEntry.remove(callback);
  });
};

/** Displays the amount of space, taken by cached files
 */

StorageManager.prototype.viewTakenStorage = function StorageManager_viewTakenStorage(){
  console.log(this.storageUsed);
};
