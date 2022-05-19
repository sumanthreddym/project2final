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
const axios = require('axios');

const config = require('./config.json');
const bootstrapMultiaddrs = config['bootstrapMultiaddrs'];

var node;
var myPeerId;
var currDataToWrite = [];
var isNodeAvailable = true

function P2PmessageToObject(msg) {
  return JSON.parse(uint8ArrayToString.toString(msg.data))
}

function ObjectToP2Pmessage(msg) {
  return uint8ArrayFromString.fromString(JSON.stringify(msg))
}
function predict(listToPredict){
  isNodeAvailable = false

  listToPredict.forEach((data) => {

    userId = data['data'][0]['userId']
    var list = []
    for (const item of data['data']) {
      list.push(parseFloat(item['heartrate']))
    }

    data = {
      "List" : list
    }
    console.log(`[Prediction/ML peer]: Following data received from Aggregator peer. Sending it to AWS Sagemaker:`)
    console.log(data)
    axios.post('https://bnv7r5wcydggjxnbvavqkrf3pa0duaxd.lambda-url.us-east-1.on.aws/', data,{
      headers: { 
          'Content-Type' : "application/json"
      }
  })
    .then((res) => {
        console.log('[Prediction/ML peer]: Response from AWWS Sagemaker Endpoint: ', res.data);
        response = res.data
        
        if(response['prediction']){
          // send msg to user
          sendMessage({"userId": userId, "prediction": true})
          //log to db
          writeToDB({"userId": userId, "prediction": true})
        }
    }).catch((err) => {
        console.error(err);
    }); 
  })
  
  isNodeAvailable = true
}

function sendMessage(data){
  console.log("sending message to notifier")
  let msg = {
    "from": myPeerId,
    "role": "prediction",
    "data": data
  }
  currDataToWrite.push(data)

  node.pubsub.publish('notifier:send:is_available', ObjectToP2Pmessage(msg));
  return
}

function writeToDB(data){
  let msg = {
    "from": myPeerId,
    "role": "prediction",
    "data": data
  }
  currDataToWrite.push(data)

  node.pubsub.publish('storage:write:is_available', ObjectToP2Pmessage(msg));
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
      console.log(`[Prediction/ML peer]: Peer ${myPeerId} discovered: ${peerInfo.toB58String()}`)
    })
    
    node.pubsub.on('prediction:predict:is_available', (msg) => {
      console.log(`[Prediction/ML peer]: DataAggregator peer asked if I am available for prediction`);
      if(isNodeAvailable){
        messageBody = {"peerId": myPeerId}
        node.pubsub.publish('prediction:predict:available', ObjectToP2Pmessage(messageBody));
      }
    })

    node.pubsub.on('prediction:predict', (msg) => {
      const messageBody = P2PmessageToObject(msg);
      predict(messageBody['data'])
    })

    // if node to write to is identified, write to the first node
    node.pubsub.on('storage:write:available', (msg) => {
      console.log(`[Prediction/ML peer]: Found arrhythmia. Requesting DataStorage peer to record following data on DB`)
      console.log(currDataToWrite)
      if(currDataToWrite.length == 0){
        return
      }

      msg = {
        "from": myPeerId,
        "role": "prediction",
        "operation": "add-prediction",
        "data": currDataToWrite
      }

      node.pubsub.publish('storage:write', ObjectToP2Pmessage(msg));
      currDataToWrite = []
    })

    node.pubsub.on('notifier:send:available', (msg) => {
      console.log(`[Prediction/ML peer]: Found arrhythmia. Requesting Notifier peer to send following data to user via email`)
      console.log(currDataToWrite)
      if(currDataToWrite.length == 0){
        return
      }

      msg = {
        "from": myPeerId,
        "role": "prediction",
        "data": currDataToWrite
      }

      node.pubsub.publish('notifier:send', ObjectToP2Pmessage(msg));
      currDataToWrite = []
    })

    await node.start();

    node.pubsub.subscribe('prediction:predict')
    node.pubsub.subscribe('prediction:predict:is_available')
    node.pubsub.subscribe('storage:write:available')
    node.pubsub.subscribe('notifier:send:available')
  } catch (e) {
    console.log(e);
  }
}

async function main() {
  startPeer();
}

main()


