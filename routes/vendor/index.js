const dotenv = require('dotenv');
const express = require('express');
const mysql = require('mysql');
const fetch = require('node-fetch');
const async = require('async');

const router = express.Router();

const database = require('../../db');
const db = new database();

const fs = require('fs');
const fsP = fs.promises;

dotenv.config();

const CURRENT_TIMESTAMP = { toSqlString: function() { return 'CURRENT_TIMESTAMP()'; } };

router.get('/', async function(req, res, next) {
  const vendorHash = req.query.vendor || '2190858386';

  let tokens = await fsP.readFile('./cache/tokens.json');
      tokens = JSON.parse(tokens.toString());

  if (tokens) {
    let request = await fetch(`https://www.bungie.net/Platform/Destiny2/1/Profile/4611686018449662397/Character/2305843009260574394/Vendors/${vendorHash}/?components=300,301,302,304,305,400,401,402`, {
      method: 'get',
      headers: {
        Authorization: `Bearer ${tokens.access_token.value}`,
        'X-API-KEY': process.env.BUNGIE_API_KEY
      }
    });
    let response = await request.json();

    if (response.ErrorCode === 1) {

      let instances = {
        categories: response.Response.categories,
        itemComponents: response.Response.itemComponents,
        sales: response.Response.sales,
        vendor: response.Response.vendor
      }

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
