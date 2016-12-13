let _ = require('lodash');
let ref = require('ref');
let ArrayType = require('ref-array');

let RingBuffer = require('./ring-buffer');

let FloatArray = ArrayType(ref.types.float);
let ShortArray = ArrayType(ref.types.short);
let initialAudioOutGain = 25;
let maxBufferSize = 25;

let AudioProcessor = function() {
  this._maxBuffer = new RingBuffer(maxBufferSize);
  this._audioOutGain = initialAudioOutGain;
  console.log('created audio processor');
  
};

AudioProcessor.prototype.processBatch = function(input) {
  this._audioInBuffer = new FloatArray(input);
  console.log('Audio Buffer length = ' + this._audioInBuffer.length);

  this.fixGain();
  this.floatToShort();

  return this._audioOutBuffer;
};

AudioProcessor.prototype.fixGain = function() {
  let max = 0;
  let gainfactor;

  _.each(this._audioInBuffer, function(val) {
    val = Math.abs(val);
    if (val > max) {
      max = val;
    }
  });

  this._maxBuffer.push(max);

  let maxHistory = this._maxBuffer.max();

  if (maxHistory > max) {
    max = maxHistory;
  }

  if (max > 0) {
    gainfactor = (32767 / max);
  } else {
    gainfactor = 50;
  }

  if (gainfactor < this._audioOutGain) {
    this._audioOutGain = gainfactor;
    gaindelta = 0;
  } else {
    if (gainfactor > 50) {
      gainfactor = 50;
    }
    gaindelta = gainfactor - this._audioOutGain;
    if (gaindelta > (0.05 * this._audioOutGain)) {
      gaindelta = (0.05 * this._audioOutGain);
    }
  }
  // adjust output gain
  this._audioOutGain += gaindelta;

  _.each(this._audioInBuffer, (val, index) => {
    let tmp = val * this._audioOutGain;

    if (val > 32767) {
      val = 32767;
    } else if (val < -32767) {
      val = -32767;
    }

    this._audioInBuffer[index] = tmp;
  });
};

AudioProcessor.prototype.floatToShort = function() {
  this._audioOutBuffer = new ShortArray(160);

  _.each(this._audioInBuffer, (val, index) => {
    // console.log("Float = " + val);
    this._audioOutBuffer[index] = Math.round(val);
    // console.log("Short = " + this._audioOutBuffer[index]);
  });
};

module.exports = AudioProcessor;
