const ref = require('ref');
const ffi = require('ffi');
const _ = require('lodash');
const Transform = require('stream').Transform;

const readImbeData = require('./read-imbe-data');
const AudioTransform = require('./process-imbe-audio');

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

class ImbeTransform extends Transform {
  constructor(options) {
    super(options);

    console.log('created ImbeTransform stream');
  }

  _transform(inputData, encoding, callback) {
    console.log('ImbeTransform called _transform with chunk length = ' + inputData.length);
    let audioOutBuffer = Buffer.alloc(640);

    let curMbeParams = ref.alloc(MbeParamsType);
    let prevMbeParams = ref.alloc(MbeParamsType);
    let prevMbeParamsEnhanced = ref.alloc(MbeParamsType);

    libmbe.mbe_initMbeParms(curMbeParams, prevMbeParams, prevMbeParamsEnhanced);

    const chunks = _.chunk(inputData, 12);


    console.log('chunks length = ' + chunks.length);

    _.each(chunks, (chunk) => {

      const imbeData = readImbeData(chunk.slice(1));
      const errs1Ptr = ref.alloc('int', chunk[0]);
      const errs2Ptr = ref.alloc('int', chunk[0]);
      const errStringPtr = ref.alloc('string');

      console.log('about to processImbe4400Dataf');
      console.log(imbeData.length);

      libmbe.mbe_processImbe4400Dataf(audioOutBuffer, errs1Ptr, errs2Ptr, errStringPtr, imbeData, curMbeParams, prevMbeParams, prevMbeParamsEnhanced, uvQuality);
      console.log('passes processImbe4400Dataf');

      // const errorString = ref.readCString(errStringPtr, 0);
      // console.log('errorString: ' + errorString);
      // console.log('error1: ' + errs1Ptr.deref());
      // console.log('error2: ' + errs2Ptr.deref());

      this.push(audioOutBuffer);

    });
     
    console.log('actually gets to callback??');

    callback();
  }
}

module.exports = ImbeTransform;

