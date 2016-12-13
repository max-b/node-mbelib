var ref = require('ref');
var ArrayType = require('ref-array');

var CharArray = ArrayType(ref.types.char);

var readImbe4400Data = function(input) {
  var imbeData = Buffer.alloc(88);
  var b;
  var k = 0;

  for (var i = 0; i < 11; i++) {
    b = input[i];
    for (var j = 0; j < 8; j++) {
      imbeData[k] = (b & 128) >> 7;
      b = b << 1;
      b = b & 255;
      k++;
    }
  }

  return imbeData;

};

module.exports = readImbe4400Data;
