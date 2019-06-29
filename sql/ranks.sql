TRUNCATE TABLE voluspa.ranks;
INSERT INTO voluspa.ranks (
membershipType, membershipId, 
triumphScoreRank, collectionTotalRank, 
timePlayedRank
) (
SELECT 
  membershipType, 
  membershipId, 
  triumphScoreRank, 
  collectionTotalRank, 
  timePlayedRank 
FROM 
  (
  SELECT 
    *, 
    DENSE_RANK() OVER (
    ORDER BY 
      triumphScore DESC
    ) triumphScoreRank, 
    DENSE_RANK() OVER (
    ORDER BY 
      collectionTotal DESC
    ) collectionTotalRank, 
    DENSE_RANK() OVER (
    ORDER BY 
      timePlayed DESC
    ) timePlayedRank 
  FROM 
    members 
  WHERE triumphScore IS NOT NULL
  ORDER BY 
    triumphScoreRank ASC, 
    displayName ASC
  ) R
);
UPDATE voluspa.status SET lastRanked = CURRENT_TIMESTAMP() WHERE id = '1';