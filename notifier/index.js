/**
 * @author Sumanth Reddy Muni <srm9537@nyu.edu>
 */
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')
const Gossipsub = require('libp2p-gossipsub')
const Bootstrap = require('libp2p-bootstrap')
const PubsubPeerDiscovery = require('libp2p-pubsub-peer-discovery')
const uint8ArrayToString = require('uint8arrays/to-string')
const uint8ArrayFromString = require('uint8arrays/from-string')
const Mdns = require('libp2p-mdns')
const KadDHT = require('libp2p-kad-dht')
var AWS = require('aws-sdk');

const config = require('./config.json');
const bootstrapMultiaddrs = config['bootstrapMultiaddrs'];

AWS.config.update({region: 'us-east-1'});

var node;
var myPeerId;

function P2PmessageToObject(message) {
  return JSON.parse(uint8ArrayToString.toString(message.data))
}

function ObjectToP2Pmessage(message) {
  return uint8ArrayFromString.fromString(JSON.stringify(message))
}

function sendMessage(data){
  console.log("sending following notification to SNS")
  console.log(data)

  var params = {
    Destination: { 
      ToAddresses: [
        'EMAIL_ADDRESS'
      ]
    },
    Message: {
      Body: {
        Text: {
         Charset: "UTF-8",
         Data: "Our App detected Cardiac arrhythmia. Please contact your doctor soon. Thanks."
        }
       },
       Subject: {
        Charset: 'UTF-8',
        Data: 'Found Cardiac arrhythmia'
       }
      },
    Source: 'sumanthpdm@gmail.com', 
    ReplyToAddresses: [
       'sumanthpdm@gmail.com'
    ]
  };
  
  var sendPromise = new AWS.SES({apiVersion: '2010-12-01'}).sendEmail(params).promise();
  
  sendPromise.then(
    function(data) {
      console.log(data.MessageId);
    }).catch(
      function(err) {
      console.error(err, err.stack);
    });

  return
}


const createNode = async (bootstrapers) => {
  const node = await Libp2p.create({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    modules: {
      transport: [TCP],
      streamMuxer: [Mplex],
      connEncryption: [NOISE],
      pubsub: Gossipsub,
      peerDiscovery: [Bootstrap, PubsubPeerDiscovery, Mdns],
      dht: KadDHT
    },
    config: {
      dht: {
        enabled: true
        },
      peerDiscovery: {
        autoDial: true,
        [Mdns.tag]: {
          enabled: true
        },
        [PubsubPeerDiscovery.tag]: {
          interval: 1000, 
          enabled: true
        },
        [Bootstrap.tag]: {
          enabled: true,
          list: bootstrapers
        }
      }
    }
  })

  return node
}

async function startPeer() {

  try {
    node = await createNode(bootstrapMultiaddrs)
    myPeerId = node.peerId.toB58String();

    node.on('peer:discovery', async (peerInfo) => {
      console.log(`[Notifier peer]: Peer ${myPeerId} discovered: ${peerInfo.toB58String()}`)
    })

    node.pubsub.on('notifier:send:is_available', (msg) => {
      console.log(`[Notifier peer]: is Available for send?`);
      messageBody = {"peerId": myPeerId}
      node.pubsub.publish('notifier:send:available', ObjectToP2Pmessage(messageBody));
    })

    node.pubsub.on('notifier:send', (msg) => {
      console.log(`[Notifier peer]: sending following message using SNS`);
      
      const messageBody = P2PmessageToObject(msg);
      console.log(messageBody)
      sendMessage(messageBody['data'])

    })

    await node.start();

    await node.pubsub.subscribe('notifier:send')
    await node.pubsub.subscribe('notifier:send:is_available')

  } catch (e) {
    console.log(e);
  }
}

async function main() {
  startPeer();
}

main()


