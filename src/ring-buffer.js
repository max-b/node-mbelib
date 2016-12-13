let _ = require('lodash');

let CreateRingBuffer = function(length){
  let pointer = 0; 
  let buffer = []; 

  return {
    get: function(key){
      if (key < 0) {
        return buffer[pointer+key];
      } else if (key === false) {
        return buffer[pointer - 1];
      } else {
        return buffer[key];
      }
    },
    push: function(item) {
      buffer[pointer] = item;
      pointer = (pointer + 1) % length;
      return item;
    },
    max: function() {
      return _.max(buffer);
    }
  };
};

module.exports = CreateRingBuffer;
