const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// 连接到MongoDB
mongoose.connect('mongodb://localhost/whitemoon_db', { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
})
.then(() => console.log('Successfully connected to MongoDB'))
.catch(err => console.error('Error connecting to MongoDB:', err));

// 创建文件模型
const File = mongoose.model('File', {
    filename: String,
    path: String,
    uploadDate: Date
});

// 设置文件上传
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// 处理文件上传
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const newFile = new File({
        filename: req.file.originalname,
        path: req.file.path,
        uploadDate: new Date()
    });

    newFile.save()
        .then(() => res.send('File uploaded successfully.'))
        .catch(err => {
            console.error('Error saving file to database:', err);
            res.status(500).send('Error uploading file: ' + err.message);
        });
});

// 获取文件列表
app.get('/files', (req, res) => {
    File.find({})
        .then(files => res.json(files))
        .catch(err => {
            console.error('Error fetching files:', err);
            res.status(500).send('Error fetching files: ' + err.message);
        });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});