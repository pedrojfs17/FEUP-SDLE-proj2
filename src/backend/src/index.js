const express = require("express");
const bp = require('body-parser')
const cors = require('cors');
const node = require("./node");

const PORT = process.env.PORT;

let currentNode = null

const app = express();

app.use(bp.json())

app.use(bp.urlencoded({ extended: true }))

app.use(cors())


// Handlers

const loginHandler = async (req, res) => {
  if ((req.body.username === "pedrojfs17" && req.body.password === "1234")
      || (req.body.username === "antbz" && req.body.password === "1234")
      || (req.body.username === "g-batalhao-a" && req.body.password === "1234")
      || (req.body.username === "my_name_is_cath" && req.body.password === "1234")) {
    await node.startNode(req.body.username).then(result => { currentNode = result })

    currentNode.pubsub.on(currentNode.app.user, (msg) => node.handleMessage(currentNode, currentNode.app.user, msg))
    currentNode.pubsub.subscribe(currentNode.app.user)
  
    res.send({ token: currentNode.app.token.toString() })
    // Get following profiles
    currentNode.app.profiles[currentNode.app.user].following.forEach(f => {
      node.followRoutine(currentNode, f)
    })
  }
  else
    res.send({ err: 'Invalid Credentials!'})
}

const logoutHandler = () => {
  if (currentNode) currentNode.stop()
  console.log("Stopped node!")
}

const feedHandler = async (req, res) => {
  if(!currentNode) return
  let posts = [...currentNode.app.profiles[currentNode.app.user].timeline]

  for (let user of currentNode.app.profiles[currentNode.app.user].following) {
    posts = posts.concat((await node.getProfile(currentNode, user)).timeline)
  }

  posts.sort((a,b) => {return a.timestamp - b.timestamp})

  res.json({ timeline: posts });
}

const postHandler = (req, res) => {
  // Create post
  // Add post to local timeline
  // Publish in pubsub

  const post = {
    username: currentNode.app.user,
    text: req.body.text,
    timestamp: new Date().getTime()
  }

  currentNode.app.profiles[currentNode.app.user].timeline.push(post)
  currentNode.pubsub.publish(post.username,new TextEncoder().encode("<POST> " + JSON.stringify(post)))

  res.json(post)
}

const followHandler = async (req, res) => {
  // get username
  const username = req.body.username

  node.followRoutine(currentNode, username)

  currentNode.pubsub.publish(username,"<FOLLOW> " + currentNode.app.user)
  currentNode.pubsub.publish(currentNode.app.user,"<FOLLOWED> " + username)

  res.json({isFollowing: true})
}

const unfollowHandler = (req, res) => {

  // get username
  // delete username from following
  // Unsububscribe username
  // delete timeline from local
  // remove provide

  const username = req.body.username

  delete currentNode.app.profiles[username]

  currentNode.app.profiles[currentNode.app.user].following.delete(username)

  currentNode.pubsub.publish(username,"<UNFOLLOW> " + currentNode.app.user)
  currentNode.pubsub.publish(currentNode.app.user,"<UNFOLLOWED> " + username)

  currentNode.pubsub.unsubscribe(username)

  //currentNode.app.timelines.delete(username)

  res.json({isFollowing: false})
}

const userHandler = async (req, res) => {
  if(!currentNode) return
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
