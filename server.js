console.log('正在启动服务器...');

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const os = require('os');
const { getAllServers, addFile, getAllFiles } = require('./database');
const fs = require('fs').promises;

const app = express();
const port = 8080;

app.use(cors({
    origin: 'http://localhost:8080' // 或者使用 '*' 允许所有来源
}));

app.use(express.json());
app.use(express.static(__dirname));

// 使用 'uploads' 文件夹
const uploadPath = path.join(__dirname, 'uploads');
console.log('Upload path:', uploadPath);

// 确保上传文件夹存在
fs.mkdir(uploadPath, { recursive: true })
    .then(() => console.log('Upload directory created or already exists'))
    .catch(err => console.error('Error creating upload directory:', err));

// 配置 multer 用于文件上传
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueFilename = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        console.log('Generated filename:', uniqueFilename);
        cb(null, uniqueFilename);
    }
});

// 在 multer 配置中添加文件类型限制
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: function (req, file, cb) {
        // 允许的文件类型
        const allowedTypes = ['image/jpeg', 'image/png', 'text/plain', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('不支持的文件类型'));
        }
    }
}).single('file');

app.get('/api/servers', (req, res) => {
    getAllServers((err, servers) => {
        if (err) {
            res.status(500).json({ error: '获取服务器数据失败' });
        } else {
            res.json(servers);
        }
    });
});

app.post('/api/upload', (req, res) => {
    console.log('Received upload request');
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            return res.status(500).json({ error: '文件上传失败: ' + err.message });
        } else if (err) {
            console.error('Unknown error:', err);
            return res.status(500).json({ error: '文件上传失败: ' + err.message });
        }

        console.log('Upload request processed');
        console.log('Request file:', req.file);
        
        if (!req.file) {
            console.log('No file uploaded');
            return res.status(400).json({ error: '没有文件被上传' });
        }
        
        console.log('File uploaded:', req.file);
        console.log('File path:', req.file.path);
        
        addFile(req.file.filename, req.file.size, (err) => {
            if (err) {
                console.error('File upload error:', err);
                return res.status(500).json({ error: '文件上传失败: 数据库错误' });
            }
            console.log('File added to database');
            res.json({ message: '文件上传成功' });
        });
    });
});

app.get('/api/files', (req, res) => {
    getAllFiles((err, files) => {
        if (err) {
            res.status(500).json({ error: '获取文件列表失败' });
        } else {
            res.json(files);
        }
    });
});

// 修改获取文件内容的路由
app.get('/api/file-content/:filename', async (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadPath, filename);

    try {
        const content = await fs.readFile(filePath, 'utf-8');
        res.json({ content });
    } catch (error) {
        console.error('读取文件失败:', error);
        res.status(500).json({ error: '读取文件失败' });
    }
});

// 添加文件删除路由
app.delete('/api/files/:filename', async (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadPath, filename);

    try {
        await fs.unlink(filePath);
        // 从数据库中删除文件记录
        // 这里需要在 database.js 中添加相应的函数
        await deleteFileFromDatabase(filename);
        res.json({ message: '文件删除成功' });
    } catch (error) {
        console.error('删除文件失败:', error);
        res.status(500).json({ error: '删除文件失败' });
    }
});

app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
});