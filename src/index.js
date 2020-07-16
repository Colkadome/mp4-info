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
function toArrayBuffer(blob, callback) {
  var reader = new FileReader();
  reader.onload = function() {
    callback(null, reader.result); 
  };
  reader.onerror = function () {
    callback(new Error('Failed to read file'));
    reader.abort();
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
    toArrayBuffer(data, callback);
  } else {
    return callback(null, data);
  }
}

/**
 * Consumes Atom header.
 *
 * @arg {ArrayBuffer | Blob} data.
 * @arg {Number} start - start position of atom group.
 * @arg {Number} end - end position of atom group.
 * @returns {Object} atom info in callback
 */
function consumeAtomHeader(data, start, end, callback) {
  return ensureArrayBuffer(data.slice(start, start + 16), function (err, buff) {

    if (err) {
      return callback(err);
    }

    var headerSize = 8;
    var atom = {
      size: bytesToNumber(buff.slice(0, 4)),
      type: bytesToString(buff.slice(4, 8))
    };

    if (atom.type.length !== 4) {
      return callback(new Error('Invalid Atom Type'));
    }

    // Sanity check.
    if (Number.isNaN(atom.size)) {
      return callback(new Error('Invalid Atom Size'));
    }

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
      return callback(new Error('Invalid Atom Size'));
    }

    // Atom can't be larger than the total size.
    if (atom.size > end - start) {
      return callback(new Error('Invalid Atom Size'));
    }

    return callback(null, atom);

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
  return ensureArrayBuffer(data.slice(start, start + 26), function (err, buff) {
    if (err) {
      return callback(err);
    } else {
      return callback(null, {
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
  return ensureArrayBuffer(data.slice(start, end), function (err, buff) {
    if (err) {
      return callback(err);
    } else {
      return callback(null, {
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
  return ensureArrayBuffer(data.slice(start, start + 22), function (err, buff) {
    if (err) {
      return callback(err);
    } else {
      return callback(null, {
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
  return ensureArrayBuffer(data.slice(start, start + 48), function (err, buff) {
    if (err) {
      return callback(err);
    } else {
      return callback(null, {
        //version: bytesToNumber(buff.slice(0, 1)),
        //flags: bytesToNumber(buff.slice(1, 4)),
        //
        //
        format: bytesToString(buff.slice(12, 16)),
        //
        //
        width: bytesToNumber(buff.slice(40, 42)),
        height: bytesToNumber(buff.slice(42, 44)),
        resolution: bytesToNumber(buff.slice(44, 46)),
        //yResolution: bytesToNumber(buff.slice(46, 48)),
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
  return ensureArrayBuffer(data.slice(start, start + 12), function (err, buff) {
    if (err) {
      return callback(err);
    } else {
      return callback(null, {
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
 * NOTE: Callbacks always come with 'return' in case we're doing
 * the synchronous version.
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

    return consumeAtomHeader(data, n, end, function (err, atom) {

      if (err) {
        return callback(err);
      }

      var atomStart = n + 8;
      var atomEnd = n + atom.size;

      atoms.push(atom);
      n = atomEnd;

      switch (atom.type) {

        // Atoms that contain more atoms.

        case 'moov':
        case 'trak':
        case 'mdia':
        case 'minf':
        case 'dinf':
        case 'stbl':
          return consumeAtoms(data, atomStart, atomEnd, function (err, arr) {
            if (err) {
              return callback(err);
            } else {
              atom.atoms = arr;
              return next();
            }
          });
          break;

        // Atoms that contain data.
        // NOTE: There are probably lots more that could be checked for here.

        case 'mvhd':
          return consumeMvhd(data, atomStart, atomEnd, function (err, data) {
            if (err) {
              return callback(err);
            } else {
              atom.data = data;
              return next();
            }
          });
          break;

        case 'hdlr':
          return consumeHdlr(data, atomStart, atomEnd, function (err, data) {
            if (err) {
              return callback(err);
            } else {
              atom.data = data;
              return next();
            }
          });
          break;

        case 'mdhd':
          return consumeMdhd(data, atomStart, atomEnd, function (err, data) {
            if (err) {
              return callback(err);
            } else {
              atom.data = data;
              return next();
            }
          });
          break;

        case 'stsd':
          return consumeStsd(data, atomStart, atomEnd, function (err, data) {
            if (err) {
              return callback(err);
            } else {
              atom.data = data;
              return next();
            }
          });
          break;

        case 'stsz':
          return consumeStsz(data, atomStart, atomEnd, function (err, data) {
            if (err) {
              return callback(err);
            } else {
              atom.data = data;
              return next();
            }
          });
          break;

        default:
          return next();
          break;
      }
    });
  }

  return next();
}

/**
 * Short-hand for accessing atoms of a certain type.
 */
function forAtoms(atoms, type, callback) {
  if (atoms) {
    atoms
      .filter(function (atom) { return atom.type === type; })
      .forEach(function (atom) { callback(atom); });
  }
}

/**
 * Gets metadata for given video atoms.
 *
 * @args {Array} atoms - Array of atoms.
 * @returns {Object} video properties.
 */
function getMp4InfoFromAtoms(atoms) {

  var result = {};

  forAtoms(atoms, 'moov', function(atom) {

    forAtoms(atom.atoms, 'mvhd', function(atom) {
      result.duration = atom.data.duration / atom.data.timeScale;
    });

    forAtoms(atom.atoms, 'trak', function(atom) {
      forAtoms(atom.atoms, 'mdia', function(atom) {

        // If is track is a video track, we use the data here
        // for the overall metadata.
        var subtype;
        forAtoms(atom.atoms, 'hdlr', function(atom) {
          subtype = atom.data.subtype;
        });
        if (subtype !== 'vide') {
          return;
        }

        var timeScale;
        var duration;
        var sampleCount;
        var width;
        var height;
        var resolution;

        forAtoms(atom.atoms, 'mdhd', function(atom) {
          timeScale = atom.data.timeScale;
          duration = atom.data.duration;
        });

        forAtoms(atom.atoms, 'minf', function(atom) {
          forAtoms(atom.atoms, 'stbl', function(atom) {

            forAtoms(atom.atoms, 'stsd', function(atom) {
              width = atom.data.width;
              height = atom.data.height;
              resolution = atom.data.resolution;
            });

            forAtoms(atom.atoms, 'stsz', function(atom) {
              sampleCount = atom.data.sampleCount;
            });

          });
        });

        if (width) {
          result.width = width;
        }
        if (height) {
          result.height = height;
        }
        if (resolution) {
          result.resolution = resolution;
        }
        if (sampleCount && timeScale && duration) {
          result.frameRate = (sampleCount * timeScale) / duration;
        }
      
      });
    });

  });

  return result;
}

/**
 * Gets metadata for a given video file (mp4 or mov).
 *
 * NOTE: If 'file' is not a Blob, this function can be used synchronously.
 *
 * @args {Blob|ArrayBuffer|Array} file - video file data.
 * @returns {Object} video properties in callback.
 */
function getMp4Info(file, callback) {
  callback = callback || function (err, res) {
    if (err) {
      throw err;
    } else {
      return res;
    }
  };
  if (typeof callback !== 'function') {
    throw new Error('Callback must be a function');
  }

  if (!file) {
    return callback(new Error('File is required'));
  }

  var size = 0;

  if (file instanceof Blob) {
    size = file.size;
  } else if (file instanceof ArrayBuffer) {
    size = file.byteLength;
  } else if (ArrayBuffer.isView(file)) {
    if (file instanceof Uint8Array) {
      size = file.length;
    } else {
      file = new Uint8Array(file);
      size = file.length;
    }
  } else if (Array.isArray(file)) {
    size = file.length;
  } else {
    return callback(new Error('"file" must be one of: Blob, ArrayBuffer, Array'));
  }

  return consumeAtoms(file, 0, size, function (err, atoms) {

    if (err) {
      return callback(err);
    }

    var result = getMp4InfoFromAtoms(atoms);
    result.atoms = atoms;

    return callback(null, result);

  });
}
