const assert = require('assert');
const _ = require('lodash');
const wav = require('wav');
const fs = require('fs');
const path = require('path');
const streamBuffers = require('stream-buffers');

const moduleName = require('../package.json').name;
const filename = path.basename(__filename);
const debug = require('debug')(moduleName)  

const ProcessImbeTransform = require('../').ProcessImbeTransform;
const ImbeAudioTransform = require('../').ImbeAudioTransform;

const processImbeTransform = new ProcessImbeTransform();
const imbeAudioTransform = new ImbeAudioTransform();

const readableStreamBuffer = new streamBuffers.ReadableStreamBuffer();

const wavWriter = new wav.FileWriter(__dirname + '/../samples/test3-out.wav', {
  sampleRate: 8000,
  channels: 1
});

readableStreamBuffer
  .pipe(processImbeTransform)
  .pipe(imbeAudioTransform)
  .pipe(wavWriter);

const init = function() {

  const fileData = fs.readFileSync(__dirname + '/../samples/test1-in.imb');

  const fileType = fileData.slice(0, 4).toString('ascii');
  assert(fileType === '.imb');

  const imbeContents = fileData.slice(4);

	readableStreamBuffer.put(imbeContents);

	readableStreamBuffer.stop();
};

init();

