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
const {Firestore, Timestamp, FieldValue} = require('@google-cloud/firestore');

const config = require('./config.json');
const bootstrapMultiaddrs = config['bootstrapMultiaddrs'];
const projectId = 'total-pier-349316'
const keyFilename = 'total-pier-349316-c9a8336e908c.json'
const db = new Firestore({projectId, keyFilename});

var node;
var myPeerId;

function P2PmessageToObject(message) {
  return JSON.parse(uint8ArrayToString.toString(message.data))
}

function ObjectToP2Pmessage(message) {
  return uint8ArrayFromString.fromString(JSON.stringify(message))
}

function writeToDB(dataList, operation){
  //write to database
  console.log("[DataStorage Peer]: ${myPeerId} - Writing following to GCP Firestore DB:")
  console.log(dataList)


  dataList.forEach((data)=>{
    const userId = data['userId']
    const heartRateRef = db.collection('heartrate').doc(userId)
    let newData;
    console.log(`[DataStorage Peer]: ${myPeerId} - Current DB Operation is ${operation}`)
    if(operation == "add-prediction"){
      newData = { prediction: data['prediction'], timestamp: Timestamp.now()}
      heartRateRef.update({
        predictions: FieldValue.arrayUnion(newData)
      }).catch((err)=>{console.log(err)});
    }else{
      newData = { rate: data['heartrate'], timestamp: Timestamp.now()}
      heartRateRef.update({
        heartrates: FieldValue.arrayUnion(newData)
      }).catch((err)=>{console.log(err)});
    }
  
  })
  
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
      console.log(`[DataStorage Peer]: ${myPeerId} - New Peer ${myPeerId} discovered: ${peerInfo.toB58String()}`)
    })

    node.pubsub.on('storage:write:is_available', (msg) => {
      console.log(`[DataStorage Peer]: ${myPeerId} - I was asked if I am available for write`);
      messageBody = {"peerId": myPeerId}
      node.pubsub.publish('storage:write:available', ObjectToP2Pmessage(messageBody));
    })

    node.pubsub.on('storage:write', (msg) => {      
      const messageBody = P2PmessageToObject(msg);
      console.log(`[DataStorage Peer]: ${myPeerId} - Received the following data from another peer for write to DB`)
      console.log(messageBody)
      writeToDB(messageBody['data'], messageBody['operation'])
    })

    await node.start();

    await node.pubsub.subscribe('storage:write')
    await node.pubsub.subscribe('storage:write:is_available')
  } catch (e) {
    console.log(e);
  }
}

async function main() {
  startPeer();
}

main()


