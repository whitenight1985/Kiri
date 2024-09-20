const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'mydb.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
      console.error('Error checking tables:', err);
    } else {
      console.log('Tables in database:', tables);
    }
  });

  db.all("PRAGMA table_info(files)", (err, columns) => {
    if (err) {
      console.error('Error checking files table structure:', err);
    } else {
      console.log('Structure of files table:', columns);
    }
  });
});

db.close((err) => {
  if (err) {
    console.error('Error closing database:', err.message);
  } else {
    console.log('Database check completed');
  }
});