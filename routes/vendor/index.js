const dotenv = require('dotenv');
const express = require('express');
const mysql = require('mysql');
const async = require('async');

const { httpGet } = require('../../http');

const router = express.Router();

const db = require('../../db');


const fs = require('fs');
const fsP = fs.promises;

dotenv.config();

async function getDestiny(pathname, opts = {}, postBody) {
  const hostname = opts.useStatsEndpoint
    ? `https://stats.bungie.net`
    : 'https://www.bungie.net';

  let url = `${hostname}/Platform${pathname}`;
  url = url.replace('/Platform/Platform/', '/Platform/');

  opts.headers = opts.headers || {};
  opts.headers['x-api-key'] = process.env.BUNGIE_API_KEY;

  if (opts.useAccessToken) {
    if (pathname === '/App/OAuth/Token/') {
      opts.headers['Authorization'] = `Basic ${Buffer.from(`${process.env.BUNGIE_CLIENT_ID}:${process.env.BUNGIE_CLIENT_SECRET}`).toString('base64')}`;
    } else {
      let tokens = await fsP.readFile('./cache/tokens.json');
      tokens = JSON.parse(tokens.toString());

      console.log(tokens.access_token)

      opts.headers['Authorization'] = `Bearer ${tokens.access_token.value}`;
    }
  }

  if (postBody) {
    opts.method = 'POST';
    if (typeof postBody === 'string') {
      opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      opts.body = postBody;
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(postBody);
    }
  }

  console.log(url, opts)

  return httpGet(url, opts).then(resp => {
    return resp;
  });
}

const CURRENT_TIMESTAMP = { toSqlString: function() { return 'CURRENT_TIMESTAMP()'; } };

router.get('/', async function(req, res, next) {
  const vendorHash = req.query.vendor || '2190858386';

  let tokens = await fsP.readFile('./cache/tokens.json');
      tokens = JSON.parse(tokens.toString());

  if (tokens) {
    // let request = await fetch(`https://www.bungie.net/Platform/Destiny2/1/Profile/4611686018449662397/Character/2305843009260574394/Vendors/${vendorHash}/?components=300,301,302,304,305,400,401,402`, {
    //   method: 'get',
    //   headers: {
    //     Authorization: `Bearer ${tokens.access_token.value}`,
    //     'X-API-KEY': process.env.BUNGIE_API_KEY
    //   }
    // });

    let response = await getDestiny(`/Destiny2/1/Profile/4611686018449662397/Character/2305843009260574394/Vendors/${vendorHash}/?components=300,301,302,304,305,400,401,402`, { useAccessToken: true });

    if (response.ErrorCode === 1) {

      let instances = {
        categories: response.Response.categories,
        itemComponents: response.Response.itemComponents,
        sales: response.Response.sales,
        vendor: response.Response.vendor
      }

      res.status(200).send({
        ErrorCode: 1,
        Message: 'VOLUSPA',
        Response: instances
      });
  
      return;

      let sql = "SELECT * FROM `directus_tc01`.`destiny_2_xur_sales` ORDER BY `directus_tc01`.`destiny_2_xur_sales`.`season` DESC, `directus_tc01`.`destiny_2_xur_sales`.`week` DESC LIMIT 1";
      let inserts = [];
      sql = mysql.format(sql, inserts);

      let result = await db.query(sql);

      let latest = result.length === 1 ? result[0] : false;

      let last5DaysTime = new Date().getTime() - 518400000;
      let latestTime = new Date(latest.datetime).getTime();

      if (latest && last5DaysTime > latestTime) {

        let sql = "INSERT INTO `directus_tc01`.`destiny_2_xur_sales` (`id`, `season`, `week`, `datetime`, `location`, `iteration`, `instances`) VALUES (NULL, ?, ?, ?, ?, ?, ?)";
        let inserts = [latest.season, latest.week + 1, CURRENT_TIMESTAMP, '0', latest.iteration + 1, JSON.stringify(instances)];
        sql = mysql.format(sql, inserts);

        let result = await db.query(sql);

        let insertId = result.insertId;

        //

        let itemHashes = Object.values(response.Response.sales.data).map(s => s.itemHash);

        console.log(Object.values(response.Response.sales.data), itemHashes);

        var q = async.queue(async function(task, callback) {

          console.log('test')

          let sql = "INSERT INTO `directus_tc01`.`destiny_2_xur_item_sales`(`id`, `item_id`, `sales_id`) VALUES (NULL, (SELECT `id` FROM `directus_tc01`.`destiny_2_xur_items` WHERE `directus_tc01`.`destiny_2_xur_items`.`hash` = ?), ?)";
          let inserts = [task.itemHash, insertId];
          sql = mysql.format(sql, inserts);

          let result = await db.query(sql);

          console.log(result)
        
        }, 10);
    
        itemHashes.forEach(m => {
          q.push({
            itemHash: m
          });
        });

        q.drain = function() {
          res.status(200).send({
            ErrorCode: 1,
            Message: 'VOLUSPA',
          });
        }



      } else {
        
        // up to date already

        res.status(200).send({
          ErrorCode: 1,
          Message: 'VOLUSPA',
          Response: latest
        });

      }

      
    } else {
      res.status(500).send({
        ErrorCode: response.ErrorCode,
        Message: 'VOLUSPA',
        Response: response
      });
    }
  } else {
    res.status(500).send({
      ErrorCode: 500,
      Message: 'VOLUSPA'
    });
  }
});

module.exports = router;
