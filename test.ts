import QueryBuilder from "@utils/database.ts";

const currVotes = await QueryBuilder
  .raw(`SELECT
                            count(*) as cnt
                        FROM votes
                        WHERE vote_name = 'foto-wedstrijd'
                          AND user_id = '632677231113666601'
                          AND YEAR(created_at) = YEAR(CURDATE())
                          AND MONTH(created_at) = MONTH(CURDATE());`)
  .execute();

console.log(currVotes[0].cnt);