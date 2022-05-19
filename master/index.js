/**
 * @author Sumanth Reddy Muni <srm9537@nyu.edu>
 */
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')
const Gossipsub = require('libp2p-gossipsub')
const Bootstrap = require('libp2p-bootstrap')
const Mdns = require('libp2p-mdns')
const PubsubPeerDiscovery = require('libp2p-pubsub-peer-discovery')
const uint8ArrayToString = require('uint8arrays/to-string')
const uint8ArrayFromString = require('uint8arrays/from-string')
const PeerId = require('peer-id')
const fs = require('fs')
const KadDHT = require('libp2p-kad-dht')
const express = require('express')
const path = require('path')
const { CID } = require('multiformats/cid')
const { ServiceBusClient } = require("@azure/service-bus");
const delay = require('delay')
const all = require('it-all')
const {Firestore, Timestamp, FieldValue} = require('@google-cloud/firestore');
const { url } = require('inspector')
const projectId = 'total-pier-349316'
const keyFilename = 'total-pier-349316-c9a8336e908c.json'
const db = new Firestore({projectId, keyFilename});
var cors = require('cors')
const AWSHttpProvider = require('@aws/web3-http-provider');

var node;
var currDataToWrite = [];
var preprocessingNodes = new Set()

const connectionString = "Endpoint=sb://healthcarespring2022.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=uZDhOCOGwaXw4xzT/zC9RPb/2EqxBnHZnxWLdm/3Osg="
const queueName = "queueforhealthdata"
const ACCESS_KEY_ID = ""
const SECRET_ACCESS_KEY = ""

function P2PmessageToObject(msg) {
  return JSON.parse(uint8ArrayToString.toString(msg.data))
}

function ObjectToP2Pmessage(msg) {
  return uint8ArrayFromString.fromString(JSON.stringify(msg))
}


async function writeToDB(data){
  let msg = {
    "from": myPeerId,
    "role": "master",
    "operation": "add_heart_rate",
    "data": data
  }
  currDataToWrite.push(data)


  console.log("[Master]: Sending following data to Data Aggregator/Preprocessor peer")
  console.log(msg)

  const cid = CID.parse(data['userId'])
  try {
    const providers = await all(node.contentRouting.findProviders(cid, { timeout: 30000 }))
    msg['event'] = "UPDATE"
    console.log(`[Master]: ${providers[0].id.toB58String()} is the peer who is aggregating the data for userId/contentId ${cid}, sending data to them for aggregation`)
    node.pubsub.publish(providers[0].id.toB58String(), ObjectToP2Pmessage(msg))

  } catch(e){
    console.log(`[Master]: No peer is aggregating data for the user. Finding a new peer who can handle aggregation for userId ${cid}`)
    console.log(preprocessingNodes.size)
    if(preprocessingNodes.size != 0){
      msg['event'] = "CREATE"
      let items = Array.from(preprocessingNodes);
      let chosenProvider = items[Math.floor(Math.random() * items.length)];
      console.log(`[Master]: Chose following peer to aggregate data for user ${cid}`)
      node.pubsub.publish(chosenProvider, ObjectToP2Pmessage(msg));
    }
  }

  node.pubsub.publish('storage:write:is_available', ObjectToP2Pmessage(msg));
}




 async function pullMessagesFromServiceBus() {
	const sbClient = new ServiceBusClient(connectionString);
	const receiver = sbClient.createReceiver(queueName);

	const myMessageHandler = async (messageReceived) => {
    messageBody = JSON.stringify(messageReceived.body)
		console.log(`[Master]: Retrieved following message from Azure Service bus: ${messageBody}`);
    await writeToDB(JSON.parse(messageBody))
	};

	const myErrorHandler = async (error) => {
		console.log(error);
	};

	receiver.subscribe({
		processMessage: myMessageHandler,
		processError: myErrorHandler
	});

  await delay(4000);

	await receiver.close();	
	await sbClient.close();
}   

const createNode = async () => {
  let peerId
  const peerData = fs.readFileSync("./master_peer_id.json")
  peerId = await PeerId.createFromJSON(JSON.parse(peerData))
  const node = await Libp2p.create({
    peerId,
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    modules: {
      transport: [TCP],
      streamMuxer: [Mplex],
      connEncryption: [NOISE],
      pubsub: Gossipsub,
      peerDiscovery: [PubsubPeerDiscovery, Mdns],
      dht: KadDHT
    },
    config: { 
      dht: {
      enabled: true
      },
      peerDiscovery: {
        autoDial: true,
        [Mdns.tag]: {
          enabled: true,
          interval: 100
        },
        [PubsubPeerDiscovery.tag]: {
          interval: 1000, 
          enabled: true
        },
        relay: {
          enabled: true, 
          hop: {
            enabled: true 
          }
        }
      }
    }
  })

  return node
}

