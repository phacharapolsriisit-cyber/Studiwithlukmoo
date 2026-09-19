import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const POSTS_FILE = path.join(DATA_DIR, 'community_posts.json');
const SHARED_LINKS_FILE = path.join(DATA_DIR, 'shared_links.json');

// Helper to read JSON safely
function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf-8');
      return fallback;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return fallback;
  }
}

// Helper to write JSON safely
function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// Seed initial community posts if file is empty
const INITIAL_POSTS = [
  {
    id: 'post-01',
    authorId: 'tutor-lukmoo',
    authorName: 'ครูลูกหมู ติวเตอร์คณิต',
    authorTag: 'อาจารย์ผู้สอน',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    content: '🎉 แจกฟรี! คอร์สและสรุปสูตร "แคลคูลัส & เมทริกซ์" เตรียมสอบ A-Level คณิต 1 เน้นเทคนิคหาอนุพันธ์ลูกโซ่และการแก้สมการเมทริกซ์ 3x3 ด้วยวิธีลัด สามารถกดปุ่ม "บันทึกลงคลังของฉัน" เพื่อนำไปเปิดอ่านและฝึกทำโจทย์ได้เลยนะเด็กๆ ใครมีข้อสงสัยพิมพ์ถามในคอมเมนต์ได้เลยครับ!',
    tags: ['#Alevelคณิต1', '#แจกฟรี', '#สูตรลัด', '#Dek68', '#Dek69'],
    likes: 128,
    likedBy: [],
    createdAt: '2025-09-17T09:30:00.000Z',
    sharedItem: {
      type: 'course',
      title: 'A-Level คณิต 1: ตะลุยโจทย์แคลคูลัส & เมทริกซ์ฉบับเร่งรัด',
      category: 'math',
      instructor: 'ครูลูกหมู ติวเตอร์คณิต',
      description: 'รวบรวมเทคนิคคิดเลขเร็ว เจาะลึกโจทย์สปีดเทสต์และการวิเคราะห์กราฟอนุพันธ์ขั้นสูง',
      courseTitle: 'คอร์สคณิตศาสตร์ประยุกต์ 1',
    },
    comments: [
      {
        id: 'c-01',
        postId: 'post-01',
        authorId: 'user-ice',
        authorName: 'น้องไอซ์ Dek68',
        authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
        content: 'ขอบคุณครูลูกหมูมากค่ะ กดเซฟเข้าคลังวิชาเรียบร้อยแล้ว เนื้อหาตรงกับที่กำลังทวนเลย!',
        createdAt: '2025-09-17T10:15:00.000Z',
      },
      {
        id: 'c-02',
        postId: 'post-01',
        authorId: 'user-mew',
        authorName: 'มิว วิศวะจุฬาฯ ฝันที่เป็นจริง',
        content: 'สูตรลดรูปอนุพันธ์ช่วยประหยัดเวลาทำข้อสอบได้เยอะมากจริงๆ ครับ แนะนำเพื่อนๆ โหลดไว้เลย',
        createdAt: '2025-09-17T11:02:00.000Z',
      },
    ],
  },
  {
    id: 'post-02',
    authorId: 'user-poom',
    authorName: 'ภูมิ สายแพทย์รามา',
    authorTag: 'Dek68 กสพท',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    content: 'แชร์คลิป YouTube ติวสรุป "การสังเคราะห์แสง & ฮอร์โมนพืช" ของ สสวท. และ พี่หมอนิค จบใน 45 นาที มีโน้ตย่อจุดที่ข้อสอบชอบหลอกเรื่อง Light Reaction ให้ด้วย สามารถกดปุ่มเพื่อแอดเข้าวิชาชีววิทยาของทุกคนได้ทันทีครับ 🌿🔬',
    imageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80',
    tags: ['#ชีววิทยา', '#กสพท', '#สรุปชีท', '#Dek68', '#Dek69'],
    likes: 94,
    likedBy: [],
    createdAt: '2025-09-16T14:20:00.000Z',
    sharedItem: {
      type: 'material',
      title: 'สรุปเข้มชีวะ: การสังเคราะห์ด้วยแสง & วัฏจักรคัลวิน',
      materialType: 'video',
      youtubeId: 'j8K_U5h1T98',
      url: 'https://www.youtube.com/watch?v=j8K_U5h1T98',
      notes: 'จุดเน้น: Non-cyclic vs Cyclic electron transfer และตำแหน่งเกิดใน Thylakoid lumen',
      courseTitle: 'วิชาชีววิทยา A-Level',
    },
    comments: [
      {
        id: 'c-03',
        postId: 'post-02',
        authorId: 'user-kloy',
        authorName: 'ก้อย สายทันตะ',
        content: 'กำลังงงเรื่อง Cyclic พอดี ขอบคุณที่แชร์คลิปกับโน้ตสรุปให้นะคะ!',
        createdAt: '2025-09-16T16:00:00.000Z',
      },
    ],
  },
  {
    id: 'post-03',
    authorId: 'user-fah',
    authorName: 'ฟ้าใส เด็กอักษรฯ',
    authorTag: 'Dek68 ภาษาไทย & สังคม',
    authorAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&auto=format&fit=crop&q=80',
    content: 'เพื่อนๆ คนไหนเตรียมยื่น Portfolio รอบ 1 ของจุฬาฯ หรือ มธ. บ้างคะ? ตอนนี้เปิดรับสมัครกันหรือยัง แล้วผลงานกิจกรรมค่ายควรใส่ไม่เกินกี่หน้าดีคะ? มาแลกเปลี่ยนแนวทางการจัดเล่มกันได้น้า 📚✨',
    tags: ['#TCASรอบ1', '#Portfolio', '#เด็กอักษร', '#จุฬา', '#ธรรมศาสตร์'],
    likes: 56,
    likedBy: [],
    createdAt: '2025-09-15T18:45:00.000Z',
    comments: [
      {
        id: 'c-04',
        postId: 'post-03',
        authorId: 'user-bank',
        authorName: 'แบงค์ ม.6 รร.สวนกุหลาบ',
        content: 'ของจุฬาฯ รอบแรกส่วนใหญ่จำกัดไม่เกิน 10 หน้ากระดาษ A4 ไม่รวมปกครับ แนะนำเน้นกิจกรรมที่ตรงกับคณะ 3-4 งานเด่นๆ เลย',
        createdAt: '2025-09-15T19:10:00.000Z',
      },
    ],
  },
];

