const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
const fsPromises = require('fs').promises;
const cron = require('node-cron');
const mime = require('mime-types'); // 请确保安装了这个包：npm install mime-types
const fs = require('fs'); // 确保这行在文件顶部

const app = express();

// 将 CORS 中间件移到最前面
app.use(cors({
    origin: '*', // 在生产环境中，应该指定具体的域名
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true // 允许发送凭证
}));

// 添加 ping 路由
app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

app.use(express.json());

// 连接到MongoDB
mongoose.connect('mongodb://localhost/whitemoon_db', { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
})
.then(() => console.log('Successfully connected to MongoDB'))
.catch(err => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1); // 如果无法连接到数据库，终止服务器
});

// 创建文件模型
const File = mongoose.model('File', {
    filename: String,
    path: String,
    uploadDate: Date
});

// 设置文件上传
const uploadsDir = path.join(__dirname, '..', 'uploads');
console.log('Uploads directory:', uploadsDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// 处理文件上传
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    const relativePath = path.relative(uploadsDir, req.file.path);
    console.log('Relative file path:', relativePath);

    const newFile = new File({
        filename: req.file.originalname,
        path: relativePath,
        uploadDate: new Date(),
        size: req.file.size
    });

    newFile.save()
        .then((savedFile) => res.json({ 
            message: 'File uploaded successfully.',
            file: {
                filename: savedFile.filename,
                size: savedFile.size,
                uploadDate: savedFile.uploadDate
            }
        }))
        .catch(err => {
            console.error('Error saving file to database:', err);
            res.status(500).json({ error: 'Error uploading file: ' + err.message });
        });
});

// 获取文件列表
app.get('/api/files', (req, res) => {
    console.log('处理 /api/files 请求');
    File.find({})
        .then(files => {
            console.log('文件列表:', files);
            res.json(files);
        })
        .catch(err => {
            console.error('Error fetching files:', err);
            res.status(500).send('Error fetching files: ' + err.message);
        });
});

// 添加删除文件的路由和函数
app.delete('/api/files/:filename', async (req, res) => {
    const filename = req.params.filename;
    console.log(`尝试删除文件: ${filename}`);
    try {
        await deleteFileFromFileSystem(filename);
        await deleteFileFromDatabase(filename);
        res.json({ message: 'File deleted successfully.' });
    } catch (error) {
        console.error('删除文件失败:', error);
        console.error('错误堆栈:', error.stack);
        // 即使文件系统删除失败，也尝试删除数据库记录
        try {
            await deleteFileFromDatabase(filename);
            res.json({ message: 'File record deleted from database, but file may still exist in file system.' });
        } catch (dbError) {
            console.error('删除数据库记录失败:', dbError);
            res.status(500).json({ error: '删除文件失败', details: error.message || '未知错误' });
        }
    }
});

async function deleteFileFromDatabase(filename) {
    console.log(`从数据库中删除文件: ${filename}`);
    const file = await File.findOne({ filename: filename });
    if (!file) {
        console.log(`文件 ${filename} 在数据库中未找到`);
        return; // 如果文件在数据库中不存在，直接返回
    }
    const result = await File.deleteOne({ _id: file._id });
    console.log(`删除结果:`, result);
    if (result.deletedCount === 0) {
        throw new Error(`Failed to delete file ${filename} from database`);
    }
}

async function deleteFileFromFileSystem(filename) {
    console.log(`从文件系统中删除文件: ${filename}`);
    const file = await File.findOne({ filename: filename });
    if (!file) {
        console.log(`文件 ${filename} 在数据库中未找到`);
        return; // 如果文件在数据库中不存在，直接返回
    }
    try {
        console.log(`尝试删除文件: ${file.path}`);
        await fsPromises.access(file.path); // 检查文件是否存在
        await fsPromises.unlink(file.path);
        console.log(`文件 ${filename} 已从文件系统中删除`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log(`文件 ${filename} 在文件系统中不存在，可能已被删除`);
            // 不抛出错误，让程序继续执行以删除数据库记录
        } else {
            console.error(`删除文件 ${filename} 时发生错误:`, error);
            throw error;
        }
    }
}

// WebSocket 服务器
const server = http.createServer(app);  // 使用 Express app 创建 HTTP 服务器
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('新的WebSocket客户端已连接');

    const interval = setInterval(() => {
        const attackData = {
            latitude: Math.random() * 180 - 90,
            longitude: Math.random() * 360 - 180,
            type: ['DDoS', 'SQL注入', '跨站脚本'][Math.floor(Math.random() * 3)]
        };
        console.log('发送数据:', attackData);
        ws.send(JSON.stringify(attackData));
    }, 1000);

    ws.on('close', () => {
        clearInterval(interval);
        console.log('WebSocket客户端已断开连接');
    });
});

