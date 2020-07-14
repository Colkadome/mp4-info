/*
  mp4-info - index.js
*/

/**
 * Converts ArrayBuffer to an unsigned Big Endian number,
 * as used in mp4 format.
 *
 * @arg {ArrayBuffer} bytes.
 * @returns {Number} Big endian representation.
 */
function bytesToNumber(bytes) {
  bytes = new Uint8Array(bytes);
  var num = 0;
  for (var i = 0; i < bytes.length; i++) {
    num = (num << 8) >>> 0;  // ">>> 0" to always interpret as unsigned.
    num += bytes[i];
  }
  return num;
}

/**
 * Converts ArrayBuffer to a String.
 * Null bytes are treated as empty.
 *
 * @arg {ArrayBuffer} bytes.
 * @returns {String} resulting string.
 */
function bytesToString(bytes) {
  bytes = new Uint8Array(bytes);
  var str = '';
  for (var i = 0; i < bytes.length; i++) {
    str += bytes[i] ? String.fromCharCode(bytes[i]) : '';
  }
  return str;
}

/**
 * Reads a blob as an ArrayBuffer.
 *
 * @arg {Blob} blob.
 * @returns {ArrayBuffer} in callback function.
 */
function blobToArrayBuffer(blob, callback) {
  var reader = new FileReader();
  reader.onload = function() {
    callback(null, reader.result); 
  };
  reader.readAsArrayBuffer(blob);
}

/**
 * Ensures that a the first argument, if a blob,
 * is converted to an ArrayBuffer.
 *
 * @arg {ArrayBuffer | Blob} data.
 * @returns {ArrayBuffer} in callback function.
 */
function ensureArrayBuffer(data, callback) {
  if (data instanceof Blob) {
    blobToArrayBuffer(data, callback);
  } else {
    callback(null, data);
  }
}

/**
 * Consumes Atom header.
 *
 * @arg {ArrayBuffer | Blob} data.
 * @arg {Number} start - start position of atom header.
 * @arg {Number} end - end position of atom(s).
 * @returns {Object} atom info in callback
 */
function consumeAtomHeader(data, start, end, callback) {
  ensureArrayBuffer(data.slice(start, start + 16), function (err, buff) {

    if (err) {
      return callback(err);
    }

    var headerSize = 8;
    var atom = {
      size: bytesToNumber(buff.slice(0, 4)),
      type: bytesToString(buff.slice(4, 8))
    };

    if (atom.size === 0) {

      // If atom size is 0, atom extends to the end of the file.
      atom.size = end - start;

    } else if (atom.size === 1) {

      // If atom size is 1, the size is 64-bit.
      headerSize = 16;
      atom.size = bytesToNumber(buff.slice(8, 16));
    }

    // Atoms must be at least the size of the header.
    if (atom.size < headerSize) {
      return callback('Invalid Atom Header');
    }

    callback(null, atom);

  });
}

/**
 * Consumes a MVHD atom.
 *
 * @arg {ArrayBuffer | Blob} data.
 * @arg {Number} start - start position of atom header.
 * @arg {Number} end - end position of atom.
 * @returns {Object} atom info in callback
 */
function consumeMvhd(data, start, end, callback) {
  ensureArrayBuffer(data.slice(start, start + 26), function (err, buff) {
    if (err) {
      callback(err);
    } else {
      callback(null, {
        //version: bytesToNumber(buff.slice(0, 1)),
        //flags: bytesToNumber(buff.slice(1, 4)),
        creationTime: bytesToNumber(buff.slice(4, 8)),
        modificationTime: bytesToNumber(buff.slice(8, 12)),
        timeScale: bytesToNumber(buff.slice(12, 16)),
        duration: bytesToNumber(buff.slice(16, 20)),
        preferredRate: bytesToNumber(buff.slice(20, 24)),
        preferredVolume: bytesToNumber(buff.slice(24, 26))
      });
    }
  });
}

/**
 * Consumes a Hdlr atom.
 *
 * @arg {ArrayBuffer | Blob} data.
 * @arg {Number} start - start position of atom header.
 * @arg {Number} end - end position of atom.
 * @returns {Object} atom info in callback
 */
function consumeHdlr(data, start, end, callback) {
  ensureArrayBuffer(data.slice(start, end), function (err, buff) {
    if (err) {
      callback(err);
    } else {
      callback(null, {
        //version: bytesToNumber(buff.slice(0, 1)),
        //flags: bytesToNumber(buff.slice(1, 4)),
        type: bytesToString(buff.slice(4, 8)),
        subtype: bytesToString(buff.slice(8, 12)),
        name: bytesToString(buff.slice(12, end))
      });
    }
  });
}

/**
 * Consumes a Mdhd atom.
 *
 * @arg {ArrayBuffer | Blob} data.
 * @arg {Number} start - start position of atom header.
 * @arg {Number} end - end position of atom.
 * @returns {Object} atom info in callback
 */
function consumeMdhd(data, start, end, callback) {
  ensureArrayBuffer(data.slice(start, start + 22), function (err, buff) {
    if (err) {
      callback(err);
    } else {
      callback(null, {
        //version: bytesToNumber(buff.slice(0, 1)),
        //flags: bytesToNumber(buff.slice(1, 4)),
        creationTime: bytesToNumber(buff.slice(4, 8)),
        modificationTime: bytesToNumber(buff.slice(8, 12)),
        timeScale: bytesToNumber(buff.slice(12, 16)),
        duration: bytesToNumber(buff.slice(16, 20)),
        language: bytesToNumber(buff.slice(20, 22)),
      });
    }
  });
}