// Initialize community posts file if it doesn't exist
if (!fs.existsSync(POSTS_FILE)) {
  writeJsonFile(POSTS_FILE, INITIAL_POSTS);
}

// -------------------------------------------------------------
// API ROUTES FIRST
// -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// GET all community posts (accessible to all students across the app)
app.get('/api/community/posts', (req, res) => {
  try {
    const posts = readJsonFile<any[]>(POSTS_FILE, INITIAL_POSTS);
    posts.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    res.json(posts);
  } catch (err: any) {
    console.error('Failed to get community posts:', err);
    res.status(500).json({ error: 'Failed to read posts' });
  }
});

// POST create a new community post
app.post('/api/community/posts', (req, res) => {
  try {
    const newPost = req.body;
    if (!newPost || !newPost.id) {
      return res.status(400).json({ error: 'Invalid post data' });
    }

    const posts = readJsonFile<any[]>(POSTS_FILE, INITIAL_POSTS);
    // Avoid duplicates if already added
    const existingIndex = posts.findIndex(p => p.id === newPost.id);
    if (existingIndex >= 0) {
      posts[existingIndex] = { ...posts[existingIndex], ...newPost };
    } else {
      posts.unshift(newPost);
    }

    writeJsonFile(POSTS_FILE, posts);
    res.json({ success: true, post: newPost });
  } catch (err: any) {
    console.error('Failed to create community post:', err);
    res.status(500).json({ error: err.message || 'Failed to create post' });
  }
});