const port = 8080;

server.listen(port, async () => {
    console.log(`Server and WebSocket running at http://localhost:${port}`);
    console.log('Server directory:', __dirname);
    console.log('Uploads directory:', uploadsDir);
    
    // 测试 ping 路由
    const testResponse = await fetch(`http://localhost:${port}/ping`);
    if (testResponse.ok) {
        console.log('Ping route is working correctly');
    } else {
        console.error('Ping route is not working:', await testResponse.text());
    }

    try {
        await syncFiles();
        console.log('文件同步完成');
    } catch (error) {
        console.error('文件同步失败:', error);
    }
});

// 删除这行，因为我们已经在上面启动了服务器
// app.listen(port, () => { ... });

// 在服务器启动时检查并创建 uploads 目录
fsPromises.mkdir(uploadsDir, { recursive: true })
    .then(() => console.log('uploads 目录已创建或已存在'))
    .catch(err => console.error('创建 uploads 目录失败:', err));

// 修改文件内容路由
app.get('/api/file-content/:filename', async (req, res) => {
    const filename = req.params.filename;
    console.log(`尝试获取文件内容: ${filename}`);
    try {
        const file = await File.findOne({ filename: filename });
        if (!file) {
            console.log(`文件未找到: ${filename}`);
            return res.status(404).send('File not found in database');
        }
        console.log(`数据库中的文件记录:`, file);
        
        const absolutePath = path.resolve(uploadsDir, file.path);
        console.log(`计算得到的绝对路径: ${absolutePath}`);
        
        if (!fs.existsSync(absolutePath)) {
            console.error(`文件不存在: ${absolutePath}`);
            return res.status(404).send('File not found on server');
        }

        res.sendFile(absolutePath, (err) => {
            if (err) {
                console.error('发送文件时发生错误:', err);
                res.status(500).send('Error sending file: ' + err.message);
            } else {
                console.log('文件发送成功');
            }
        });
    } catch (error) {
        console.error('处理文件请求时出错:', error);
        res.status(500).send('Error processing file request: ' + error.message);
    }
});

// 添加错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// 添加文件内容路由
app.post('/api/sync-files', async (req, res) => {
    try {
        const files = await File.find();
        for (let file of files) {
            try {
                await fsPromises.access(file.path);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.log(`文件 ${file.filename} 不存在，从数据库中删除`);
                    await File.deleteOne({ _id: file._id });
                }
            }
        }
        res.json({ message: 'File synchronization completed.' });
    } catch (error) {
        console.error('同步文件失败:', error);
        res.status(500).json({ error: '同步文件失败', details: error.message });
    }
});

async function syncFiles() {
    const files = await File.find();
    for (let file of files) {
        try {
            const absolutePath = path.resolve(uploadsDir, file.path);
            await fsPromises.access(absolutePath);
            console.log(`文件 ${file.filename} 存在于路径: ${absolutePath}`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`文件 ${file.filename} 不存在于路径: ${path.resolve(uploadsDir, file.path)}`);
                console.log(`数据库中的文件路径: ${file.path}`);
                const userConfirmation = await askUserConfirmation(`是否删除数据库中的文件记录 ${file.filename}？(y/n)`);
                if (userConfirmation) {
                    await File.deleteOne({ _id: file._id });
                    console.log(`文件 ${file.filename} 的记录已从数据库中删除`);
                } else {
                    console.log(`保留文件 ${file.filename} 的数据库记录`);
                }
            } else {
                console.error(`检查文件 ${file.filename} 时发生错误:`, error);
            }
        }
    }
}

// 添加这个辅助函数来获取用户确认
function askUserConfirmation(question) {
    return new Promise((resolve) => {
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });

        readline.question(question, (answer) => {
            readline.close();
            resolve(answer.toLowerCase() === 'y');
        });
    });
}

// 在服务器启动代码附近添加这个
cron.schedule('0 * * * *', async () => {
    console.log('运行定时文件同步任务');
    try {
        await syncFiles();
        console.log('文件同步完成');
    } catch (error) {
        console.error('文件同步失败:', error);
    }
});

// 在所有其他路由之后添加
app.use((req, res, next) => {
    console.log(`未找到路由: ${req.method} ${req.url}`);
    res.status(404).send('Not Found');
});

console.log('Server directory:', __dirname);