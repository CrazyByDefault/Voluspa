const dotenv = require('dotenv');
const mysql = require('mysql');

dotenv.config();

const defaultConfig = {
  host: 'localhost',
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  supportBigNumbers: true
};

module.exports = class database {
  constructor(config = defaultConfig) {
    this.connection;
    this.connect(config);
  }

  connect(config) {
    this.connection = mysql.createConnection(config); // Recreate the connection, since
    // the old one cannot be reused.

    this.connection.connect(function(err) {
      // The server is either down
      if (err) {
        // or restarting (takes a while sometimes).
        console.log('error when connecting to db:', err);
        setTimeout(this.connect, 2000); // We introduce a delay before attempting to reconnect,
      } // to avoid a hot loop, and to allow our node script to
    }); // process asynchronous requests in the meantime.
    // If you're also serving http, display a 503 error.
    this.connection.on('error', function(err) {
      console.log('db error', err);
      if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        // Connection to the MySQL server is usually
        this.connect(); // lost due to either server restart, or a
      } else {
        // connnection idle timeout (the wait_timeout
        throw err; // server variable configures this)
      }
    });
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
};
