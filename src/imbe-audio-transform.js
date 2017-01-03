const path = require('path');
const _ = require('lodash');
const ref = require('ref');
const ArrayType = require('ref-array');
const Transform = require('stream').Transform;

const RingBuffer = require('./ring-buffer');

const moduleName = require('../package.json').name;
const filename = path.basename(__filename);
const debug = require('debug')(moduleName)  

const FloatArray = ArrayType(ref.types.float);
const ShortArray = ArrayType(ref.types.short);
const initialAudioOutGain = 25;
const maxBufferSize = 25;

const AudioProcessor = function() {
  this._maxBuffer = new RingBuffer(maxBufferSize);
  this._audioOutGain = initialAudioOutGain;
  
};

class ImbeAudioTransform extends Transform {
  constructor(options) {
    super(options);
    debug('ImbeAudioTranform Constructor', filename);
    this._maxBuffer = new RingBuffer(maxBufferSize);
    this._audioOutGain = initialAudioOutGain;
  }

  _transform(chunk, encoding, callback) {
    debug('_transform called with chunk length = ', chunk.length, filename);
    this._audioInBuffer = new FloatArray(chunk);

    this.fixGain();

    this._audioOutBuffer = new ShortArray(160);

    this.floatToShort();

    this.push(this._audioOutBuffer.buffer);

    callback();
  }


  floatToShort () {
    _.each(this._audioInBuffer, (val, index) => {
      this._audioOutBuffer[index] = Math.round(val);
    });
  }

  fixGain () {
    let max = 0;
    let gainFactor;
    let gainDelta;

    _.each(this._audioInBuffer, (val) => {
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
      gainFactor = (32767 / max);
    } else {
      gainFactor = 50;
    }

    if (gainFactor < this._audioOutGain) {
      this._audioOutGain = gainFactor;
      gainDelta = 0;
    } else {
      if (gainFactor > 50) {
        gainFactor = 50;
      }
      gainDelta = gainFactor - this._audioOutGain;
      if (gainDelta > (0.05 * this._audioOutGain)) {
        gainDelta = (0.05 * this._audioOutGain);
      }
    }
    // adjust output gain
    this._audioOutGain += gainDelta;

    _.each(this._audioInBuffer, (val, index) => {
      let tmp = val * this._audioOutGain;

      if (val > 32767) {
        val = 32767;
      } else if (val < -32767) {
        val = -32767;
      }

      this._audioInBuffer[index] = tmp;
    });
  }

}

module.exports = ImbeAudioTransform;
