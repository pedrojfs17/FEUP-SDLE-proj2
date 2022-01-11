const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')
const MulticastDNS = require('libp2p-mdns')
const DHT = require('libp2p-kad-dht')
const PeerId = require('peer-id')

require('dotenv').config()

async function createID() {
  const peerID = await PeerId.create({keytype: "Ed25519", bits: 1024})
  console.log(JSON.stringify(peerID.toJSON()))
}

const PORT = process.env.PORT
const KEY_FILE = "../keys/"+process.env.KEY_FILE

async function startNode() {
  const peerId = await PeerId.createFromJSON(require(KEY_FILE))

  const node = await Libp2p.create({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/'+ PORT]
    },
    modules: {
      transport: [
        TCP,
      ],
      streamMuxer: [MPLEX],
      connEncryption: [NOISE],
      peerDiscovery: [MulticastDNS],
      dht: DHT,
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
      dht: {
        kBucketSize: 20,
        enabled: true,
        clientMode: true
      }
    }
  })

  node.on('peer:discovery', (peer) => {
    console.log('Discovered %s', peer.toB58String())
  })

  node.connectionManager.on('peer:connect', async (connection) => {
    console.log('Connected to %s', connection.remotePeer.toB58String())
  })

  await node.start()
  console.log("Initiated Node")

  const listen = node.transportManager.getAddrs()
  console.log("Listening: ",listen)

  const advertise = node.multiaddrs
  console.log("Advertising: ",advertise)

  console.log('Node has started:', node.isStarted())

  return node
}

//createID().then(()=>{})

startNode().then(()=> {console.log("Bootstrap started")})