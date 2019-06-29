require('dotenv').config();

const request = require('request');

// const IP_V6_PREFIX = '2604:a880:2:d0::21ef:800';
//                       2604:a880:2:d0::97  :5000

const { IP_V6_PREFIX } = process.env;

function getRandomRange(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

function getIpV6Address() {
  const suffix = getRandomRange(1, 16).toString(16);
  return IP_V6_PREFIX + suffix;
}

function httpGet(url, opts) {
  return new Promise((resolve, reject) => {
    opts.uri = url;

    if (IP_V6_PREFIX && IP_V6_PREFIX.length > 2) {
      opts.localAddress = getIpV6Address();
      opts.family = 6;
    }

    request(opts, (err, response, body) => {
      try {
        err ? reject(err) : resolve(JSON.parse(body));
      } catch (err) {
        err.statusCode = response.statusCode;
        err.response = response;
        err.body = body;
        reject(err);
      }
    });
  });
}

module.exports = { httpGet };