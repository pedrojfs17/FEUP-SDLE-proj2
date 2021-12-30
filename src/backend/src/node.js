const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')
const Bootstrap = require('libp2p-bootstrap')
const DHT = require('libp2p-kad-dht')
const GossipSub = require('libp2p-gossipsub')
const PeerId = require('peer-id')
const pipe = require('it-pipe')
const all = require('it-all')
const { CID } = require('multiformats/cid')
const { sha256 } = require('multiformats/hashes/sha2')
const dagPB = require('@ipld/dag-pb')
const delay = require('delay')


module.exports.printAddrs = function(node) {
  console.log('Node %s is listening on:', node.peerId.toB58String())
  node.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${node.peerId.toB58String()}`))
}

module.exports.createCID = async function(string) {
  const bytes = dagPB.encode({
    Data: new TextEncoder().encode(string),
    Links: []
  })
  const hash = await sha256.digest(bytes)
  return CID.create(1, dagPB.code, hash)
}

module.exports.followRoutine = async function(node, username) {
  // add username to following
  // Subscribe username
  // dial protocol to get timeline
  // save timeline to local
  // announce provide
  // evertyiem receive message, uypdate local timeline
  node.app.profiles[node.app.user].following.add(username)

  node.pubsub.on(username, (msg) => module.exports.handleMessage(node, username, msg))

  let profile = await module.exports.getProfile(node,username)

  node.app.profiles[username] = profile
  node.app.profiles[username].followers.add(node.app.user)

  node.pubsub.subscribe(username)
  node.contentRouting.provide(await module.exports.createCID(username))
}

module.exports.handleMessage = function(node, username, msg) {
  //Add post to timeline
  //Provide
  
  let postStr = new TextDecoder().decode(msg.data)

  const type = postStr.substring(0,postStr.indexOf(' '))
  const content = postStr.substring(postStr.indexOf(' ')+1)

  switch (type) {
    case "<POST>":
      let post = JSON.parse(content)
      node.app.profiles[username].timeline.push(post)
      node.app.profiles[username].timeline = node.app.profiles[username].timeline.filter(p => {return (new Date().getTime() - p.timestamp) < (1000*60)}) //less than 24h (1000*3600*24)  
      break;

    case "<FOLLOW>":
      if(node.app.profiles[content])
        node.app.profiles[content].following.add(username)
      node.app.profiles[username].followers.add(content)

      console.log(content+ " followed "+ username)
      break;
  
    case "<FOLLOWED>":
      if(node.app.profiles[content])
        node.app.profiles[content].followers.add(username)
      node.app.profiles[username].following.add(content)

      console.log(username+ " followed "+ content)
      break;

    case "<UNFOLLOW>":
      if(node.app.profiles[content])
        node.app.profiles[content].following.delete(username)
      node.app.profiles[username].followers.delete(content)
      console.log(content+ " unfollowed "+ username)
      break;

    case "<UNFOLLOWED>":
      if(node.app.profiles[content])
        node.app.profiles[content].followers.delete(username)
      node.app.profiles[username].following.delete(content)
      console.log(username+ " unfollowed "+ content)
      break;
    
    default:
      break;
  }
}

module.exports.getProfile = async function(node, username) {
  let cid = await module.exports.createCID(username)

  const providers = await all(node.contentRouting.findProviders(cid, { timeout: 3000, maxNumProviders: 5 }))

  for (let provider of providers) {
    try {
      const { stream } = await node.dialProtocol(provider.id, ['/profile'])
      await writeStream(stream, username)
      const profile = await readStream(stream)
      let user = JSON.parse(profile)
      user.followers = new Set(user.followers)
      user.following = new Set(user.following)
      return user
    } catch (error) {
      continue
    }
  }
  throw "User not found"
}

module.exports.profiletoJSON = function(profile) {
  return {
    timeline: profile.timeline,
    followers: [...profile.followers],
    following: [...profile.following]
  }
}

const readStream = async function(stream) {
  let res = null
  await pipe(
    stream,
    async function(source) {
      for await (const msg of source) {
        res = msg.toString()
      }
    }
  )
  return res
}

const writeStream = function(stream, message) {
  pipe(
    [message],
    stream
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
      peerDiscovery: [Bootstrap],
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
        [Bootstrap.tag]: {
          list: [ // a list of bootstrap peer multiaddrs to connect to on node startup
            "/ip4/127.0.0.1/tcp/6001/p2p/QmVVP9rWw5yLCbZVQzoDSUZrz7VcS14TQ3GL2X5yXqqcPb",
            "/ip4/127.0.0.1/tcp/7001/p2p/QmcMhtRvVXPtLzRuGUjrrUGeALfCPPPxG3uxXWdBX7qd8q",
            "/ip4/127.0.0.1/tcp/8001/p2p/QmTv6dFFFhtUB37tJDuFghRkvGfP9CDfYC77sBVnAHmrU2",
            ],
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
        clientMode: true
      }
    }
  })

  node.on('peer:discovery', (peer) => {
    console.log('Discovered %s', peer.toB58String())
  })

  node.connectionManager.on('peer:connect', async (connection) => {
    console.log('Connected to %s', connection.remotePeer.toB58String())
    await delay(1000)
    // Provide following users
    node.contentRouting.provide(await module.exports.createCID(node.app.user))
  })

  node.app = {
    token: await module.exports.createCID("username:" + username + ";password:" + password),
    user: username,
    peerId: node.peerId.toB58String(),
    profiles: {}
  }

  node.app.profiles[username] = {
    followers: new Set([]),
    following : new Set([]),
    timeline: []
  }

  node.handle("/profile", async ({ stream }) => {
    let profile = await readStream(stream)
    writeStream(stream, JSON.stringify(module.exports.profiletoJSON(node.app.profiles[profile])))
  })

  await node.start()
  console.log("Initiated Node")

  const listen = node.transportManager.getAddrs()
  console.log("Listening: ",listen)

  const advertise = node.multiaddrs
  console.log("Advertising: ",advertise)

  console.log('Node has started:', node.isStarted())
  module.exports.printAddrs(node)

  await delay(2000)
  try {
    let profile = await module.exports.getProfile(node,node.app.user)
    node.app.profiles[node.app.user] = profile
    
  } catch (err) {
    console.log("No previous record found")
  }

  return node
}
