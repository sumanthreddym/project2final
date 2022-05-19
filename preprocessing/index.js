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
const delay = require('delay')

const config = require('./config.json');
const bootstrapMultiaddrs = config['bootstrapMultiaddrs'];
const { CID } = require('multiformats/cid')

var node;
var myPeerId;
var aggregator = new Map()
var currDataToWrite = [];

function P2PmessageToObject(msg) {
  return JSON.parse(uint8ArrayToString.toString(msg.data))
}

function ObjectToP2Pmessage(msg) {
  return uint8ArrayFromString.fromString(JSON.stringify(msg))
}

function predict(data){
  let msg = {
    "from": myPeerId,
    "role": "preprocessing",
    "data": data
  }
  currDataToWrite.push(data)

  node.pubsub.publish('prediction:predict:is_available', ObjectToP2Pmessage(msg));
  return
}

function aggregateData(msg){
  data = msg['data']
  userId = msg['userId']
  if(aggregator.has(userId)){
    curArr = aggregator.get(userId)
    
    curArr.push(data)
    aggregator.set(userId, curArr)
    
    if(curArr.length == 10){
      //call prediction model
      console.log(`[Data Aggregation peer]: Called prediction model for userId ${userId} using following data ${data}`)
      predict({"userId": userId, "data": curArr})
      aggregator.set(userId, [])
    }
  }else{
    aggregator.set(userId, [data])
  }
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
      console.log(`[Data Aggregation peer]: Peer ${myPeerId} discovered: ${peerInfo.toB58String()}`)
    })
    
    // if node to write to is identified, write to the first node
    node.pubsub.on('prediction:predict:available', (msg) => {
      if(currDataToWrite.length == 0){
        return
      }

      msg = {
        "from": myPeerId,
        "role": "prediction",
        "data": currDataToWrite
      }

      node.pubsub.publish('prediction:predict', ObjectToP2Pmessage(msg));
      currDataToWrite = []
    })
    node.pubsub.on(myPeerId, async (msg) => {
      console.log(`[Data Aggregation peer]: received following data from master`);
      msg = P2PmessageToObject(msg)
      console.log(msg)
      if(msg['event'] == "CREATE"){
        const cid = CID.parse(msg['data']['userId'])
        console.log(`[Data Aggregation peer]: Master chose me to aggregate data for user with UserId/ContentId ${cid}`)
        node.contentRouting.provide(cid)
        await delay(300)
      }
      aggregateData(msg)
      console.log(msg)      
    })

    await node.start();
    
    node.pubsub.subscribe('prediction:predict:available')
    node.pubsub.subscribe(myPeerId)

    setInterval(() => {
      console.log(`[Data Aggregation peer]: Notifying other peers in network about my capability to Aggregate ${myPeerId}`)
      msg = {"peerId": myPeerId}
      node.pubsub.publish('preprocessing:notify_preprocessing', ObjectToP2Pmessage(msg));
    }, 10000)


  } catch (e) {
    console.log(e);
  }
}

async function main() {
  startPeer();
}

main()


