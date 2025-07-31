import express from "express"
import "dotenv/config"
import userModel from "./models/user.js"
import postModel from "./models/posts.js"
import cookieParser from "cookie-parser"
import mongoose from "mongoose"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const app = express()
const PORT = process.env.PORT
app.set("view engine", "ejs")
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser());


// mongodb connection

mongoose.connect(process.env.MONGOUI).then(() => {
  console.log("mongodb good")
})

// routes

app.get('/', (req, res) => {
  res.render('login')
})
app.get('/login', (req, res) => {
  res.render('login')
})
app.get('/profile',isLoggedIn,async(req, res) => {
 let user= await userModel.findOne({email: req.user.email});
 await user.populate("posts")
  res.render('profile', {user, posts: user.posts})
})
app.get('/register', (req, res) => {
  res.render('register')
})

app.get('/posts', isLoggedIn, async (req, res) => {
  try {
    const posts = await postModel.find().populate('user', 'username name')
    const user = await userModel.findOne({email: req.user.email})
    res.render('posts', { posts, user })
  } catch (error) {
    console.error('Error fetching posts:', error)
    res.status(500).send('Error fetching posts')
  }
})

app.post('/posts',isLoggedIn,async(req, res) => {
 let user= await userModel.findOne({email: req.user.email})
 let{content}=req.body
   let post = await postModel.create({
      user: user._id,
      content,
      date: new Date()
    })
    user.posts.push(post._id)
    await user.save();
    
    // Check if it's an AJAX request
    if (req.headers['content-type'] === 'application/json') {
      // Return JSON for AJAX requests
      res.json({ success: true, message: 'Post created successfully' });
    } else {
      // Redirect for form submissions
      res.redirect("/posts")
    }
});

// Like Post Route
app.post('/posts/:postId/like', isLoggedIn, async (req, res) => {
  try {
    const post = await postModel.findById(req.params.postId)
    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    const user = await userModel.findOne({email: req.user.email})
    const userId = user._id.toString()

    if (!post.likes) {
      post.likes = []
    }

    const likeIndex = post.likes.indexOf(userId)
    
    if (likeIndex === -1) {
      // Like the post
      post.likes.push(userId)
    } else {
      // Unlike the post
      post.likes.splice(likeIndex, 1)
    }

    await post.save()

    res.json({
      liked: likeIndex === -1,
      likesCount: post.likes.length
    })
  } catch (error) {
    console.error('Error liking post:', error)
    res.status(500).json({ error: 'Error liking post' })
  }
})

// Edit Post Route
app.post('/posts/:postId/edit', isLoggedIn, async (req, res) => {
  try {
    const { content } = req.body
    const post = await postModel.findById(req.params.postId)
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    const user = await userModel.findOne({email: req.user.email})
    
    // Check if user owns the post
    if (post.user.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to edit this post' })
    }

    post.content = content
    await post.save()

    res.json({ success: true, content })
  } catch (error) {
    console.error('Error editing post:', error)
    res.status(500).json({ error: 'Error editing post' })
  }
})

// Delete Post Route
app.delete('/posts/:postId/delete', isLoggedIn, async (req, res) => {
  try {
    const post = await postModel.findById(req.params.postId)
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    const user = await userModel.findOne({email: req.user.email})
    
    // Check if user owns the post
    if (post.user.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this post' })
    }

    // Remove post from user's posts array
    const userIndex = user.posts.indexOf(post._id)
    if (userIndex > -1) {
      user.posts.splice(userIndex, 1)
      await user.save()
    }

    await postModel.findByIdAndDelete(req.params.postId)

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting post:', error)
    res.status(500).json({ error: 'Error deleting post' })
  }
})

app.post('/register', async (req, res) => {
  let { name, username, password, age, email } = req.body

  let user = await userModel.findOne({ email })
  if (user) return res.status(500).send("user already registered")
  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, async (err, hash) => {
      let user = await userModel.create({
        username,
        email,
        age,
        name,
        password: hash

      });
      let token = jwt.sign({ email: email, userid: user._id }, "shhhh");
      res.cookie("token", token);
      res.send("registered")

    })
  })
})

app.get('/logout', (req, res) => {
  res.cookie("token", "")
  res.redirect("/login")
})
function isLoggedIn(req, res, next) {
  if (req.cookies.token === "") res.render('login')
  else {
    let data = jwt.verify(req.cookies.token, "shhhh")
    req.user = data;
    next()
  }
  
}


app.post('/login', async (req, res) => {
  let { password, email } = req.body

  let user = await userModel.findOne({ email })
  if (!user) return res.status(500).send("incorrect email or password")
  bcrypt.compare(password, user.password, function (err, result) {
    if (result) {
     let token = jwt.sign({ email: email, userid: user._id }, "shhhh");
      res.cookie("token", token);
       res.status(200).redirect("/profile")
    }
    else res.redirect('/login')
  })
});
app.listen(PORT, () => {
  console.log(`the server is runing on http://localhost:${PORT}`)
})