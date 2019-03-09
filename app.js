var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var testRouter = require('./routes/test');

var leaderboardRouter = require('./routes/leaderboard');
var statusRouter = require('./routes/status');
var scrapeRouter = require('./routes/scrape');
var memberRouter = require('./routes/member');
var statsRouter = require('./routes/statistics');

var app = express();

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
app.use('/test', testRouter);

app.use('/leaderboard', leaderboardRouter);
app.use('/status', statusRouter);
app.use('/member', memberRouter);
app.use('/scrape', scrapeRouter);
app.use('/statistics', statsRouter);

module.exports = app;
