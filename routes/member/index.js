const express = require('express');
const mysql = require('mysql');
const router = express.Router();

const db = require('../../db');

router.post('/store', async function(req, res, next) {

  try {
    let sql = "SELECT * FROM members WHERE `membershipType` = ? AND `membershipId` = ?";
    let inserts = [req.body.membershipType, req.body.membershipId];
    sql = mysql.format(sql, inserts);

    db.query(sql, function (error, rows, fields) {
      if (error) {
        console.log(error);
        return;
      }

      if (rows.length === 0) {
        let sql = "INSERT INTO `members` (`id`, `membershipType`, `membershipId`) VALUES (NULL, ?, ?)";
        let inserts = [req.body.membershipType, req.body.membershipId];
        sql = mysql.format(sql, inserts);

        db.query(sql, function (error, rows, fields) {
          if (error) {
            console.log(error);
            return;
          }
        
          res.status(200).send({ Message: 'Hi friend' });
          return;
        });
      } else {
        res.status(200).send({ Message: 'Welcome back' });
        return;
      }
    });

  
  } catch (e) {
    console.log(e);
  }

});

// router.get('/rank', async function(req, res, next) {
//   console.log(req.query);

//   let limit = parseInt(req.query.limit, 10) || 10;
//   let offset = parseInt(req.query.offset, 10) || 0;

//   let membershipType = '1';
//   let membershipId = '4611686018449662397';

//   let sort = req.query.sort || 'triumphScore';

//   try {
//     //let result = await Profile.find().sort( { [sort]: -1 } ).limit(limit).skip(offset);

//     let member;
//     let rank = 0;

//     // let profiles = await Profile.find().sort( { [sort]: -1 } );

//     let profiles = await Profile.aggregate([
//       { $sort: { [sort]: -1 } },
//       {
//         $project: {
//           triumphScore: true,
//           ranking: {
//             $divide: ['$triumphScore', '$triumphScore']
//           }
//         }
//       },
//       { $sort: { ranking: 1 } }
//     ]);

//     console.log(profiles[100])

//     res.status(200).send({
//       ErrorCode: 1,
//       Message: 'VOLUSPA',
//       Response: {
        
//       }
//     });
//   } catch (e) {
//     console.error(e);

//     res.status(200).send({
//       ErrorCode: 500,
//       Message: 'VOLUSPA',
//       Response: e
//     });
//   }
// });

module.exports = router;
