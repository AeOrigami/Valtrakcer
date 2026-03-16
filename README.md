# Valtracker
Project for data management exam 

## ToDo : frontend

## ToDO : backend


## specify in the powerpoint
1. how i get the data from the api (3 tables)
2. how i add the userful data to the mmrhistory db while i was downloading the matches so every api call get informations from 1 table only
3. the query that i use for checking if i have all the matches of all the players
4. case insensitive index how i create it for seaching a player (https://www.mongodb.com/docs/manual/reference/collation/)
```javascript
use('valtracker');

// Create a new index in the collection.
db.getCollection('players')
  .createIndex(
    {
        tag: 1,
        name: 1
    }, {
        collation: { locale: 'en', strength: 2 },
         unique: true
    }
  );

```
5. how i ensure that every time the match are in order from the newer to the oldest