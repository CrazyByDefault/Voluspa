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

function httpGet(url, baseOpts = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      method: 'GET',
      uri: url
    };

    if (IP_V6_PREFIX && IP_V6_PREFIX.length > 2) {
      opts.localAddress = getIpV6Address();
      opts.family = 6;
    }

    if (baseOpts.headers) {
      opts.headers = baseOpts.headers;
    }

    request(opts, (err, response, body) => {
      try {
        err ? reject(err) : resolve(JSON.parse(body));
      } catch (err) {
        err.response = response;
        err.body = body;
        reject(err);
      }
    });
  });
}

module.exports = { httpGet };