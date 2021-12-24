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

const start = async () => {
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
    peerId,
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
    console.log('Discovered %s', peer.id.toB58String()) // Log discovered peer
  })

  node.connectionManager.on('peer:connect', (connection) => {
    console.log('Connected to %s', connection.remotePeer.toB58String()) // Log connected peer
  })

  await node.start()

  console.log("Initiated Node")
  return node
}

start()