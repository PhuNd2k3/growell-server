// See https://github.com/typicode/json-server#module
const jsonServer = require('json-server')
const express = require('express')

const server = express() // dùng express thay vì jsonServer.create()

server.use(express.json()) // Thêm dòng này để parse JSON body

const router = jsonServer.router('db.json')
const middlewares = jsonServer.defaults()

server.use(middlewares)

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

// Add this before server.use(router)
server.use(jsonServer.rewriter({
    '/api/*': '/$1',
    '/blog/:resource/:id/show': '/:resource/:id'
}));
server.use(router)
server.listen(3000, () => {
    console.log('JSON Server is running')
})

// Export the Server API
module.exports = server
