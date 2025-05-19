// See https://github.com/typicode/json-server#module
const express = require('express')
const jsonServer = require('json-server')
const forumApi = require('./forumApi')

const server = express()

// Tạo memory database từ db.json
const db = require('./db.json')
const router = jsonServer.router(db)  // Truyền object thay vì file path

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

server.get('/match-companies/:userId', (req, res) => {
    const { userId } = req.params;
    const db = router.db;
    
    // Lấy thông tin user
    const user = db.get('users').find({ id: userId }).value();
    if (!user) {
        return res.status(404).json({ 
            success: false, 
            message: 'Không tìm thấy thông tin sinh viên' 
        });
    }

    // Lấy tất cả companies
    const companies = db.get('companies').value();

    
    // Tính điểm match cho mỗi công ty
    const matchedCompanies = companies.map(company => {
        let matchScore = 0;
        let matchReasons = [];

        // Kiểm tra từng job trong công ty
        company.recruitment?.jobs?.forEach(job => {
            // Match language - đơn giản hóa: nếu job yêu cầu tiếng Anh và user có tiếng Anh ở bất kỳ trình độ nào
            if (job.language_requirement && job.language_requirement.includes('Tiếng Anh') && 
                user.language_level && user.language_level.includes('Tiếng Anh')) {
                matchScore += 1;
                matchReasons.push('Có kỹ năng tiếng Anh phù hợp');
            }

            // Match skills - đơn giản hóa: nếu có ít nhất 1 skill trùng khớp
            const matchingSkills = user.skills.filter(skill => 
                job.technical_skills?.includes(skill)
            );
            if (matchingSkills.length > 0) {
                matchScore += 1;
                matchReasons.push(`Có kỹ năng phù hợp: ${matchingSkills.join(', ')}`);
            }

            // Match majors - đơn giản hóa: nếu có ít nhất 1 major trùng khớp
            if (job.student_target?.majors) {
                const jobMajors = job.student_target.majors.split(',').map(m => m.trim());
                const matchingMajors = user.majors.filter(major => 
                    jobMajors.includes(major)
                );
                if (matchingMajors.length > 0) {
                    matchScore += 1;
                    matchReasons.push(`Chuyên ngành phù hợp: ${matchingMajors.join(', ')}`);
                }
            }

            // Match university - đơn giản hóa: nếu trường đại học trùng khớp
            if (job.student_target?.university === user.university) {
                matchScore += 1;
                matchReasons.push('Trường đại học phù hợp');
            }
        });

        return {
            ...company,
            matchScore,
            matchReasons: matchReasons.length > 0 ? matchReasons : ['Có vị trí phù hợp với sinh viên'],
            recruitment: company.recruitment
        };
    })
    .sort((a, b) => b.matchScore - a.matchScore); // Sắp xếp theo điểm match giảm dần

    // tra ve 5 công ty có match score cao nhat 
    const top5Companies = matchedCompanies.slice(0, 5);
    return res.json({
        success: true,
        data: top5Companies
    });
});

// Sửa lại phần cấu hình rewriter và router
server.use(jsonServer.rewriter({
    '/api/*': '/$1'  // Chuyển /api/companies thành /companies
}));

// Mount router ở cả hai đường dẫn
server.use('/api', router);  // Cho /api/companies
server.use('/', router);     // Cho /companies

// Add custom routes before JSON Server router
server.use('/forum', forumApi)

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})

// Export the Server API
module.exports = server
