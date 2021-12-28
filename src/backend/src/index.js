const express = require("express");
const bp = require('body-parser')
const cors = require('cors');
const node = require("./node");

const PORT = process.env.PORT || 3001;

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
    console.log(currentNode.app)
    res.send({ token: currentNode.app.token.toString() });
  }
  else
    res.send({ err: 'Invalid Credentials!'})
}

const logoutHandler = () => {
  if (currentNode) currentNode.stop()
  console.log("Stopped node!")
}

const feedHandler = async (req, res) => {
  let posts = [...currentNode.app.timelines[currentNode.app.user]]

  for (let user of currentNode.app.following) {
    posts = posts.concat(await node.getTimeline(currentNode, user))
  }

  posts.sort((a,b) => {return a.timestamp - b.timestamp})

  res.json({ posts: posts });
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

  currentNode.app.timelines[currentNode.app.user].push(post)
  currentNode.pubsub.publish(post.username,new TextEncoder().encode(JSON.stringify(post)))

  res.json("OK")
  
}

const followHandler = async (req, res) => {
  // get username
  // add username to following
  // Subscribe username
  // dial protocol to get timeline
  // save timeline to local
  // announce provide
  // evertyiem receive message, uypdate local timeline

  const username = req.body.username

  currentNode.app.following.add(username)

  currentNode.pubsub.on(username, (msg) => {
    //Add post to timeline
    //Provide
    let postStr = new TextDecoder().decode(msg.data)
    let post = JSON.parse(postStr)

    currentNode.app.timelines[username].push(post)
    currentNode.app.timelines[username] = currentNode.app.timelines[username].filter(p => {return (new Date.getTime()- p.timestamp) < (1000*60)}) //less than 24h (1000*3600*24)  
  })

  currentNode.pubsub.subscribe(req.body.user)

  let timeline = await node.getTimeline(currentNode,username)

  currentNode.app.timelines[username] = timeline

  currentNode.contentRouting.provide(await node.createCID(username))

  
  res.json({following: true})
}

const unfollowHandler = (req, res) => {

  // get username
  // delete username from following
  // Unsububscribe username
  // delete timeline from local
  // remove provide

  const username = req.body.username

  currentNode.app.following.delete(username)

  currentNode.pubsub.unsubribe(username)

  //currentNode.app.timelines.delete(username)

  
  res.json({following: false})
}

const userHandler = async (req, res) => {
  if (!req.params.username || req.params.username === currentNode.app.user) {
    res.json({ 
      username: currentNode.app.user,
      posts: currentNode.app.timelines[currentNode.app.user],
      profile: true // To know if the user its in its own profile
    })
  } 
  else if(currentNode.app.following.has(req.params.username)) {
    res.json({ 
      username: req.params.username,
      posts: currentNode.app.timelines[req.params.username],
      profile: false
    })
  } 
  else {
    try {
      let timeline = await node.getTimeline(currentNode, req.params.username)
      res.json({ 
        username: req.params.username,
        posts: timeline,
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
