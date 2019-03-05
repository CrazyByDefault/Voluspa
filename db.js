const dotenv = require('dotenv');
const mysql = require('mysql');

dotenv.config();

const defaultConfig = {
  host: 'localhost',
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
};

module.exports = class database {
  constructor(config = defaultConfig) {
    this.connection = mysql.createConnection(config);
  }
  query(sql, args) {
    return new Promise((resolve, reject) => {
      this.connection.query(sql, args, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }
  close() {
    return new Promise((resolve, reject) => {
      this.connection.end(err => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}
