// See https://github.com/typicode/json-server#module
const express = require("express");
const jsonServer = require("json-server");
const forumApi = require("./forumApi");

const server = express();

// Tạo memory database từ db.json
const db = require("../db.json");
const router = jsonServer.router(db); // Truyền object thay vì file path

const middlewares = jsonServer.defaults();

// Middleware
server.use(express.json());
server.use(middlewares);

// CORS middleware
server.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH");
  next();
});

// Custom endpoint to get company details by ID
server.get("/companies/:id", (req, res) => {
  const { id } = req.params;
  const db = router.db;

  const company = db.get("companies").find({ id: id }).value();

  if (!company) {
    return res
      .status(404)
      .json({ success: false, message: "Không tìm thấy công ty" });
  }

  return res.json(company);
});

// Custom endpoint to get company reviews with votes and more details
server.get("/companies/:id/reviews", (req, res) => {
  const { id } = req.params;
  const db = router.db;

  const company = db.get("companies").find({ id: id }).value();

  if (!company) {
    return res
      .status(404)
      .json({ success: false, message: "Không tìm thấy công ty" });
  }

  // Get reviews from company
  const reviews = company.reviews || [];

  // Generate random votes for each review for demo purposes
  const reviewsWithVotes = reviews.map((review) => {
    // Static mock data for demo
    const upvotes = Math.floor(Math.random() * 15);
    const downvotes = Math.floor(Math.random() * 5);

    // Format replies with avatar and timestamps
    const repliesWithDetails = (review.replies || []).map((reply) => ({
      ...reply,
      avatar: generateAvatar(reply.user),
      location: reply.user === "Hoàng Phong" ? "Hà Nội" : "",
      votes: {
        upvotes: Math.floor(Math.random() * 10),
        downvotes: 0,
      },
    }));

    return {
      ...review,
      avatar: generateAvatar(review.user),
      company: company.name,
      votes: {
        upvotes,
        downvotes,
        total: upvotes - downvotes,
      },
      isCompanyMember: review.user === "Đại diện công ty",
      replies: repliesWithDetails,
    };
  });

  return res.json({
    success: true,
    count: reviewsWithVotes.length,
    avgRating: company.rating || 0,
    ratingCount: company.ratingCount || 0,
    data: reviewsWithVotes,
  });
});

// Helper function to generate avatar URL
function generateAvatar(name) {
  // For demo, return a random avatar
  const gender = Math.random() > 0.5 ? "men" : "women";
  const id = Math.floor(Math.random() * 50);
  return `https://randomuser.me/api/portraits/${gender}/${id}.jpg`;
}

// Custom endpoint to add new review to company
server.post("/companies/:id/reviews", (req, res) => {
  const { id } = req.params;
  const newReview = req.body;

  if (!newReview || !newReview.content) {
    return res
      .status(400)
      .json({ success: false, message: "Thiếu thông tin đánh giá" });
  }

  const db = router.db;
  const company = db.get("companies").find({ id: id }).value();

  if (!company) {
    return res
      .status(404)
      .json({ success: false, message: "Không tìm thấy công ty" });
  }

  // Ensure company has a reviews array
  if (!company.reviews) {
    company.reviews = [];
  }

  // Add the new review
  company.reviews.push(newReview);

  // Update company in database
  db.get("companies")
    .find({ id: id })
    .assign({ reviews: company.reviews })
    .write();

  return res.status(201).json({
    success: true,
    message: "Thêm đánh giá thành công",
    reviews: company.reviews,
  });
});

// Endpoint to upvote/downvote a review
server.post("/companies/:id/reviews/:reviewId/vote", (req, res) => {
  const { id, reviewId } = req.params;
  const { voteType } = req.body; // 'upvote' or 'downvote'

  if (!voteType || (voteType !== "upvote" && voteType !== "downvote")) {
    return res
      .status(400)
      .json({ success: false, message: "Loại vote không hợp lệ" });
  }

  const db = router.db;
  const company = db.get("companies").find({ id: id }).value();

  if (!company) {
    return res
      .status(404)
      .json({ success: false, message: "Không tìm thấy công ty" });
  }

  // Find the review
  if (!company.reviews) {
    return res
      .status(404)
      .json({ success: false, message: "Không tìm thấy đánh giá" });
  }

  const reviewIndex = company.reviews.findIndex(
    (review) => review.id === reviewId
  );

  if (reviewIndex === -1) {
    return res
      .status(404)
      .json({ success: false, message: "Không tìm thấy đánh giá" });
  }

  // For demo purposes, we'll just acknowledge the vote but not actually store it
  return res.status(200).json({
    success: true,
    message: `${voteType === "upvote" ? "Upvote" : "Downvote"} thành công`,
    reviewId,
  });
});

