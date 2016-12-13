var ref = require('ref');
var ffi = require('ffi');
var fs = require('fs');
var assert = require('assert');
var _ = require('lodash');
var wav = require('wav');

var StructType = require('ref-struct');
var ArrayType = require('ref-array');
var CharArray = ArrayType(ref.types.byte);
var FloatArray = ArrayType(ref.types.float);
var ShortArray = ArrayType(ref.types.short);

var readImbeData = require('./read-imbe-data');
var AudioProcessor = require('./process-imbe-audio');

var FloatPtr = ref.refType(ref.types.float);
var ShortPtr = ref.refType(ref.types.short);
var StringPtr = ref.refType(ref.types.CString);
var IntPtr = ref.refType(ref.types.int);

var Mbe = ref.types.void;
var MbePtr = ref.refType(Mbe);
var MbePtrPtr = ref.refType(MbePtr);

var uvQuality = 3; // TODO: From default params in dsd_main.c

// struct mbe_parameters
// {
//   float w0;
//   int L;
//   int K;
//   int Vl[57];
//   float Ml[57];
//   float log2Ml[57];
//   float PHIl[57];
//   float PSIl[57];
//   float gamma;
//   int un;
//   int repeat;
// };

// typedef struct mbe_parameters mbe_parms;
var MbeParamsType = StructType({
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

var MbeParamsPtr = ref.refType(MbeParamsType);

// void mbe_printVersion (char *str);
// void mbe_initMbeParms (mbe_parms * cur_mp, mbe_parms * prev_mp, mbe_parms * prev_mp_enhanced);
// void mbe_processImbe4400Dataf (float *aout_buf, int *errs, int *errs2, char *err_str, char imbe_d[88], mbe_parms * cur_mp, mbe_parms * prev_mp, mbe_parms * prev_mp_enhanced, int uvquality);
// void mbe_synthesizeSpeechf (float *aout_buf, mbe_parms * cur_mp, mbe_parms * prev_mp, int uvquality);
// void mbe_synthesizeSpeech (short *aout_buf, mbe_parms * cur_mp, mbe_parms * prev_mp, int uvquality);
// void mbe_floattoshort (float *float_buf, short *aout_buf);
// void mbe_moveMbeParms (mbe_parms * cur_mp, mbe_parms * prev_mp);
var libmbe = ffi.Library(__dirname + '/../include/mbelib/build/libmbe', {
  'mbe_printVersion': [ 'void', [ 'string' ] ],
  'mbe_initMbeParms': [ 'void', [ MbeParamsPtr, MbeParamsPtr, MbeParamsPtr ] ],
  'mbe_processImbe4400Dataf': [ 'void', [ FloatPtr, IntPtr, IntPtr, 'string', CharArray, MbeParamsPtr, MbeParamsPtr, MbeParamsPtr, 'int' ] ],
  'mbe_processImbe4400Data': [ 'void', [ ShortPtr, IntPtr, IntPtr, 'string', CharArray, MbeParamsPtr, MbeParamsPtr, MbeParamsPtr, 'int' ] ],
});

var versionPtr = ref.alloc('string');
libmbe.mbe_printVersion(versionPtr);

var version = ref.readCString(versionPtr, 0);
console.log(version);

var fileData = fs.readFileSync(__dirname + '/../samples/test2-in.imb');

var fileType = fileData.slice(0, 4).toString('ascii');
assert(fileType === '.imb');

var curMbeParams = ref.alloc(MbeParamsType);
var prevMbeParams = ref.alloc(MbeParamsType);
var prevMbeParamsEnhanced = ref.alloc(MbeParamsType);

libmbe.mbe_initMbeParms(curMbeParams, prevMbeParams, prevMbeParamsEnhanced);

var wavWriter = new wav.FileWriter(__dirname + '/../samples/test2-out.wav', {
  sampleRate: 8000,
  channels: 1
});

var audioProcessor = new AudioProcessor();

var chunks = _.chunk(fileData.slice(4), 12);
var count = 0;
var audioOutBuffer = Buffer.alloc(640);

// chunks = [chunks[0]]; // TODO REMOVE FOR MORE THAN ONE LOOP
_.each(chunks, function(chunk) {

  var errs1Ptr = ref.alloc('int', chunk[0]);
  var errs2Ptr = ref.alloc('int', chunk[0]);
  var errStringPtr = ref.alloc('string');

  var imbeData = readImbeData(chunk.slice(1));

  console.log('imbeData');
  console.log(imbeData.toString('hex'));
  console.log('errs1:');
  console.log(errs1Ptr.deref());
  console.log('errs2:');
  console.log(errs2Ptr.deref());

  libmbe.mbe_processImbe4400Dataf(audioOutBuffer, errs1Ptr, errs2Ptr, errStringPtr, imbeData, curMbeParams, prevMbeParams, prevMbeParamsEnhanced, uvQuality);

  var errorString = ref.readCString(errStringPtr, 0);
  console.log('errorString:');
  console.log(errorString);
  console.log('audioOutBuffer');

  let fixedAudioOut = audioProcessor.processBatch(audioOutBuffer); 

  console.log('fixedAudioOut');
  console.log('fixedAudioOut length = ' + fixedAudioOut.length);
  console.log('fixedAudioOut buffer length = ' + fixedAudioOut.buffer.length);
  console.log(fixedAudioOut.buffer);
  console.log(audioOutBuffer.toString('hex'));


  wavWriter.write(fixedAudioOut.buffer);
  count++;
});

console.log('count = ' + count);

wavWriter.end();