/**
 * Consumes a Stsd atom.
 *
 * @arg {ArrayBuffer | Blob} data.
 * @arg {Number} start - start position of atom header.
 * @arg {Number} end - end position of atom.
 * @returns {Object} atom info in callback
 */
function consumeStsd(data, start, end, callback) {
  ensureArrayBuffer(data.slice(start, start + 48), function (err, buff) {
    if (err) {
      callback(err);
    } else {
      callback(null, {
        //version: bytesToNumber(buff.slice(0, 1)),
        //flags: bytesToNumber(buff.slice(1, 4)),
        //
        //
        format: bytesToString(buff.slice(12, 16)),
        //
        //
        width: bytesToNumber(buff.slice(40, 42)),
        height: bytesToNumber(buff.slice(42, 44)),
        xResolution: bytesToNumber(buff.slice(44, 46)),
        yResolution: bytesToNumber(buff.slice(46, 48)),
      });
    }
  });
}

/**
 * Consumes a Stsd atom.
 *
 * @arg {ArrayBuffer | Blob} data.
 * @arg {Number} start - start position of atom header.
 * @arg {Number} end - end position of atom.
 * @returns {Object} atom info in callback
 */
function consumeStsz(data, start, end, callback) {
  ensureArrayBuffer(data.slice(start, start + 12), function (err, buff) {
    if (err) {
      callback(err);
    } else {
      callback(null, {
        //version: bytesToNumber(buff.slice(0, 1)),
        //flags: bytesToNumber(buff.slice(1, 4)),
        sampleSize: bytesToNumber(buff.slice(4, 8)),
        sampleCount: bytesToNumber(buff.slice(8, 12)),
      });
    }
  });
}

/**
 * Consumes Atoms from the provided data.
 *
 * @arg {ArrayBuffer | Blob} data.
 * @arg {Number} start - slice start.
 * @arg {Number} end - slice end.
 * @returns {Object} atom object.
 */
function consumeAtoms(data, start, end, callback) {

  var atoms = [];
  var n = start;

  function next() {

    if (n >= end) {
      return callback(null, atoms);
    }

    consumeAtomHeader(data, n, end, function (err, atom) {

      if (err) {
        return callback(err);
      }

      var atomStart = n + 8;
      var atomEnd = n + atom.size;

      atoms.push(atom);
      n = atomEnd;

      switch (atom.type) {

        // Atoms that contain atoms.

        case 'moov':
        case 'trak':
        case 'mdia':
        case 'minf':
        case 'dinf':
        case 'stbl':
          consumeAtoms(data, atomStart, atomEnd, function (err, arr) {
            if (err) {
              callback(err);
            } else {
              atom.atoms = arr;
              next();
            }
          });
          break;

        // Atoms that contain data.

        case 'mvhd':
          consumeMvhd(data, atomStart, atomEnd, function (err, data) {
            if (err) {
              callback(err);
            } else {
              atom.data = data;
              next();
            }
          });
          break;

        case 'hdlr':
          consumeHdlr(data, atomStart, atomEnd, function (err, data) {
            if (err) {
              callback(err);
            } else {
              atom.data = data;
              next();
            }
          });
          break;

        case 'mdhd':
          consumeMdhd(data, atomStart, atomEnd, function (err, data) {
            if (err) {
              callback(err);
            } else {
              atom.data = data;
              next();
            }
          });
          break;

        case 'stsd':
          consumeStsd(data, atomStart, atomEnd, function (err, data) {
            if (err) {
              callback(err);
            } else {
              atom.data = data;
              next();
            }
          });
          break;

        case 'stsz':
          consumeStsz(data, atomStart, atomEnd, function (err, data) {
            if (err) {
              callback(err);
            } else {
              atom.data = data;
              next();
            }
          });
          break;

        default:
          next();
          break;
      }
    });
  }

  next();
}

/**
 * Gets metadata for a given video file (mp4 or mov).
 *
 * @args {Blob|ArrayBuffer|Array} file - video file data.
 * @returns {Object} video properties in callback.
 */
function getMp4Info(file, callback) {

  if (!file) {
    callback('File is required');
  }

  if (!(file instanceof Blob)) {
    throw new Error('"file" must be a Blob');
  }

  consumeAtoms(file, 0, file.size, function (err, atoms) {

    if (err) {
      return callback(err);
    }

    // TODO: Traverse the atoms here.

    callback(null, atoms);

  });
}

/**
 * Prints the MP4 data nicely.
 *
 * @args {Array} atoms - atoms to print.
 */
function printAtoms(atoms, prefix) {
  prefix = prefix || '';

  for (var i = 0; i < atoms.length; i++) {
    var atom = atoms[i];

    // Print type.
    console.log(prefix + atom.type);

    // Print data.
    if (atom.data) {
      for (var key in atom.data) {
        console.log(prefix + ' | ' + key + ': ' + atom.data[key]);
      }
    }

    // Print child atoms.
    if (atom.atoms) {
      printAtoms(atom.atoms, prefix + ' | ');
    }
  }
}