// Custom endpoint to add reply to a review
server.post("/companies/:id/reviews/:reviewId/replies", (req, res) => {
  const { id, reviewId } = req.params;
  const newReply = req.body;

  if (!newReply || !newReply.content) {
    return res
      .status(400)
      .json({ success: false, message: "Thiếu thông tin trả lời" });
  }

  const db = router.db;
  const company = db.get("companies").find({ id: id }).value();

  if (!company) {
    return res
      .status(404)
      .json({ success: false, message: "Không tìm thấy công ty" });
  }

  // Find the review
  if (!company.reviews) {
    return res
      .status(404)
      .json({ success: false, message: "Không tìm thấy đánh giá" });
  }

  const reviewIndex = company.reviews.findIndex(
    (review) => review.id === reviewId
  );

  if (reviewIndex === -1) {
    return res
      .status(404)
      .json({ success: false, message: "Không tìm thấy đánh giá" });
  }

  // Ensure review has a replies array
  if (!company.reviews[reviewIndex].replies) {
    company.reviews[reviewIndex].replies = [];
  }

  // Add the new reply
  company.reviews[reviewIndex].replies.push(newReply);

  // Update company in database
  db.get("companies")
    .find({ id: id })
    .assign({ reviews: company.reviews })
    .write();

  return res.status(201).json({
    success: true,
    message: "Thêm trả lời thành công",
    reviews: company.reviews,
  });
});

// Custom endpoint cho tạo comment
server.post("/postComments", (req, res) => {
  const { postId, userId, content, createdAt } = req.body;
  if (!postId || !userId || !content) {
    return res
      .status(400)
      .json({ success: false, message: "Thiếu thông tin comment" });
  }

  // Lấy db instance từ json-server
  const db = router.db;
  const newComment = {
    id: Date.now().toString(), // hoặc dùng uuid nếu muốn
    postId,
    userId,
    content,
    createdAt: createdAt || new Date().toISOString(),
  };

  // Thêm vào mảng postComments
  db.get("postComments").push(newComment).write();

  return res
    .status(201)
    .json({
      success: true,
      message: "Tạo comment thành công",
      data: newComment,
    });
});

// Lấy vote hiện tại của user cho post
server.get("/votes", (req, res) => {
  const { postId, userId } = req.query;
  const db = router.db;
  let votes = db.get("votes").value();

  if (postId) votes = votes.filter((v) => v.postId == postId);
  if (userId) votes = votes.filter((v) => v.userId == userId);

  return res.json(votes);
});

// Tạo mới vote
server.post("/votes", (req, res) => {
  const { postId, userId, type } = req.body;
  if (!postId || !userId || !type) {
    return res
      .status(400)
      .json({ success: false, message: "Thiếu thông tin vote" });
  }
  const db = router.db;
  const newVote = {
    id: Date.now().toString(),
    postId,
    userId,
    type,
  };
  db.get("votes").push(newVote).write();
  return res
    .status(201)
    .json({ success: true, message: "Tạo vote thành công", data: newVote });
});

// Cập nhật vote
server.patch("/votes/:id", (req, res) => {
  const { id } = req.params;
  const { type } = req.body;
  if (!type) {
    return res
      .status(400)
      .json({ success: false, message: "Thiếu thông tin type" });
  }
  const db = router.db;
  const vote = db.get("votes").find({ id }).value();
  if (!vote) {
    return res
      .status(404)
      .json({ success: false, message: "Vote không tồn tại" });
  }
  db.get("votes").find({ id }).assign({ type }).write();
  const updatedVote = db.get("votes").find({ id }).value();
  return res.json({
    success: true,
    message: "Cập nhật vote thành công",
    data: updatedVote,
  });
});

