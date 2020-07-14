/*
  getMp4MetadataFromFile.js
*/

// Converts ArrayBuffer to Big Endian number (for mp4 format).
function bytesToNumber(bytes) {
  bytes = new Uint8Array(bytes);
  let num = 0;
  for (let i = 0; i < bytes.length; i += 1) {
    num = (num << 8) >>> 0;  // ">>> 0" to always interpret as unsigned.
    num += bytes[i];
  }
  return num;
}

// Converts ArrayBuffer to String.
function bytesToString(bytes) {
  bytes = new Uint8Array(bytes);
  let str = '';
  for (let i = 0; i < bytes.length; i += 1) {
    str += bytes[i] ? String.fromCharCode(bytes[i]) : '';  // Null bytes ignored.
  }
  return str;
}

// Consumes part of a file as Bytes.
function consumeBytes(file, start, end) {
  if (end > file.size) {
    throw new Error('Invalid mp4 file');
  }
  return file.slice(start, end).arrayBuffer();
}

// Consumes part of a file as a Number (Big endian).
function consumeNumber(file, start, end) {
  return consumeBytes(file, start, end).then(arr => bytesToNumber(arr));
}

// Consumes part of a file as a String (ignoring null characters).
function consumeString(file, start, end) {
  return consumeBytes(file, start, end).then(arr => bytesToString(arr));
}

// Consumes a 'mvhd' atom.
async function consumeMvhd(file, start, end) {
  const data = {};
  let n = start;

  //data.version = await consumeNumber(n, 1);
  n += 1;

  //data.flags = await consumeNumber(n, 3);
  n += 3;

  data.creationTime = await consumeNumber(file, n, n += 4);
  data.modificationTime = await consumeNumber(file, n, n += 4);
  data.timeScale = await consumeNumber(file, n, n += 4);
  data.duration = await consumeNumber(file, n, n += 4);
  data.preferredRate = await consumeNumber(file, n, n += 4);
  data.preferredVolume = await consumeNumber(file, n, n += 2);

  // Reseved (10 bytes).
  n += 10;

  // Matrix.
  // ??

  // Predefines.
  // ??

  // Next Track ID.
  // ??

  return data;
}

// Consumes a 'hdlr' atom.
async function consumeHdlr(file, start, end) {
  const data = {};
  let n = start;

  //data.version = await consumeNumber(n, 1);
  n += 1;

  //data.flags = await consumeNumber(n, 3);
  n += 3;

  data.type = await consumeString(file, n, n += 4);
  data.subtype = await consumeString(file, n, n += 4);
  data.name = await consumeString(file, n, end);

  return data;
}

// Consumes a 'mdhd'.
async function consumeMdhd(file, start, end) {
  const data = {};
  let n = start;

  //data.version = await consumeNumber(n, 1);
  n += 1;

  //data.flags = await consumeNumber(n, 3);
  n += 3;

  data.creationTime = await consumeNumber(file, n, n += 4);
  data.modificationTime = await consumeNumber(file, n, n += 4);
  data.timeScale = await consumeNumber(file, n, n += 4);
  data.duration = await consumeNumber(file, n, n += 4);
  data.language = await consumeNumber(file, n, n += 2);

  // predefined
  n += 2;

  return data;
}

// Consumes a 'stsd'.
async function consumeStsd(file, start, end) {
  const data = {};
  let n = start;

  //data.version = await consumeNumber(n, 1);
  n += 1;

  //data.flags = await consumeNumber(n, 3);
  n += 3;

  // Number of entries.
  n += 4;

  // Sample description.
  n += 4;

  // Data format.
  data.format = await consumeString(file, n, n += 4);

  // Reserved.
  n += 6;

  // Data reference index.
  n += 2;

  // Reserved.
  n += 16;

  data.width = await consumeNumber(file, n, n += 2);
  data.height = await consumeNumber(file, n, n += 2);
  data.resolution = await consumeNumber(file, n, n += 2);
  
  // Is there only one resoltion property? This usually gives 0.
  // data.yResolution = await consumeNumber(file, n, n += 2);

  return data;
}

