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
  if (req.body.username === "pedrojfs17" && req.body.password === "1234") {
    await node.startNode(req.body.username).then(result => { currentNode = result })
    console.log(currentNode.app)
    res.send({ token: currentNode.app.token.toString() });
  }
  else
    res.send({ err: 'Invalid Credentials!'})
}

const feedHandler = async (req, res) => {
  let posts = []

  for (let user of currentNode.app.following) {
    posts= posts.concat(await node.getTimeline(currentNode, user))
  }

  res.json({ posts: posts });
}

const postHandler = (req, res) => {
  const post = {
    user: currentNode.app.user,
    text: req.body.text,
    timestamp: new Date().getTime()
  }

  const putTimeline = (newTimeline) => {
    node.updateTimeline(currentNode, newTimeline)
    currentNode.pubsub.publish(post.user,new TextEncoder().encode(JSON.stringify(post)))
  }

  let timeline = node.getTimeline(currentNode, currentNode.app.user)
  timeline.push(post)
  putTimeline(timeline)
  
}

const followHandler = (req, res) => {
  currentNode.pubsub.on(req.body.user, (msg) => {
    //Add post to timeline
    //Provide
    let postStr = new TextDecoder().decode(msg.data)
    let post = JSON.parse(postStr)

    let timeline = node.getTimeline(currentNode, req.body.user)
    timeline.push(post)
    node.updateTimeline(currentNode, timeline)
  })

  currentNode.pubsub.subscribe(req.body.user)
}

const userHandler = async (req, res) => {
  if (currentNode.app.user === req.params.username) {
    res.json({ 
      username: req.params.username,
      posts: currentNode.app.timeline,
      profile: true // To know if the user its in its own profile
    })
  } 
  else if(currentNode.app.following.has(req.params.username)) {
    let timeline = await node.getTimeline(currentNode, req.params.username)
    res.json(timeline)
  } 
  else {
    let cid = await node.createCID(req.params.username)
    console.log(cid)
    for await (const provider of currentNode.contentRouting.findProviders(cid)) {
      currentNode.dialProtocol(provider.id, ['/timeline']).then( async ({stream}) => {
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


// Routes

app.post('/login', loginHandler);

app.get("/feed", feedHandler)

app.post("/post", postHandler)

app.post("/follow", followHandler)

app.get("/user/:username", userHandler);

app.listen(PORT, () => {
  console.log(`Backend listening on ${PORT}`);
});
