const express = require("express");
const bp = require('body-parser')
const cors = require('cors');
const node = require("./node");

const PORT = process.env.PORT;

let currentNode = null

node.startNode().then(result => { currentNode = result })

const app = express();

app.use(bp.json())

app.use(bp.urlencoded({ extended: true }))

app.use(cors())


// Handlers

const registerHandler = async (req, res) => {
  if (!currentNode) return
  // Register
  //  -> check if username is valid (only alphanumeric and not already used)
  //  -> put hashed password in dht
  //  -> login

  const username = req.body.username
  const password = req.body.password

  if (!username.match(/^[0-9a-zA-Z_\-]+$/)) {
    res.send({ err: 'Invalid Username!'})
    return
  }

  try {
    await currentNode.contentRouting.get(new TextEncoder().encode('/' + username))
    res.send({ err: 'Username already used!'})
    return
  } catch (error) {
    console.log("Username is unique! Proceding...")
  }

  const hashedPassword = await node.hashPassword(password)

  currentNode.contentRouting.put(new TextEncoder().encode('/' + username), new TextEncoder().encode(hashedPassword))

  node.startAuthenticatedNode(currentNode, username)

  res.send({ token: username })
}

const loginHandler = async (req, res) => {
  if (!currentNode) return
  // Login
  //  -> get hashed password of that user from dht
  //  -> compare passwords
  //  -> login or error

  const username = req.body.username
  const password = req.body.password

  let hashedPassword;

  try {
    hashedPassword = (await currentNode.contentRouting.get(new TextEncoder().encode('/' + username))).val
    hashedPassword = new TextDecoder().decode(hashedPassword)
  } catch (error) {
    console.log(error)
    res.send({ err: 'User not found!'})
    return
  }

  if (await node.comparePassword(password, hashedPassword)) {
    node.startAuthenticatedNode(currentNode, username)
    
    res.send({ token: username })

    currentNode.app.profiles[currentNode.app.user].following.forEach(f => {
      node.followRoutine(currentNode, f)
    })
  }
  else 
    res.send({ err: 'Invalid Credentials!'})
}

const logoutHandler = (req, res) => {
  if (!currentNode.isLoggedIn) return

  currentNode.stop()
  console.log("Stopped node!")

  currentNode = await node.startNode()

  res.json("OK")
}

const feedHandler = async (req, res) => {
  if (!currentNode.isLoggedIn) return

  let posts = [...currentNode.app.profiles[currentNode.app.user].timeline]

  for (let user of currentNode.app.profiles[currentNode.app.user].following) {
    if (currentNode.app.profiles[user])
      posts = posts.concat(currentNode.app.profiles[user].timeline)
    else
      posts = posts.concat((await node.getProfile(currentNode, user)).timeline)
  }

  posts.sort((a,b) => {return a.timestamp - b.timestamp})

  res.json({ timeline: posts });
}

const postHandler = (req, res) => {
  if (!currentNode.isLoggedIn) return

  // Create post
  // Add post to local timeline
  // Publish in pubsub

  const post = {
    username: currentNode.app.user,
    text: req.body.text,
    timestamp: new Date().getTime()
  }

  currentNode.app.profiles[currentNode.app.user].timeline.push(post)

  const postMessage = "<POST> " + JSON.stringify(post)

  currentNode.pubsub.publish(post.username, new TextEncoder().encode(postMessage))
  node.logData(currentNode, postMessage)

  res.json(post)
}

const followHandler = async (req, res) => {
  if (!currentNode.isLoggedIn) return
  
  // get username
  const username = req.body.username

  node.followRoutine(currentNode, username)

  currentNode.pubsub.publish(username, "<FOLLOW> " + currentNode.app.user)
  currentNode.pubsub.publish(currentNode.app.user, "<FOLLOWED> " + username)

  res.json({isFollowing: true})
}

const unfollowHandler = (req, res) => {
  if (!currentNode.isLoggedIn) return

  // get username
  // delete username from following
  // Unsububscribe username
  // delete timeline from local
  // remove provide

  const username = req.body.username

  delete currentNode.app.profiles[username]

  currentNode.app.profiles[currentNode.app.user].following.delete(username)

  currentNode.pubsub.publish(username, "<UNFOLLOW> " + currentNode.app.user)
  currentNode.pubsub.publish(currentNode.app.user, "<UNFOLLOWED> " + username)

  currentNode.pubsub.unsubscribe(username)

  //currentNode.app.timelines.delete(username)

  res.json({isFollowing: false})
}

const userHandler = async (req, res) => {
  if (!currentNode.isLoggedIn) return

  if (!req.params.username || req.params.username === currentNode.app.user) {
    res.json({ 
      ...node.profiletoJSON(currentNode.app.profiles[currentNode.app.user]),
      username: currentNode.app.user,
      profile: true // To know if the user its in its own profile
    })
  } 
  else if(currentNode.app.profiles[currentNode.app.user].following.has(req.params.username)) {
    res.json({ 
      ...node.profiletoJSON(currentNode.app.profiles[req.params.username]),
      username: req.params.username,
      isFollowing: true,
      profile: false
    })
  } 
  else {
    try {
      let profile = await node.getProfile(currentNode, req.params.username)
      res.json({
        ...node.profiletoJSON(profile),
        username: req.params.username,
        isFollowing: false,
        profile: false
      })
    }
    catch (e) {
      res.json({ err: "User not Found!" })
    }
  }
}

// Routes

app.post('/register', registerHandler)

app.post('/login', loginHandler)

app.get('/logout', logoutHandler)

app.get("/feed", feedHandler)

app.post("/post", postHandler)

app.post("/follow", followHandler)

app.post("/unfollow", unfollowHandler)

app.get("/user", userHandler)

app.get("/user/:username", userHandler)

app.listen(PORT, () => {
  console.log(`Backend listening on ${PORT}`);
});
