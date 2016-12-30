const path = require('path');
const ref = require('ref');
const ffi = require('ffi');
const _ = require('lodash');
const Transform = require('stream').Transform;
const assert = require('assert');

const readImbeData = require('./read-imbe-data');
const AudioTransform = require('./imbe-audio-transform');

const moduleName = require('../package.json').name;
const filename = path.basename(__filename);
const debug = require('debug')(moduleName)  

const FloatPtr = ref.refType(ref.types.float);
const ShortPtr = ref.refType(ref.types.short);
const StringPtr = ref.refType(ref.types.CString);
const IntPtr = ref.refType(ref.types.int);

const StructType = require('ref-struct');
const ArrayType = require('ref-array');
const CharArray = ArrayType(ref.types.byte);
const FloatArray = ArrayType(ref.types.float);
const ShortArray = ArrayType(ref.types.short);

const Mbe = ref.types.void;
const MbePtr = ref.refType(Mbe);
const MbePtrPtr = ref.refType(MbePtr);

const uvQuality = 3; // TODO: From default params in dsd_main.c

const MbeParamsType = StructType({
  w0: ref.types.float,
  L: ref.types.int,
  K: ref.types.int,
  Vl: ArrayType(ref.types.int, 57),
  Ml: ArrayType(ref.types.float, 57),
  log2Ml: ArrayType(ref.types.float, 57),
  PHIl: ArrayType(ref.types.float, 57),
  PSIl: ArrayType(ref.types.float, 57),
  gamma: ref.types.float,
  un: ref.types.int,
  repeat: ref.types.int
});

const MbeParamsPtr = ref.refType(MbeParamsType);

const libmbe = ffi.Library(__dirname + '/../include/mbelib/build/libmbe', {
  'mbe_printVersion': [ 'void', [ 'string' ] ],
  'mbe_initMbeParms': [ 'void', [ MbeParamsPtr, MbeParamsPtr, MbeParamsPtr ] ],
  'mbe_processImbe4400Dataf': [ 'void', [ FloatPtr, IntPtr, IntPtr, 'string', CharArray, MbeParamsPtr, MbeParamsPtr, MbeParamsPtr, 'int' ] ],
});

class ProcessImbeTransform extends Transform {
  constructor(options) {
    super(options);
    this._accumulator = Buffer(0);
    debug('ProcessImbeTranform Constructor', filename);
  }

  _transform(inputData, encoding, callback) {
    debug('transform called with inputData length = ' + inputData.length, filename);
    const { audioOutBuffer, mbeParams } = this._initParams();

    if (this._accumulator.length > 0) {
      debug('this._accumulator is non-zero. Has length = ' + this._accumulator.length, filename);
      inputData = Buffer.concat([this._accumulator, inputData]);
      debug('inputData is now length = ' + inputData.length, filename);
      this._accumulator = Buffer.alloc(0);
    }

    const chunks = _.chunk(inputData, 12);

    _.each(chunks, (chunk) => {
      debug('Chunk length = ' + chunk.length, filename);

      if (chunk.length < 12) {
        this._accumulator = Buffer.from(chunk);
        debug('Setting accumulator with length: ' + this._accumulator.length, filename);
        return;
      }
      this._processImbe(chunk, audioOutBuffer, mbeParams);

    });
     
    callback();
  }

  _initParams() {
    const mbeParams = {
      curMbeParams: ref.alloc(MbeParamsType),
      prevMbeParams: ref.alloc(MbeParamsType),
      prevMbeParamsEnhanced: ref.alloc(MbeParamsType),
    };

    libmbe.mbe_initMbeParms(mbeParams.curMbeParams, mbeParams.prevMbeParams, mbeParams.prevMbeParamsEnhanced);

    return {
      audioOutBuffer: Buffer.alloc(640),
      mbeParams: mbeParams,
    };
  }

  _flush(callback) {
    if (this.accumulator.length === 12) {

      const { audioOutBuffer, mbeParams } = this._initParams();
      this._processImbe(this.accumulator, audioOutBuffer, mbeParams);
      this._accumulator = Buffer.alloc(0);
    } else {
      debug('Incorrect size chunk at end of transform stream accumulator', filename);
    }

    callback();
  }

  _processImbe(chunk, audioOutBuffer, mbeParams) {
    const imbeData = readImbeData(chunk.slice(1));
    const errs1Ptr = ref.alloc('int', chunk[0]);
    const errs2Ptr = ref.alloc('int', chunk[0]);
    const errStringPtr = ref.alloc('string');

    libmbe.mbe_processImbe4400Dataf(audioOutBuffer, errs1Ptr, errs2Ptr, errStringPtr, imbeData, mbeParams.curMbeParams, mbeParams.prevMbeParams, mbeParams.prevMbeParamsEnhanced, uvQuality);

    const errorString = ref.readCString(errStringPtr, 0);
    if (errorString !== '') {
      debug('errorString: ' + errorString, filename);
    }
    if (errs1Ptr.deref() !== 0) {
      debug('error1: ' + errs1Ptr.deref(), filename);
    }
    if (errs2Ptr.deref() !== 0) {
      debug('error2: ' + errs2Ptr.deref(), filename);
    }

    this.push(audioOutBuffer);
  }

}

module.exports = ProcessImbeTransform;

