const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')
const MulticastDNS = require('libp2p-mdns')
const Bootstrap = require('libp2p-bootstrap')
const DHT = require('libp2p-kad-dht')
const GossipSub = require('libp2p-gossipsub')
const PeerId = require('peer-id')
const pipe = require('it-pipe')
const all = require('it-all')
const { CID } = require('multiformats/cid')
const { sha256 } = require('multiformats/hashes/sha2')
const dagPB = require('@ipld/dag-pb')
const bcrypt = require('bcrypt');
const fs = require('fs');

const BOOTSTRAP_IP = process.env.BOOTSTRAP_IP || "127.0.0.1"
const BOOTSTRAP_IDS = [
  "QmVVP9rWw5yLCbZVQzoDSUZrz7VcS14TQ3GL2X5yXqqcPb",
  "QmcMhtRvVXPtLzRuGUjrrUGeALfCPPPxG3uxXWdBX7qd8q",
  "QmTv6dFFFhtUB37tJDuFghRkvGfP9CDfYC77sBVnAHmrU2"
]

const ITEMS_PER_USER = process.env.ITEMS_PER_USER || 100; // 100 posts
const EXPIRATION_TIME = process.env.EXPIRATION_TIME || 1000 * 3600 * 24; // 24 hours

module.exports.printAddrs = function(node) {
  console.log('Node %s is listening on:', node.peerId.toB58String())
  node.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${node.peerId.toB58String()}`))
}

module.exports.hashPassword = async function(string) {
  return bcrypt.hash(string, 10)
}

module.exports.comparePassword = async function(password, hash) {
  return bcrypt.compare(password, hash)
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

  let valid = true

  switch (type) {
    case "<POST>":
      let post = JSON.parse(content)
      node.app.profiles[username].timeline.push(post)

      while (node.app.profiles[username].timeline.length > ITEMS_PER_USER)
        node.app.profiles[username].timeline.shift()

      node.app.profiles[username].timeline = node.app.profiles[username].timeline.filter(p => {return (new Date().getTime() - p.timestamp) < EXPIRATION_TIME}) 
      break;

    case "<FOLLOW>":
      if(node.app.profiles[content])
        node.app.profiles[content].following.add(username)
      node.app.profiles[username].followers.add(content)
      break;
  
    case "<FOLLOWED>":
      if(node.app.profiles[content])
        node.app.profiles[content].followers.add(username)
      node.app.profiles[username].following.add(content)
      break;

    case "<UNFOLLOW>":
      if(node.app.profiles[content])
        node.app.profiles[content].following.delete(username)
      node.app.profiles[username].followers.delete(content)
      break;

    case "<UNFOLLOWED>":
      if(node.app.profiles[content])
        node.app.profiles[content].followers.delete(username)
      node.app.profiles[username].following.delete(content)
      break;
    
    default:
      valid = false
      break;
  }

  // Log if it something related to current node's user
  if (valid && node.app.user === username) module.exports.logData(node, postStr)
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
      if(user.err)
        continue
      user.followers = new Set(user.followers)
      user.following = new Set(user.following)
      return user
    } catch (error) {
      continue
    }
  }
  
  throw "User not found"
}

module.exports.isStillFollowing = async function(node, username) {
  let cid = await module.exports.createCID(username)

  const providers = await all(node.contentRouting.findProviders(cid, { timeout: 3000, maxNumProviders: 1 }))
  for (let provider of providers) {
    try {
      const { stream } = await node.dialProtocol(provider.id, ['/heartbeat'])
      await writeStream(stream, username)
      const stillFollows = JSON.parse(await readStream(stream))
      return stillFollows
    } catch (error) {
      continue
    }
  }
  
  return false
}

module.exports.profiletoJSON = function(profile) {
  return {
    timeline: profile.timeline,
    followers: [...profile.followers],
    following: [...profile.following]
  }
}

module.exports.logData = function(node, msg) {
  const username = node.app.user
  
  fs.appendFile(username + '.txt', msg+"\n", 'utf8', (err) => {
      if (err) {
          console.log("An error occured while logging data.")
          return console.log(err)
      }
      console.log(" > " + username + " : " + msg)
      
      // check log length
      // store data in json and clean log file if length > 128
      let data = fs.readFileSync(username+".txt","utf8")
      const nLines = data.toString().split("\n").length
      if ((nLines-1) > 128)
        storeData(node)
      
  });

}

const parseLogMessage = function(node, msg) {
  const type = msg.substring(0,msg.indexOf(' '))
  const content = msg.substring(msg.indexOf(' ')+1)
  const username = node.app.user
  switch (type) {
    case "<POST>":
      let post = JSON.parse(content)
      node.app.profiles[username].timeline.push(post)
      break;
  
      case "<FOLLOW>":
        if(node.app.profiles[content])
          node.app.profiles[content].following.add(username)
        node.app.profiles[username].followers.add(content)
        break;
    
      case "<FOLLOWED>":
        if(node.app.profiles[content])
          node.app.profiles[content].followers.add(username)
        node.app.profiles[username].following.add(content)
        break;
  
      case "<UNFOLLOW>":
        if(node.app.profiles[content])
          node.app.profiles[content].following.delete(username)
        node.app.profiles[username].followers.delete(content)
        break;

    case "<UNFOLLOWED>":
      if(node.app.profiles[content])
        node.app.profiles[content].followers.delete(username)
      node.app.profiles[username].following.delete(content)
      break;
    
    default:
      break;
  }
}

const storeData = function(node) {
  const username = node.app.user
  const jsonData = module.exports.profiletoJSON(node.app.profiles[node.app.user])
  
  fs.writeFile(username + '.json', JSON.stringify(jsonData), (err) => {
    if (err) {
      console.log("An error occured while writing JSON Object to File.");
      return console.log(err);
    }
    console.log("> " + username + " data has been saved in local storage.");
  });

  fs.truncate(username + '.txt', (err) => {
    if (err) {
      console.log("An error occured while cleaning log file.");
      return console.log(err);
    }
    console.log("> " + username + " log file has been cleaned up.");
  })
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

module.exports.startNode = async function() {
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
      peerDiscovery: [Bootstrap, MulticastDNS],
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
          list: [
            `/ip4/${BOOTSTRAP_IP}/tcp/8001/p2p/${BOOTSTRAP_IDS[0]}`,
            `/ip4/${BOOTSTRAP_IP}/tcp/8002/p2p/${BOOTSTRAP_IDS[1]}`,
            `/ip4/${BOOTSTRAP_IP}/tcp/8003/p2p/${BOOTSTRAP_IDS[2]}`
          ],
          interval: 1000,
          enabled: true
        },
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
  module.exports.printAddrs(node)

  return node
}


module.exports.startAuthenticatedNode = async function(node, username) {
  node.app = {
    user: username,
    peerId: node.peerId.toB58String(),
    profiles: {}
  }

  node.isLoggedIn = true

  node.app.profiles[username] = {
    followers: new Set([]),
    following : new Set([]),
    timeline: []
  }

  node.handle("/profile", async ({ stream }) => {
    let profile = await readStream(stream)
    if(!node.app.profiles[profile])
      writeStream(stream, JSON.stringify({err: "Not following!"}))
    else
      writeStream(stream, JSON.stringify(module.exports.profiletoJSON(node.app.profiles[profile])))
  })

  node.handle("/heartbeat", async ({ stream }) => {
    let profile = await readStream(stream)
    writeStream(stream, JSON.stringify(node.app.profiles[node.app.user].following.has(profile)))
  })

  try {
    let profile = await module.exports.getProfile(node, node.app.user)
    // Save in local storage
    node.app.profiles[node.app.user] = profile
    storeData(node)
  } catch (err) {
    console.log("No previous public record found")
    // Check if username.json exists
    // Load json to node.app
    try {
      let profile = fs.readFileSync(username + ".json", "utf8")
      let user = JSON.parse(profile)
        user.followers = new Set(user.followers)
        user.following = new Set(user.following)
        node.app.profiles[node.app.user] = user
    } catch (_err) {
      console.log("Couldn't find snapshot of user! Reading log...")
    }

    // Check if username.txt exists
    // Update node.app
    try {
      let data = fs.readFileSync(username + ".txt", "utf8")
      const lines = data.split(/\r?\n/);
      // parse all lines
      lines.forEach((line) => {
        parseLogMessage(node,line)
      });

    } catch (_err) {
      console.log("Couldn't open log of user!")
    }
  }

  node.contentRouting.provide(await module.exports.createCID(node.app.user))
  node.pubsub.on(node.app.user, (msg) => module.exports.handleMessage(node, node.app.user, msg))
  node.pubsub.subscribe(node.app.user)
}
