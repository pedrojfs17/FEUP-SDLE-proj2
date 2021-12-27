const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')
const MulticastDNS = require('libp2p-mdns')
const DHT = require('libp2p-kad-dht')
const GossipSub = require('libp2p-gossipsub')
const PeerId = require('peer-id')
const multihashing = require('multihashing-async')
const CID = require('cids')

const d = new Date();
function printAddrs (node) {
  console.log('node %s is listening on:', node.peerId.toB58String())
  node.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${node.peerId.toB58String()}`))
}

const startNode = async () => {
  // create a peerId
  const peerId = await PeerId.create()

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

  node.app = {
    user: node.peerId.toB58String(),
    peerId: node.peerId.toB58String(),
    followers: new Set([]),
    following: new Set([node.peerId.toB58String()])
  }

  node.handle("/timeline", (stream) => {
    pipe(
      JSON.stringify(getTimeline(node.app.user)),
      stream
    )
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
  return node
}

let node

startNode().then(
  result =>{
    node = result
  })

async function getTimeline(user) {
  let result = await node.contentRouting.get(new TextEncoder().encode(user)).then(
    // If there is a timeline
    msg => {
      let msgString = new TextDecoder().decode(msg.val)
      return JSON.parse(msgString)
      
    },
    _ => {
      return []
    }
  )
  return result
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

async function createCID(string) {
  const bytes = new TextEncoder('utf8').encode(string)

  const hash = await multihashing(bytes, 'sha2-256')
  const cid = new CID(1, 112, hash)
  return cid
}

const feedHandler = async (req, res) => {
  let posts = []

  console.log(node.app)
  for (let user of node.app.following) {
    posts= posts.concat(await getTimeline(user))
  }

  res.json({ posts: posts });
}


// Handler to get the timeline of a peer
// Steps:
// - Find Providers of peer's timeline
// - Connect to first provider
// - Retrieve timeline
const getUserHandler = async (req, res) => {
  if(node.app.following.has(req.params.username)) {
    let timeline = await getTimeline(req.params.username)
    res.json(timeline)
  } else {
    let cid = await createCID(req.params.username)
    console.log(cid)
    for await (const provider of node.contentRouting.findProviders(cid)) {
      node.dialProtocol(provider.id, ['/timeline']).then( async ({stream}) => {
        await pipe(
          stream,
          async function(source) {
            for await (const msg of source) {
              res.send(msg)
              return
            }
          }
        )
      })
    }
  }

}

function updateTimeline(timeline) {
  node.contentRouting.put(new TextEncoder().encode(node.app.user),new TextEncoder().encode(JSON.stringify(timeline)),{minPeers: 5})
  node.contentRouting.provide(createCID(node.app.user))
}

// Handler to publish a new post
// Steps:
// - Get timeline of own peer
// - Create/Update timeline
// - Put timeline in 
const postHandler = (req, res) => {

  const post = {
    user: node.app.user,
    text: req.body.text,
    timestamp: d.getTime()
  }

  const putTimeline = (timeline) => {
    updateTimeline(timeline)
    node.pubsub.publish(post.user,new TextEncoder().encode(JSON.stringify(post)))
  }

  let timeline = getTimeline(node.app.user)
  timeline.push(post)
  putTimeline(timeline)
  
}

// Handler to follow to a peer
// Steps:
// - Find Providers of peer's timeline
// - Connect to first provider
// - Retrieve timeline
// - Store user's timeline
// - Announce provide
const followHandler = (req, res) => {
  node.pubsub.on(req.body.user, (msg) => {
    //Add post to timeline
    //Provide
    let postStr = new TextDecoder().decode(msg.data)
    let post = JSON.parse(postStr)

    let timeline = getTimeline(req.body.user)
    timeline.push(post)
    updateTimeline(timeline)
  })

  node.pubsub.subscribe(req.body.user)
}

const express = require("express");
const cors = require('cors');
const { json } = require('express')

const PORT = process.env.PORT || 3001;

const app = express();

app.use(cors())

// Routes

app.get("/feed", feedHandler)
app.post("/post", postHandler)
app.post("/follow", followHandler)

//app.post("/feed", postHandler)

app.get("/user/:username", getUserHandler);

app.listen(PORT, () => {
  console.log(`Backend listening on ${PORT}`);
});