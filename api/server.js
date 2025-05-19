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

server.get('/distinct-skills', (req, res) => {
    const db = router.db;

    const technicalSkills = new Set();
    const softSkills = new Set();
    const personalTraits = new Set();
    const languageRequirements = new Set();
    const universities = new Set();
    const majors = new Set();

    db.get('companies').value().forEach(company => {
        company.recruitment?.jobs?.forEach(job => {
            job.technical_skills?.forEach(skill => technicalSkills.add(skill));
            job.soft_skills?.forEach(skill => softSkills.add(skill));
            job.personal_traits?.forEach(trait => personalTraits.add(trait));

            if (job.language_requirement) {
                languageRequirements.add(job.language_requirement);
            }

            if (job.student_target) {
                if (job.student_target.university) {
                    universities.add(job.student_target.university);
                }

                if (job.student_target.majors) {
                    job.student_target.majors.split(',').forEach(major => {
                        majors.add(major.trim());
                    });
                }
            }
        });
    });

    return res.json({
        technical_skills: Array.from(technicalSkills),
        soft_skills: Array.from(softSkills),
        personal_traits: Array.from(personalTraits),
        language_requirements: Array.from(languageRequirements),
        universities: Array.from(universities),
        majors: Array.from(majors)
    });
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