// POST toggle like on community post
app.post('/api/community/posts/:id/like', (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ error: 'Missing uid' });
    }

    const posts = readJsonFile<any[]>(POSTS_FILE, INITIAL_POSTS);
    const post = posts.find(p => p.id === id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (!Array.isArray(post.likedBy)) {
      post.likedBy = [];
    }

    const hasLiked = post.likedBy.includes(uid);
    if (hasLiked) {
      post.likedBy = post.likedBy.filter((u: string) => u !== uid);
    } else {
      post.likedBy.push(uid);
    }
    post.likes = post.likedBy.length;

    writeJsonFile(POSTS_FILE, posts);
    res.json({ success: true, likes: post.likes, likedBy: post.likedBy });
  } catch (err: any) {
    console.error('Failed to like community post:', err);
    res.status(500).json({ error: 'Failed to like post' });
  }
});

// POST add comment to community post
app.post('/api/community/posts/:id/comment', (req, res) => {
  try {
    const { id } = req.params;
    const comment = req.body;
    if (!comment || !comment.content) {
      return res.status(400).json({ error: 'Missing comment content' });
    }

    const posts = readJsonFile<any[]>(POSTS_FILE, INITIAL_POSTS);
    const post = posts.find(p => p.id === id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (!Array.isArray(post.comments)) {
      post.comments = [];
    }
    post.comments.push(comment);

    writeJsonFile(POSTS_FILE, posts);
    res.json({ success: true, comment });
  } catch (err: any) {
    console.error('Failed to add comment to community post:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// DELETE community post
app.delete('/api/community/posts/:id', (req, res) => {
  try {
    const { id } = req.params;
    let posts = readJsonFile<any[]>(POSTS_FILE, INITIAL_POSTS);
    posts = posts.filter(p => p.id !== id);
    writeJsonFile(POSTS_FILE, posts);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to delete post:', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// GET shared link / code lookup
app.get('/api/shared-links/:code', (req, res) => {
  try {
    const { code } = req.params;
    const links = readJsonFile<Record<string, any>>(SHARED_LINKS_FILE, {});
    const item = links[code.toUpperCase()] || links[code];
    if (!item) {
      return res.status(404).json({ error: 'Link not found' });
    }
    res.json(item);
  } catch (err: any) {
    console.error('Failed to retrieve shared link:', err);
    res.status(500).json({ error: 'Failed to retrieve shared link' });
  }
});

// POST save shared link / code
app.post('/api/shared-links', (req, res) => {
  try {
    const { shareCode, shareId, payload, authorName, authorId, note } = req.body;
    if (!shareCode || !payload) {
      return res.status(400).json({ error: 'Missing shareCode or payload' });
    }

    const links = readJsonFile<Record<string, any>>(SHARED_LINKS_FILE, {});
    const record = {
      shareCode: shareCode.toUpperCase(),
      shareId: shareId || `share_${Date.now()}`,
      payload,
      authorName: authorName || 'เพื่อนนักเรียน',
      authorId: authorId || 'guest',
      note: note || '',
      createdAt: new Date().toISOString(),
    };

    links[shareCode.toUpperCase()] = record;
    if (shareId) {
      links[shareId] = record;
    }
    writeJsonFile(SHARED_LINKS_FILE, links);

    res.json({ success: true, record });
  } catch (err: any) {
    console.error('Failed to save shared link:', err);
    res.status(500).json({ error: 'Failed to save shared link' });
  }
});

// -------------------------------------------------------------
// VITE MIDDLEWARE / PRODUCTION STATIC FALLBACK
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lukmoo Tutor Full-Stack Server running on port ${PORT}`);
  });
}

startServer();
