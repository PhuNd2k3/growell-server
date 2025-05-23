const express = require('express');
const router = express.Router();
const db = require('../db.json');

// Get all posts with related data
router.get('/posts', (req, res) => {
  try {
    // Lấy db instance từ json-server router
    const db = req.app && req.app.locals && req.app.locals.db
      ? req.app.locals.db
      : require('json-server').router(__dirname + '/../db.json').db;
    const postsRaw = db.get('posts').value();
    const users = db.get('users').value();
    const postCommentsAll = db.get('postComments').value();
    const votes = db.get('votes').value();
    const posts = postsRaw.map(post => {
      const author = users.find(user => user.id === post.userId);
      const postComments = postCommentsAll.filter(comment => String(comment.postId) == String(post.id));
      const postVotes = votes.filter(vote => vote.postId === post.id);
      return {
        id: post.id,
        author: author?.name || 'Unknown User',
        avatar: `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'men' : 'women'}/${Math.floor(Math.random() * 50)}.jpg`,
        time: post.createdAt ? new Date(post.createdAt).toLocaleString('vi-VN', { 
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric'
        }) : 'Invalid Date',
        content: post.content,
        title: post.title,
        tags: post.tags || [],
        voteCount: postVotes.filter(v => v.type === 'upvote').length - postVotes.filter(v => v.type === 'downvote').length,
        commentCount: postComments.length
      };
    });
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new vote
router.post('/votes', (req, res) => {
  try {
    const { postId, userId, type } = req.body;
    const newVote = {
      id: Date.now().toString(),
      postId,
      userId,
      type,
      createdAt: new Date().toISOString()
    };
    
    db.votes.push(newVote);
    res.status(201).json(newVote);
  } catch (error) {
    console.error('Error creating vote:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new comment
router.post('/comments', (req, res) => {
  try {
    const { postId, userId, content } = req.body;
    const newComment = {
      id: Date.now().toString(),
      postId,
      userId,
      content,
      createdAt: new Date().toISOString()
    };
    
    db.comments.push(newComment);
    res.status(201).json(newComment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new post
router.post('/posts', (req, res) => {
  try {
    const { title, content, tags } = req.body;
    // Sử dụng json-server router để ghi vào file db.json
    const dbInstance = req.app.locals.db || require('json-server').router(__dirname + '/../db.json').db;
    const newPost = {
      id: Date.now().toString(),
      userId: "1", // Using mock userId for now
      title,
      content,
      tags: tags || [],
      upvotes: 0,
      downvotes: 0,
      createdAt: new Date().toISOString()
    };
    dbInstance.get('posts').push(newPost).write();
    res.status(201).json(newPost);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Lấy danh sách comment theo postId từ postComments
router.get('/comments', (req, res) => {
  try {
    const { postId } = req.query;
    if (!postId) {
      return res.status(400).json({ error: 'postId is required' });
    }
    // Lấy db instance từ json-server router
    const db = req.app && req.app.locals && req.app.locals.db
      ? req.app.locals.db
      : require('json-server').router(__dirname + '/../db.json').db;
    const comments = db.get('postComments').filter(comment => String(comment.postId) == String(postId)).value();
    const users = db.get('users').value();
    // Bổ sung thông tin user cho từng comment
    const commentsWithUser = comments.map(comment => {
      const user = users.find(u => u.id === comment.userId);
      return {
        id: comment.id,
        author: user?.name || 'Unknown User',
        avatar: `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'men' : 'women'}/${Math.floor(Math.random() * 50)}.jpg`,
        time: comment.createdAt ? new Date(comment.createdAt).toLocaleString('vi-VN', {
          year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric'
        }) : 'Invalid Date',
        content: comment.content
      };
    });
    res.json(commentsWithUser);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 