let ref = require('ref');
let ArrayType = require('ref-array');

let CharArray = ArrayType(ref.types.char);

let readImbe4400Data = function(input) {
  let imbeData = Buffer.alloc(88);
  let b;
  let k = 0;

  for (let i = 0; i < 11; i++) {
    b = input[i];
    for (let j = 0; j < 8; j++) {
      imbeData[k] = (b & 128) >> 7;
      b = b << 1;
      b = b & 255;
      k++;
    }
  }

  return imbeData;

};

module.exports = readImbe4400Data;