// Lấy tất cả các kỹ năng từ các công ty để code FE
server.get("/distinct-skills", (req, res) => {
  const db = router.db;

  const technicalSkills = new Set();
  const softSkills = new Set();
  const personalTraits = new Set();
  const languageRequirements = new Set();
  const universities = new Set();
  const majors = new Set();

  db.get("companies")
    .value()
    .forEach((company) => {
      company.recruitment?.jobs?.forEach((job) => {
        job.technical_skills?.forEach((skill) => technicalSkills.add(skill));
        job.soft_skills?.forEach((skill) => softSkills.add(skill));
        job.personal_traits?.forEach((trait) => personalTraits.add(trait));

        if (job.language_requirement) {
          languageRequirements.add(job.language_requirement);
        }

        if (job.student_target) {
          if (job.student_target.university) {
            universities.add(job.student_target.university);
          }

          if (job.student_target.majors) {
            job.student_target.majors.split(",").forEach((major) => {
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
    majors: Array.from(majors),
  });
});

server.get("/match-companies/:userId", (req, res) => {
  const { userId } = req.params;
  const db = router.db;

  // Lấy thông tin user
  const user = db.get("users").find({ id: userId }).value();
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy thông tin sinh viên",
    });
  }

  // Lấy tất cả companies
  const companies = db.get("companies").value();

  // Tính điểm match cho mỗi công ty
  const matchedCompanies = companies
    .map((company) => {
      let matchScore = 0;
      let matchReasons = [];

      // Kiểm tra từng job trong công ty
      company.recruitment?.jobs?.forEach((job) => {
        // Match language - đơn giản hóa: nếu job yêu cầu tiếng Anh và user có tiếng Anh ở bất kỳ trình độ nào
        if (
          job.language_requirement &&
          job.language_requirement.includes("Tiếng Anh") &&
          user.language_level &&
          user.language_level.includes("Tiếng Anh")
        ) {
          matchScore += 1;
          matchReasons.push("Có kỹ năng tiếng Anh phù hợp");
        }

        // Match skills - đơn giản hóa: nếu có ít nhất 1 skill trùng khớp
        const matchingSkills = user.skills.filter((skill) =>
          job.technical_skills?.includes(skill)
        );
        if (matchingSkills.length > 0) {
          matchScore += 1;
          matchReasons.push(`Có kỹ năng phù hợp: ${matchingSkills.join(", ")}`);
        }

        // Match majors - đơn giản hóa: nếu có ít nhất 1 major trùng khớp
        if (job.student_target?.majors) {
          const jobMajors = job.student_target.majors
            .split(",")
            .map((m) => m.trim());
          const matchingMajors = user.majors.filter((major) =>
            jobMajors.includes(major)
          );
          if (matchingMajors.length > 0) {
            matchScore += 1;
            matchReasons.push(
              `Chuyên ngành phù hợp: ${matchingMajors.join(", ")}`
            );
          }
        }

        // Match university - đơn giản hóa: nếu trường đại học trùng khớp
        if (job.student_target?.university === user.university) {
          matchScore += 1;
          matchReasons.push("Trường đại học phù hợp");
        }
      });

      return {
        ...company,
        matchScore,
        matchReasons:
          matchReasons.length > 0
            ? matchReasons
            : ["Có vị trí phù hợp với sinh viên"],
        recruitment: company.recruitment,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore); // Sắp xếp theo điểm match giảm dần

  // tra ve 5 công ty có match score cao nhat
  const top5Companies = matchedCompanies.slice(0, 5);
  return res.json({
    success: true,
    data: top5Companies,
  });
});

// --- FORUM API ---
// Get all posts with related data
server.get("/forum/posts", (req, res) => {
  try {
    const db = router.db;
    const postsRaw = db.get("posts").value();
    const users = db.get("users").value();
    const postCommentsAll = db.get("postComments").value();
    const votes = db.get("votes").value();
    const posts = postsRaw.map((post) => {
      const author = users.find((user) => user.id === post.userId);
      const postComments = postCommentsAll.filter(
        (comment) => String(comment.postId) == String(post.id)
      );
      const postVotes = votes.filter((vote) => vote.postId === post.id);
      return {
        id: post.id,
        author: author?.name || "Unknown User",
        avatar: `https://randomuser.me/api/portraits/${
          Math.random() > 0.5 ? "men" : "women"
        }/${Math.floor(Math.random() * 50)}.jpg`,
        time: post.createdAt
          ? new Date(post.createdAt).toLocaleString("vi-VN", {
              year: "numeric",
              month: "numeric",
              day: "numeric",
              hour: "numeric",
              minute: "numeric",
            })
          : "Invalid Date",
        content: post.content,
        title: post.title,
        tags: post.tags || [],
        voteCount:
          postVotes.filter((v) => v.type === "upvote").length -
          postVotes.filter((v) => v.type === "downvote").length,
        commentCount: postComments.length,
      };
    });
    res.json(posts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new post
server.post("/forum/posts", (req, res) => {
  try {
    const db = router.db;
    const { title, content, tags } = req.body;
    const newPost = {
      id: Date.now().toString(),
      userId: "1", // Using mock userId for now
      title,
      content,
      tags: tags || [],
      upvotes: 0,
      downvotes: 0,
      createdAt: new Date().toISOString(),
    };
    db.get("posts").push(newPost).write();
    res.status(201).json(newPost);
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get comments by postId
server.get("/forum/comments", (req, res) => {
  try {
    const { postId } = req.query;
    if (!postId) {
      return res.status(400).json({ error: "postId is required" });
    }
    const db = router.db;
    const comments = db
      .get("postComments")
      .filter((comment) => String(comment.postId) == String(postId))
      .value();
    const users = db.get("users").value();
    const commentsWithUser = comments.map((comment) => {
      const user = users.find((u) => u.id === comment.userId);
      return {
        id: comment.id,
        author: user?.name || "Unknown User",
        avatar: `https://randomuser.me/api/portraits/${
          Math.random() > 0.5 ? "men" : "women"
        }/${Math.floor(Math.random() * 50)}.jpg`,
        time: comment.createdAt
          ? new Date(comment.createdAt).toLocaleString("vi-VN", {
              year: "numeric",
              month: "numeric",
              day: "numeric",
              hour: "numeric",
              minute: "numeric",
            })
          : "Invalid Date",
        content: comment.content,
      };
    });
    res.json(commentsWithUser);
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new comment
server.post("/forum/comments", (req, res) => {
  try {
    const db = router.db;
    const { postId, userId, content } = req.body;
    const newComment = {
      id: Date.now().toString(),
      postId,
      userId,
      content,
      createdAt: new Date().toISOString(),
    };
    db.get("postComments").push(newComment).write();
    res.status(201).json(newComment);
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new vote
server.post("/forum/votes", (req, res) => {
  try {
    const db = router.db;
    const { postId, userId, type } = req.body;
    const newVote = {
      id: Date.now().toString(),
      postId,
      userId,
      type,
      createdAt: new Date().toISOString(),
    };
    db.get("votes").push(newVote).write();
    res.status(201).json(newVote);
  } catch (error) {
    console.error("Error creating vote:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Custom endpoint cho tạo comment (để tương thích với frontend)
server.post("/forum/postComments", (req, res) => {
  try {
    const db = router.db;
    const { postId, userId, content, createdAt } = req.body;
    if (!postId || !userId || !content) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu thông tin comment" });
    }

    const newComment = {
      id: Date.now().toString(),
      postId,
      userId,
      content,
      createdAt: createdAt || new Date().toISOString(),
    };

    db.get("postComments").push(newComment).write();
    return res
      .status(201)
      .json({
        success: true,
        message: "Tạo comment thành công",
        data: newComment,
      });
  } catch (error) {
    console.error("Error creating post comment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// --- FORUM API END ---

server.use(
  jsonServer.rewriter({
    "/api/*": "/$1", // Chuyển /api/companies thành /companies
  })
);

// Mount router ở cả hai đường dẫn
server.use("/api", router); // Cho /api/companies
server.use("/", router); // Cho /companies

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Export the Server API
module.exports = server;
