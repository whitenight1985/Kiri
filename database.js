const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server_data.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('数据库连接失败:', err.message);
    } else {
        console.log('成功连接到数据库');
        initDatabase();
    }
});

function initDatabase() {
    db.run(`CREATE TABLE IF NOT EXISTS servers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        latitude REAL,
        longitude REAL,
        status TEXT
    )`, (err) => {
        if (err) {
            console.error('创建 servers 表失败:', err.message);
        } else {
            console.log('servers 表创建成功或已存在');
            insertInitialData();
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT,
        size INTEGER,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('创建 files 表失败:', err.message);
        } else {
            console.log('files 表创建成功或已存在');
        }
    });
}

function insertInitialData() {
    const initialServers = [
        {name: '北京主服务器', latitude: 39.9042, longitude: 116.4074, status: '正常'},
        {name: '上海备用服务器', latitude: 31.2304, longitude: 121.4737, status: '正常'},
        {name: '深圳数据中心', latitude: 22.5431, longitude: 114.0579, status: '维护中'},
        {name: '成都边缘节点', latitude: 30.5728, longitude: 104.0668, status: '正常'},
        {name: '广州CDN节点', latitude: 23.1291, longitude: 113.2644, status: '正常'}
    ];

    const stmt = db.prepare('INSERT OR IGNORE INTO servers (name, latitude, longitude, status) VALUES (?, ?, ?, ?)');
    initialServers.forEach(server => {
        stmt.run(server.name, server.latitude, server.longitude, server.status);
    });
    stmt.finalize();
}

function getAllServers(callback) {
    db.all('SELECT * FROM servers', [], (err, rows) => {
        if (err) {
            callback(err, null);
        } else {
            callback(null, rows);
        }
    });
}

function addFile(filename, size, callback) {
    console.log('Adding file to database:', filename, size);
    const sql = 'INSERT INTO files (filename, size) VALUES (?, ?)';
    db.run(sql, [filename, size], function(err) {
        if (err) {
            console.error('Error adding file to database:', err);
            callback(err);
        } else {
            console.log('File added to database, ID:', this.lastID);
            callback(null);
        }
    });
}

function getAllFiles(callback) {
    db.all('SELECT * FROM files', [], callback);
}

module.exports = {
    getAllServers,
    addFile,
    getAllFiles
};