async function startPeer() {

  try {
    node = await createNode()
    myPeerId = node.peerId.toB58String();

    node.connectionManager.on('peer:connect', async (connection) => {
      console.log(`New node joined P2P network. It's PeerId is ${connection.remotePeer.toB58String()}`)
      await node.peerStore.addressBook.add(connection.remotePeer, [connection.remoteAddr])
      await delay(100)
    })
    

    await node.start();
    console.log('Master node has started (true/false):', node.isStarted())

    node.pubsub.on('storage:write:available', (msg) => {
      console.log(currDataToWrite)
      if(currDataToWrite.length == 0){
        return
      }

      msg = {
        "from": myPeerId,
        "role": "master",
        "operation": "add_heart_rate",
        "data": currDataToWrite
      }

      node.pubsub.publish('storage:write', ObjectToP2Pmessage(msg));
      currDataToWrite = []
    })

    node.pubsub.on('preprocessing:notify_preprocessing', (msg) => {
      console.log("[Master]: Refreshing Preprocessing nodes list. Following is the new Preprocessing node identified. Adding it to KademliaDHT.")
      msg = P2PmessageToObject(msg)
      console.log(msg['peerId'])

      preprocessingNodes.add(msg['peerId'])
    })

    node.pubsub.subscribe('storage:write:available')
    node.pubsub.subscribe('preprocessing:notify_preprocessing')
    
    setInterval(() => {
      pullMessagesFromServiceBus()
    }, 10000)
  } catch (e) {
    console.log(e);
  }
}

function startAPIServer() {
  const app = express();
  app.use(cors())
  const port = process.env.PORT || 8080;
  const serverURL = 'localhost:' + port

  app.use(express.json());
  app.use(express.urlencoded({
    extended: true
  }));
  app.use(express.static(__dirname + '/public'));

  app.post('/api/streamdata', async function (req, res) {
    var requestBody = req.body;
    console.log(requestBody)
    await writeToDB(requestBody['data'])
    res.status(204).send();
  });

  app.get('/api/data/createlink', async function (req, res) {
    customerId = req.query.customerId
    patientId = req.query.patientId
    url = serverURL + "/api/data/link/" + patientId
    res.json({"url": url});
  });

  app.get('/api/data/link/:patientId', async function (req, res) {
    patientId = req.params.patientId
    const heartRateRef = db.collection('heartrate').doc(patientId)
    const doc = await heartRateRef.get()
    res.json({"data": JSON.parse(JSON.stringify(doc.data()))});
  });

  app.get('/api/data/request', async function (req, res) {
    customerId = req.query.customerId
    patientId = req.query.patientId

    const heartrateRef = await db.collection('heartrate').doc(patientId);
    let doc = await heartrateRef.get()

    doc = doc.data()
    const purchasesRef = await db.collection('purchases').doc(patientId+customerId).set({
      "customerId": customerId,
      "patientId": patientId,
      "price": doc['price'],
      "status": "PENDING",
      "numberOfDataShared": doc['heartrates'].length,
      "patientWalletAddress": doc['walletAddress']
    });
    res.status(204).send();
  });

  app.get('/api/data/accept', async function (req, res) {
    customerId = req.query.customerId
    patientId = req.query.patientId

    const purchasesRef = await db.collection('purchases').doc(patientId+customerId).update({
      "status": "ACCEPTED"
    });
    res.status(204).send();
  });

  app.get('/api/data/complete', async function (req, res) {
    customerId = req.query.customerId
    patientId = req.query.patientId
    const purchasesRef = await db.collection('purchases').doc(patientId+customerId).update({
      "status": "COMPLETED"
    });
    res.status(204).send();
  });

  app.get('/api/purchases', async function (req, res) {
    customerId = req.query.customerId
    const purchasesRef = await db.collection('purchases');

    const snapshot = await purchasesRef.where('customerId', '==', customerId).get();
    if (snapshot.empty) {
      res.json({"data": "NONE"});
      return;
    }  


    let listOfPurchases = [];
    snapshot.forEach(doc => {
      console.log(doc.id, '=>', doc.data());
      listOfPurchases.push(doc.data())
    });
    res.json({"data": listOfPurchases});
  });

  app.get('/api/patient/purchases', async function (req, res) {
    patientId = req.query.patientId
    const purchasesRef = await db.collection('purchases');

    const snapshot = await purchasesRef.where('patientId', '==', patientId).get();
    if (snapshot.empty) {
      res.json({"data": "NONE"});
      return;
    }  

    let listOfPurchases = [];
    snapshot.forEach(doc => {
      console.log(doc.id, '=>', doc.data());
      listOfPurchases.push(doc.data())
    });
    res.json({"data": listOfPurchases});
  });


  app.get('/api/patients', async function (req, res) {
    
    const heartrateRef = await db.collection('heartrate');

    const snapshot = await heartrateRef.get();
    if (snapshot.empty) {
      res.json({"data": "NONE"});
      return;
    }  

    let listOfPatients = [];
    snapshot.forEach(doc => {
      console.log(doc.id, '=>', doc.data());
      let currentDoc = doc.data();

      listOfPatients.push({
        "patientId": currentDoc['userId'],
        "patientWalletAddress": currentDoc['walletAddress'],
        "price": currentDoc["price"],
        "numberOfRowsAvailable": currentDoc['heartrates'].length
      })
    });
    res.json({"data": listOfPatients});
  });
  app.post('/api/send', async function (req, res) {
    var requestBody = req.body;

    console.log("[Master:] Sending following to AWS Blockchain Node")
    console.log(requestBody)
    const credentials = {accessKeyId:ACCESS_KEY_ID, secretAccessKey:SECRET_ACCESS_KEY}

    let awsProvider = new AWSHttpProvider("https://nd-oa5ybixihrd35htiy2hgqpdfki.ethereum.managedblockchain.us-east-1.amazonaws.com",credentials);
    console.log(awsProvider.send(requestBody, (error, data) => {
      console.log("[Master:] Following Response received from AWS Blockchain Node")
      console.log(data);
      res.send(data);
    }))

  });

  app.listen(port, "0.0.0.0");
  console.log('Server started at http://localhost:' + port);
}


async function main() {
  startPeer();
  startAPIServer();
}

main()