// Consumes a 'stsz'.
async function consumeStsz(file, start, end) {
  const data = {};
  let n = start;

  //data.version = await consumeNumber(n, 1);
  n += 1;

  //data.flags = await consumeNumber(n, 3);
  n += 3;

  data.sampleSize = await consumeNumber(file, n, n += 4);
  data.sampleCount = await consumeNumber(file, n, n += 4);

  // Chunk table here.

  return data;
}

// Helper Atom class.
class Atom {

  constructor(size, type) {
    this.size = size;
    this.type = type;
    this.atoms = [];
    this.data = {};
  }

  get(type, callback) {
    return this.atoms
      .filter(atom => atom.type === type)
      .forEach(atom => callback(atom));
  }
}

// Consumes a range of atoms.
async function consumeAtoms(file, start, end) {
  const atoms = [];
  let n = start;

  while (n < end) {
    const atomStart = n;

    let atomSize = await consumeNumber(file, n, n += 4);
    const atomType = await consumeString(file, n, n += 4);

    // Check special sizes.
    if (atomSize === 0) {
      // If atom size is 0, atom extends to the end of the file.
      atomSize = end - n;
    } else if (atomSize === 1) {
      // If atom size is 1, the size is 64-bit.
      atomSize = await consumeNumber(file, n, n += 8);
    }

    // Something has gone wrong reading the atomSize.
    // Cancel reading the rest of the atoms.
    if (atomSize <= 0) {
      return atoms;
    }

    // New atom.
    const atom = new Atom(atomSize, atomType);

    // Consume the atom.
    const atomEnd = atomStart + atomSize;
    switch (atom.type) {

      // Atoms that contain more atoms.
      case 'moov':
      case 'trak':
      case 'mdia':
      case 'minf':
      case 'dinf':
      case 'stbl':
        atom.atoms = await consumeAtoms(file, n, atomEnd);
        break;

      // Atoms that contain data.
      case 'mvhd':
        atom.data = await consumeMvhd(file, n, atomEnd);
        break;
      case 'hdlr':
        atom.data = await consumeHdlr(file, n, atomEnd);
        break;
      case 'mdhd':
        atom.data = await consumeMdhd(file, n, atomEnd);
        break;
      case 'stsd':
        atom.data = await consumeStsd(file, n, atomEnd);
        break;
      case 'stsz':
        atom.data = await consumeStsz(file, n, atomEnd);
        break;
    }

    n = atomEnd;
    atoms.push(atom);
  }

  return atoms;
}

/**
 * Gets metadata for a given video file (mp4 or mov).
 *
 * @args {Blob} file - video file.
 * @returns {Object} video properties.
 */
export default async function (file) {

  if (!file) {
    throw new Error('"file" is required');
  }

  if (!(file instanceof Blob)) {
    throw new Error('"file" must be a Blob');
  }

  if (!file.type || !file.type.startsWith('video/')) {
    throw new Error('"file" must be a video');
  }

  const atoms = await consumeAtoms(file, 0, file.size);
  const result = {};

  // Traverse the atom tree to find the desired video metadata.
  atoms.filter(atom => atom.type === 'moov').forEach(atom => {

    atom.get('mvhd', atom => {
      result.duration = atom.data.duration / atom.data.timeScale;
    });

    atom.get('trak', atom => {
      atom.get('mdia', atom => {

        // If is track is a video track, we use the data here
        // for the overall metadata.
        let subtype;
        atom.get('hdlr', atom => {
          subtype = atom.data.subtype;
        });
        if (subtype !== 'vide') {
          return;
        }

        let timeScale;
        let duration;
        let sampleCount;
        let width;
        let height;
        let resolution;

        atom.get('mdhd', atom => {
          timeScale = atom.data.timeScale;
          duration = atom.data.duration;
        });

        atom.get('minf', atom => {
          atom.get('stbl', atom => {

            atom.get('stsd', atom => {
              width = atom.data.width;
              height = atom.data.height;
              resolution = atom.data.resolution;
            });

            atom.get('stsz', atom => {
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
