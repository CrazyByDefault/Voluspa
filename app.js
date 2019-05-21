var express = require('express');
var path = require('path');
var cors = require('cors');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var oauthRouter = require('./routes/oauth');

var scrapeRouter = require('./routes/scrape');
var generateRouter = require('./routes/generate');

var memberRouter = require('./routes/member');
var statsRouter = require('./routes/statistics');
var vendorRouter = require('./routes/vendor');

var leaderboardsRouter = require('./routes/leaderboards');

var app = express();

app.use(cors());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");  
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use('/', indexRouter);
app.use('/oauth', oauthRouter);

app.use('/scrape', scrapeRouter);
app.use('/generate', generateRouter);

app.use('/member', memberRouter);
app.use('/statistics', statsRouter);
app.use('/vendor', vendorRouter);

app.use('/leaderboards', leaderboardsRouter);

module.exports = app;
