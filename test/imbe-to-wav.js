const assert = require('assert');
const _ = require('lodash');
const wav = require('wav');
const fs = require('fs');
const streamBuffers = require('stream-buffers');

const ProcessImbeTransform = require('../').ProcessImbeTransform;
const ImbeAudioTransform = require('../').ImbeAudioTransform;

const processImbeTransform = new ProcessImbeTransform();
const imbeAudioTransform = new ImbeAudioTransform();

const readableStreamBuffer = new streamBuffers.ReadableStreamBuffer();

const wavWriter = new wav.FileWriter(__dirname + '/../samples/test4-out.wav', {
  sampleRate: 8000,
  channels: 1
});

readableStreamBuffer
  .pipe(processImbeTransform)
  .pipe(imbeAudioTransform)
  .pipe(wavWriter);

const init = function() {

  let fileData = fs.readFileSync(__dirname + '/../samples/test2-in.imb');

  let fileType = fileData.slice(0, 4).toString('ascii');
  assert(fileType === '.imb');

  let imbeContents = fileData.slice(4);

	readableStreamBuffer.put(imbeContents);

};

init();

