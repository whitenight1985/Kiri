const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'mydb.sqlite');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // 检查 type 列是否存在
  db.all("PRAGMA table_info(files)", (err, rows) => {
    if (err) {
      console.error('Error checking table structure:', err);
      return;
    }
    
    if (!rows || !rows.some(col => col.name === 'type')) {
      // 如果 type 列不存在，添加它
      db.run("ALTER TABLE files ADD COLUMN type TEXT", (err) => {
        if (err) {
          console.error('Error adding type column:', err);
        } else {
          console.log('Added type column to files table');
        }
      });
    } else {
      console.log('Type column already exists in files table');
    }
  });

  // 创建表（如果不存在）
  db.run(`CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    path TEXT,
    type TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

db.close((err) => {
  if (err) {
    console.error('Error closing database:', err.message);
  } else {
    console.log('Database initialized successfully');
  }
});