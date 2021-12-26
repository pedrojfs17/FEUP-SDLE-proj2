const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const WS = require('libp2p-websockets')
const MPLEX = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')
const MulticastDNS = require('libp2p-mdns')
const DHT = require('libp2p-kad-dht')
const GossipSub = require('libp2p-gossipsub')
const ipfsHttpClient = require('ipfs-http-client')
const DelegatedPeerRouter = require('libp2p-delegated-peer-routing')
const DelegatedContentRouter = require('libp2p-delegated-content-routing')
const PeerId = require('peer-id')

function printAddrs (node) {
  console.log('node %s is listening on:', node.peerId.toB58String())
  node.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${node.peerId.toB58String()}`))
}

const startNode = async () => {
  // create a peerId
  const peerId = await PeerId.create()

  const delegatedPeerRouting = new DelegatedPeerRouter(ipfsHttpClient.create({
    host: 'node0.delegate.ipfs.io', // In production you should setup your own delegates
    protocol: 'https',
    port: 443
  }))

  const delegatedContentRouting = new DelegatedContentRouter(peerId, ipfsHttpClient.create({
    host: 'node0.delegate.ipfs.io', // In production you should setup your own delegates
    protocol: 'https',
    port: 443
  }))

  const node = await Libp2p.create({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    modules: {
      transport: [
        TCP,
        //new WS() // It can take instances too!
      ],
      streamMuxer: [MPLEX],
      connEncryption: [NOISE],
      peerDiscovery: [MulticastDNS],
      dht: DHT,
      pubsub: GossipSub,
      //contentRouting: [delegatedContentRouting],
      //peerRouting: [delegatedPeerRouting],
    },
    peerId: peerId,
    peerRouting: { // Peer routing configuration
      refreshManager: { // Refresh known and connected closest peers
        enabled: true, // Should find the closest peers.
        interval: 6e5, // Interval for getting the new for closest peers of 10min
        bootDelay: 10e3 // Delay for the initial query for closest peers
      }
    },
    config: {
      peerDiscovery: {
        autoDial: true,             // Auto connect to discovered peers (limited by ConnectionManager minConnections)
        // The `tag` property will be searched when creating the instance of your Peer Discovery service.
        // The associated object, will be passed to the service when it is instantiated.
        [MulticastDNS.tag]: {
          interval: 1000,
          enabled: true
        },
      },
      pubsub: {                     // The pubsub options (and defaults) can be found in the pubsub router documentation
        enabled: true,
        emitSelf: false,                                  // whether the node should emit to self on publish
        //globalSignaturePolicy: SignaturePolicy.StrictSign // message signing policy
      },
      dht: {                        // The DHT options (and defaults) can be found in its documentation
        kBucketSize: 20,
        enabled: true,              // This flag is required for DHT to run (disabled by default)
        clientMode: false           // Whether to run the WAN DHT in client or server mode (default: client mode)
      }
    }
  })

  node.on('peer:discovery', (peer) => {
    console.log('Discovered %s', peer.toB58String()) // Log discovered peer
  })

  node.connectionManager.on('peer:connect', (connection) => {
    console.log('Connected to %s', connection.remotePeer.toB58String()) // Log connected peer
  })

  await node.start()
  console.log("Initiated Node")

  const listen = node.transportManager.getAddrs()
  console.log("Listening: ",listen)

  const advertise = node.multiaddrs
  console.log("Advertising: ",advertise)

  // At this point the node has started
  console.log('node has started (true/false):', node.isStarted())

  printAddrs(node)

  //  Requesting to Get 
  // Steps:
  // - send username we want
  // const { stream: stream1 } = await node.dialProtocol(n2.peerId, ['/get'])
  // await pipe(
  //   n2.peerId,
  //   stream1
  // )
  return node
}

startNode()

async function getUsername(peerID) {
  return new Promise(resolve => {
    n.dialProtocol(peerID, ['/user']).then( async ({stream}) => {
      await pipe(
        stream,
        async function(source) {
          for await (const msg of source) {
            resolve({message: msg.toString()})
            return
          }
        }
      )
    }, reason => resolve({message: "can't communicate with node", code: reason.code}))
  })
}

// Handler to get the timeline of a peer
// Steps:
// - Find Providers of peer's timeline
// - Connect to first provider
// - Retrieve timeline

async function getTimeline(username) {
  return new Promise(resolve => {
    n.dialProtocol(peerID, ['/timeline']).then( async ({stream}) => {
      await pipe(
        stream,
        async function(source) {
          for await (const msg of source) {
            resolve({message: msg.toString()})
            return
          }
        }
      )
    }, reason => resolve({message: "can't communicate with node", code: reason.code}))
  })
}

// Handler to follow to a peer
// Steps:
// - Find Providers of peer's timeline
// - Connect to first provider
// - Retrieve timeline
// - Store user's timeline
// - Announce provide
async function followUser(username) {
  return new Promise(resolve => {
    n.dialProtocol(peerID, ['/follow']).then( async ({stream}) => {
      await pipe(
        stream,
        async function(source) {
          for await (const msg of source) {
            resolve({message: msg.toString()})
            return
          }
        }
      )
    }, reason => resolve({message: "can't communicate with node", code: reason.code}))
  })
}



// Frontend Communication

// Temporary
const timelines = [
  {
    username: "pedrojfs17",
    // hash: sha256("username:" + username + ",password:" + password)
    followers: [],
    following: [],
    posts: [
      {
        username: "pedrojfs17",
        timestamp: "10m",
        text: "I am liking this project so much. I wish I could make distributed facebook as weel since we could put some photos of people."
      },
      {
        username: "pedrojfs17",
        timestamp: "42m",
        text: "Sometimes I think I am going crazy, but no, I am just tired of this bullshit. Please help...."
      },
    ]
  },
  {
    username: "antbz",
    // hash: sha256("username:" + username + ",password:" + password)
    followers: [],
    following: [],
    posts: [
      {
        username: "antbz",
        timestamp: "1h",
        text: "I would make some Grindr posting here, but this does not support phots.... Very sad mates.... I will come back another time to make your days!"
      }
    ]
  },
  {
    username: "g-batalhao-a",
    // hash: sha256("username:" + username + ",password:" + password)
    followers: [],
    following: [],
    posts: [
      {
        username: "g-batalhao-a",
        timestamp: "2h",
        text: "https://www.youtube.com/watch?v=T0A_cm6DIGM"
      }
    ]
  },
  {
    username: "my_name_is_cath",
    // hash: sha256("username:" + username + ",password:" + password)
    followers: [],
    following: [],
    posts: [
      {
        username: "my_name_is_cath",
        timestamp: "5h",
        text: "Souto is so baby. I like him so much that I wish he would go on a trip and never come back."
      }
    ]
  }
]

const feedHandler = (req, res) => {
  let posts = []

  for (let t in timelines) {
    posts = posts.concat(timelines[t].posts)
  }

  res.json({ posts: posts });
}

const getUserHandler = (req, res) => {
  let timeline = {};

  for (let t in timelines) {
    if (timelines[t].username == req.params.username) {
      timeline = timelines[t]
      break
    }
  }

  if (Object.keys(timeline).length === 0)
    timeline['err'] = "User Not Found!"

  res.json(timeline);
}


const express = require("express");
const cors = require('cors');

const PORT = process.env.PORT || 3001;

const app = express();

app.use(cors())

// Routes

app.get("/feed", feedHandler)

//app.post("/feed", postHandler)

app.get("/user/:username", getUserHandler);

app.listen(PORT, () => {
  console.log(`Backend listening on ${PORT}`);
});