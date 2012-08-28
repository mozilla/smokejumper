window.indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB;
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.OIDBTransaction || window.msIDBTransaction;

var fileTemplate;

$(function () {

  $('#share-drop').on('dragover', function (event) {
    // FIXME: highlight something here?
    return false;
  });

  // jQuery doesn't bind this right with .on('drop'):
  $('#share-drop')[0].addEventListener('drop', function (event) {
    if ((! event.dataTransfer) || (! event.dataTransfer.files)) {
      console.log("Drop event wasn't for a file", event);
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    var files = event.dataTransfer.files;
    for (var i=0; i<files.length; i++) {
      saveFile(files[i]);
      shareFile(files[i]);
    }
  }, false);

  $('#file-upload').on('change', function () {
    var files = this.files;
    for (var i=0; i<files.length; i++) {
      shareFile(files[i]);
    }
    $(this).val('');
  });

  fileTemplate = _.template($('#file-template').text());

  $(document).on("click", "button.remove", function (event) {
    var li = $(this).closest("li");
    var name = li.find(".filename").text();
    removeFile(name);
    li.remove();
  });

});

function reportError() {
  console.error("Error:", this.error);
}

var dbRequest = indexedDB.open("FilesToShare2");
var db = null;
dbRequest.onerror = reportError;
var DB_VERSION = "1.0";
dbRequest.onsuccess = function () {
  db = this.result;
  console.log('Opened database', db);
  if (db.version != DB_VERSION) {
    var versionReq = db.setVersion(DB_VERSION);
    versionReq.onerror = reportError;
    versionReq.onsuccess = function () {
      console.log('Set new version');
      var fileStore = db.createObjectStore("files", {keyPath: "filename"});
      fileStore.createIndex("filename", "filename", {unique: true});
      this.transaction.oncomplete = function () {
        console.log('Created stores');
        dbReady();
      };
    };
  } else {
    dbReady();
  }
};

function dbReady() {
  iterFiles(function (err, key, value) {
    if (value) {
      shareFile(value);
    }
  });
}

function shareFile(file) {
  saveFile(file, function () {});
  var result = fileTemplate({filename: file.name || file.filename, type: file.type, size: file.size});
  result = $(result);
  $('#null-share').remove();
  $('#share-list').append(result);
}

function iterFiles(callback) {
  var fileStore = db.transaction(["files"]).objectStore("files");
  fileStore.openCursor().onsuccess = function () {
    var cursor = this.result;
    if (cursor) {
      callback(null, cursor.key, cursor.value);
      cursor.continue();
    } else {
      callback();
    }
  };
}

function saveFile(fileObj, callback) {
  console.log('Saving file', fileObj);
  var reader = new FileReader();
  reader.onload = function () {
    // bb is read into
    var blob = this.result;
    console.log('read the bytes', blob, blob.byteLength);
    var trans = db.transaction(["files"], "readwrite");
    var fileData = {
      filename: fileObj.name,
      type: fileObj.type,
      size: fileObj.size,
      content: blob
    };
    var store = trans.objectStore("files");
    console.log('Inserting', fileData);
    var ins = store.put(fileData);
    ins.onsuccess = function () {
      if (callback) {
        callback();
      }
    };
    ins.onerror = function () {
      if (callback) {
        callback(this.error);
      }
    };
  };
  reader.onerror = function () {
    if (callback) {
      callback(this.error);
    }
  };
  reader.readAsArrayBuffer(fileObj);
}

function removeFile(name, callback) {
  console.log('Removing file', name);
  var trans = db.transaction(["files"], "readwrite");
  var store = trans.objectStore("files");
  var req = store.delete(name);
  req.onsuccess = function () {
    if (callback) {
      callback();
    }
  };
  req.onerror = function () {
    if (callback) {
      callback(this.error);
    }
  };
}

function formatSize(bytes) {
  if (bytes > 1000000) {
    return parseInt(bytes/1000000, 10) + ' Mb';
  } else if (bytes > 1000) {
    return parseInt(bytes/1000, 10) + ' Kb';
  } else {
    return bytes + ' bytes';
  }
}
