const fs = require('fs');
const assert = require('assert');
const wav = require('wav');
const _ = require('lodash');
const protobuf = require('protobufjs');
const AWS = require('aws-sdk');
const KinesisReadable = require('kinesis-readable');


const settings = require(__dirname + '/../settings');

const ImbeTransform = require('./process-imbe');
const ImbeAudioTransform = require('./process-imbe-audio');

let kinesis;
let BaseMessage;
let P25ChannelId;
let P25DataUnit;

const wavWriter = new wav.FileWriter(__dirname + '/../samples/test3-out.wav', {
  sampleRate: 8000,
  channels: 1
});

const imbeTransform = new ImbeTransform();
const imbeAudioTransform = new ImbeAudioTransform();

imbeTransform
  .pipe(imbeAudioTransform)
  .pipe(wavWriter);

const setupAws = function () {
  const awsConfig = {
    accessKeyId: settings.aws.accessKeyId,
    secretAccessKey: settings.aws.secretAccessKey,
    region: settings.aws.region,
    params: {
      StreamName: settings.aws.streamName
    }
  };

  kinesis = new AWS.Kinesis(awsConfig);
  const readable = KinesisReadable(kinesis, {
    iterator: 'LATEST'
  });

  readable
    // 'data' events will trigger for a set of records in the stream 
    .on('data', function(records) {
      _.each(records, function(record) {
        if (typeof record.Data !== 'undefined') {

          let data = record.Data;

          while (data.length > 4) {
            let size = Buffer.from(data.slice(0, 4)).readUInt32BE(0);

            data = data.slice(4);

            let message = BaseMessage.decode(data.slice(0, size)).asJSON({
              enum: String
            });


            if (message.p25DataUnit.channelId.type === 'TRAFFIC_DIRECT' || 
                message.p25DataUnit.channelId.type === 'TRAFFIC_GROUP') {

              console.log(message);
              console.log('channel ID type = ' + message.p25DataUnit.channelId.type);
              console.log('bytes length = ' + message.p25DataUnit.bytes.length);
              // imbeTransform.write(Buffer.from(message.p25DataUnit.bytes));
            }

            data = data.slice(size);

          }

          // readable.end();
        }
      });
    })
    // each time a records are passed downstream, the 'checkpoint' event will provide 
    // the last sequence number that has been read 
    .on('checkpoint', function(sequenceNumber) {
      console.log('--CHECKPOINT--');
      console.log(sequenceNumber);
      console.log('--CHECKPOINT--');
    })
    .on('error', function(err) {
      console.error(err);
      imbeTransform.end();
      wavWriter.end();
    })
    .on('end', function() {
      console.log('all done!');
      imbeTransform.end();
      wavWriter.end();
    });

};

const readWriteAndDecode = function () {

  let fileData = fs.createReadStream(__dirname + '/../samples/test2-in.imb');

  // let fileType = fileData.slice(0, 4).toString('ascii');
  // assert(fileType === '.imb');

  // let imbeContents = fileData.slice(4);

  fileData.pipe(imbeTransform);

  // imbeTransform.write(imbeContents);

  // wavWriter.end();
};

const init = function() {

  protobuf.load(__dirname + '/../proto/p25.proto')
    .then(function(root) {
      BaseMessage = root.lookup('p25package.BaseMessage');
      P25ChannelId = root.lookup('p25package.P25ChannelId');
      P25DataUnit = root.lookup('p25package.P25DataUnit');

      setupAws();
    })
    .catch(function(error) {
      console.error(error);
    });
};

init();

// readWriteAndDecode();
