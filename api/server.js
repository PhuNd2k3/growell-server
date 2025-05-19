// See https://github.com/typicode/json-server#module
const express = require('express')
const jsonServer = require('json-server')
const forumApi = require('./forumApi')

const server = express()
const router = jsonServer.router('db.json')
const middlewares = jsonServer.defaults()

// Middleware
server.use(express.json())
server.use(middlewares)

// CORS middleware
server.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH')
  next()
})

// Custom endpoint cho tạo comment
server.post('/postComments', (req, res) => {
    const { postId, userId, content, createdAt } = req.body;
    if (!postId || !userId || !content) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin comment' });
    }

    // Lấy db instance từ json-server
    const db = router.db;
    const newComment = {
        id: Date.now().toString(), // hoặc dùng uuid nếu muốn
        postId,
        userId,
        content,
        createdAt: createdAt || new Date().toISOString()
    };

    // Thêm vào mảng postComments
    db.get('postComments').push(newComment).write();

    return res.status(201).json({ success: true, message: 'Tạo comment thành công', data: newComment });
});

// Lấy vote hiện tại của user cho post
server.get('/votes', (req, res) => {
    const { postId, userId } = req.query;
    const db = router.db;
    let votes = db.get('votes').value();

    if (postId) votes = votes.filter(v => v.postId == postId);
    if (userId) votes = votes.filter(v => v.userId == userId);

    return res.json(votes);
});

// Tạo mới vote
server.post('/votes', (req, res) => {
    const { postId, userId, type } = req.body;
    if (!postId || !userId || !type) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin vote' });
    }
    const db = router.db;
    const newVote = {
        id: Date.now().toString(),
        postId,
        userId,
        type
    };
    db.get('votes').push(newVote).write();
    return res.status(201).json({ success: true, message: 'Tạo vote thành công', data: newVote });
});

// Cập nhật vote
server.patch('/votes/:id', (req, res) => {
    const { id } = req.params;
    const { type } = req.body;
    if (!type) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin type' });
    }
    const db = router.db;
    const vote = db.get('votes').find({ id }).value();
    if (!vote) {
        return res.status(404).json({ success: false, message: 'Vote không tồn tại' });
    }
    db.get('votes').find({ id }).assign({ type }).write();
    const updatedVote = db.get('votes').find({ id }).value();
    return res.json({ success: true, message: 'Cập nhật vote thành công', data: updatedVote });
});

// Add this before server.use(router)
server.use(jsonServer.rewriter({
    '/api/*': '/$1',
    '/blog/:resource/:id/show': '/:resource/:id'
}));

// Add custom routes before JSON Server router
server.use('/forum', forumApi)
server.use('/api', router)

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})

// Export the Server API
module.exports = server
