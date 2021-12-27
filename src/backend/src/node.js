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

module.exports.printAddrs = function(node) {
  console.log('Node %s is listening on:', node.peerId.toB58String())
  node.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${node.peerId.toB58String()}`))
}

module.exports.createCID = async function (string) {
  const bytes = new TextEncoder('utf8').encode(string)
  const hash = await multihashing(bytes, 'sha2-256')
  return new CID(1, 'dag-pb', hash)
}

module.exports.updateTimeline = function(node, timeline) {
  node.contentRouting.put(new TextEncoder().encode(node.app.user),new TextEncoder().encode(JSON.stringify(timeline)),{minPeers: 5})
  node.contentRouting.provide(module.exports.createCID(node.app.user))
}

module.exports.getTimeline = async function (node, user) {
  return node.contentRouting.get(new TextEncoder().encode(user)).then(
    // If there is a timeline
    msg => {
      let msgString = new TextDecoder().decode(msg.val)
      return JSON.parse(msgString)
      
    },
    _ => {
      return []
    }
  )
}

module.exports.startNode = async function(username, password) {
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
        autoDial: true,
        [MulticastDNS.tag]: {
          interval: 1000,
          enabled: true
        },
      },
      pubsub: { 
        enabled: true,
        emitSelf: false,
      },
      dht: {
        kBucketSize: 20,
        enabled: true,
        clientMode: false
      }
    }
  })

  node.on('peer:discovery', (peer) => {
    console.log('Discovered %s', peer.toB58String())
  })

  node.connectionManager.on('peer:connect', (connection) => {
    console.log('Connected to %s', connection.remotePeer.toB58String())
  })

  node.app = {
    token: await module.exports.createCID("username:" + username + ";password:" + password),
    user: username,
    peerId: node.peerId.toB58String(),
    followers: new Set([]),
    following: new Set([node.peerId.toB58String()]),
    timeline: []
  }

  node.handle("/timeline", (stream) => {
    pipe(
      JSON.stringify(module.exports.getTimeline(node.app.user)),
      stream
    )
  })

  await node.start()
  console.log("Initiated Node")

  const listen = node.transportManager.getAddrs()
  console.log("Listening: ",listen)

  const advertise = node.multiaddrs
  console.log("Advertising: ",advertise)

  console.log('Node has started:', node.isStarted())
  module.exports.printAddrs(node)

  return node
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







