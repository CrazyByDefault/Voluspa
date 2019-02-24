var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var scrapeRouter = require('./routes/scrape');

var app = express();

const db = require('./db');

const member_controller = require('./controllers/member');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use('/', indexRouter);
app.use('/scrape', scrapeRouter);
app.use('/member/store', member_controller.MEMBER_STORE);

module.exports = app;
