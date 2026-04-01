import pymongo
from dotenv import load_dotenv
import os
import requests
load_dotenv(dotenv_path="src\\backend\\.env")


class db:

    #singleton pattern to avoid multiple endpoints to the database
    _instance = None
    def __new__(class_, *args, **kwargs):
        if not isinstance(class_._instance, class_):
            class_._instance = object.__new__(class_, *args, **kwargs)
        return class_._instance    

    def __init__(self):
        self.myclient=pymongo.MongoClient("mongodb://localhost:27017/")
        self.mydb=self.myclient["valtracker"]
        self.matchdb=self.mydb["matches"]
        self.mmrhistorydb=self.mydb["mmrhistory"]
        self.players=self.mydb["players"]
        self.apikey=os.environ.get("KEY") or os.environ.get("APIKEY")

    def refresh(self, puuid=os.environ.get("PUUID"), region="eu", platform="pc"):
        """"
        Refreshes the mmr history for a given player.
        This function retrieves the MMR history for a player using the provided PUUID, region, and platform.
        It checks if the player's MMR history is already stored in the database. If it is, it updates the history with any new games that are not already in the database. If the player is not in the database, it inserts a new record for the player and downloads the match data for all games in the history.
        Args:
            mmrhistorydb (pymongo.collection.Collection): The MongoDB collection for MMR history.
            puuid (str, optional): The PUUID of the player. Defaults to the value from the environment variable "PUUID".
            region (str, optional): The region of the player. Defaults to "eu".
            platform (str, optional): The platform of the player. Defaults to "pc".
        
        """
        
        if not puuid:
            return False

        url = f"https://api.henrikdev.xyz/valorant/v2/by-puuid/mmr-history/{region}/{platform}/{puuid}"
        
        response = requests.get(
        url,
        headers={"Authorization":self.apikey,"Accept":"*/*"})

        if response.status_code == 200:
            dat = response.json()
            puuid = dat["data"]["account"]["puuid"]
            #if the player is already in the db, if not , add the player to the db
            if self.mmrhistorydb.find_one({"_id": puuid}):
                #check if the game ids that the api rturns are in the db, if not 
                # add them to the db and downlad the match data for those games
                newhistory = dat["data"]["history"]
                oldhistory = self.mmrhistorydb.find_one({"_id": puuid}, {"history": 1}).get("history", [])
                old_ids = {match.get("match_id") for match in oldhistory}
                toinsert = [match for match in newhistory if match.get("match_id") and match.get("match_id") not in old_ids]
                if toinsert:
                    self.mmrhistorydb.update_one(
                        {"_id": puuid},
                        {
                            "$push": {
                                "history": {
                                    "$each": toinsert,
                                    "$sort": {"date": -1}
                                }
                            }
                        }
                    )
                for match in toinsert:
                        matchdata=self.downloadmatch(match["match_id"],region)
                        self.updatemmrhistory(matchdata, puuid)                    
            
            else:
                #insert the player and download the match data for all the games in the history
                self.mmrhistorydb.insert_one({"_id":puuid,
                                        "history":dat["data"]["history"]})
                
                for match in dat["data"]["history"]:

                        matchdata=self.downloadmatch(match["match_id"],region)
                        #function that adds the date, kda, finalscore, haswon and agentimg to the mmrhistorydb match 
                        self.updatemmrhistory(matchdata, puuid)        
        else:
            print(f"Error: {response.status_code} - {response.text}")
            return False
        
        return True

    def updatemmrhistory(self, matchdata, puuid):
        if matchdata==False:
            print("Error: Match data is False. Skipping update.")
            return None

        if not self.players.find_one({"_id":puuid}):
            print("player not inside the database")
            return None
        for player in matchdata['players']:
            if player['puuid']==puuid:
                team=player['team_id']
                if team=="Red":
                    team=0
                else: team=1
                kills=player['stats']['kills']
                deaths=player['stats']['deaths']
                assists=player['stats']['assists']
                haswon=matchdata['teams'][team]['won'] 
                finalscore_won = matchdata['teams'][team]['rounds']['won']
                finalscore_lost = matchdata['teams'][team]['rounds']['lost']
                self.mmrhistorydb.update_one({"_id":puuid,"history.match_id":matchdata["metadata"]["match_id"]},
                                        {"$set":{"history.$.stats.kills":kills,
                                                "history.$.stats.deaths":deaths,
                                                "history.$.stats.assists":assists,
                                                "history.$.stats.haswon":haswon,
                                                "history.$.stats.finalscore_won":finalscore_won,
                                                "history.$.stats.finalscore_lost":finalscore_lost}})
                break
   
    def downloadmatch(self,matchid,region="eu"):
        """
        Downloads match data for a given match ID and region, and stores it in the match database.
        This function retrieves match data from the API using the provided match ID and region. If the
        API call is successful, it stores the match data in the match database. If the API call fails, it prints an error message.
        Args:
            matchdb (pymongo.collection.Collection): The MongoDB collection for match data.
            matchid (str): The ID of the match to be downloaded.
            region (str): The region of the match to be downloaded.
        """
         
        url=f"https://api.henrikdev.xyz/valorant/v4/match/{region}/{matchid}"
        response = requests.get(
        url,
        headers={"Authorization":self.apikey,"Accept":"*/*"})
        if response.status_code == 200:
            dat = response.json()
            return dat["data"]
        else:
            print(f"Error: {response.status_code} - {response.text}")
            return False
       
    def downloadmmrhistory(self,puuid,region="eu",platform="pc"):
        """
        Downloads MMR history data for a given PUUID, region, and platform.
        This function retrieves MMR history data from the API using the provided PUUID, region, and platform. If the API call is successful, it returns the MMR history data. If the API call fails, it prints an error message and returns False.
        Args:
            puuid (str): The PUUID of the player to be downloaded.
            region (str, optional): The region of the player to be downloaded. Defaults to "eu".
            platform (str, optional): The platform of the player to be downloaded. Defaults to "pc".
        Returns:
            dict or bool: The MMR history data if the API call is successful, or False if the API call fails.
        """
        url=f"https://api.henrikdev.xyz/valorant/v2/by-puuid/mmr-history/{region}/{platform}/{puuid}"
        response = requests.get(
        url,
        headers={"Authorization":self.apikey,"Accept":"*/*"})
        if response.status_code == 200:
            dat = response.json()
            return dat["data"]
        else:
            print(f"Error: {response.status_code} - {response.text}")
            return False

    def downloadplayerdata(self,puuid):
        """
        Downloads player data for a given PUUID, region, and platform.
        This function retrieves player data from the API using the provided PUUID, region, and platform. If the API call is successful, it returns the player data. If the API call fails, it prints an error message and returns False.
        Args:
            puuid (str): The PUUID of the player to be downloaded.
            region (str, optional): The region of the player to be downloaded. Defaults to "eu".
            platform (str, optional): The platform of the player to be downloaded. Defaults to "pc".
        Returns:
            dict or bool: The player data if the API call is successful, or False if the API call fails.
        """
        url=f"https://api.henrikdev.xyz/valorant/v2/by-puuid/account/{puuid}"
        response = requests.get(
        url,
        headers={"Authorization":self.apikey,"Accept":"*/*"})
        if response.status_code == 200:
            dat = response.json()
            return dat["data"]
        else:
            print(f"Error: {response.status_code} - {response.text}")
            return False
        
    def getmatch(self,matchid):
        """
        Retrieves match data for a given match ID from the match database.
        This function queries the match database for a document with the specified match ID. If a document is found, it returns the match data. If no document is found, it returns None.
        Args:
            matchid (str): The ID of the match to be retrieved.
        Returns:
            dict or None: The match data if found, or None if no document with the specified match ID exists in the database.
        """
        return self.matchdb.find_one({"_id":matchid})

    def getmmrhistory(self,puuid):
        """
        Retrieves the MMR history for a given player from the MMR history database.
        This function queries the MMR history database for a document with the specified PUUID. If a document is found, it returns the MMR history data. If no document is found, it returns None.
        Args:
            puuid (str): The PUUID of the player whose MMR history is to be retrieved.
        Returns:
            dict or None: The MMR history data if found, or None if no document with the specified PUUID exists in the database.
        """
        doc = self.mmrhistorydb.find_one({"_id": puuid}, {"history": 1})
        if not doc:
            return None
        doc["history"] = sorted(doc.get("history", []), key=lambda entry: entry.get("date", ""), reverse=True)
        return doc

    def floodupdatemmrhistory(self,matchid):
        """
        Updating all of the mmrhistory of all the players 
        """
        matchdata= self.getmatch(matchid)
        players=matchdata["data"]["players"]
        
        for player in players:
            puuid=(player["puuid"])
            self.updatemmrhistory(matchdata["data"],puuid)
            
    def insertmatch(self,matchdata):

        if matchdata is None or matchdata == False:
            print("Error: Match data is None or False. Skipping insert.")
            return None
        match_id = matchdata["metadata"]["match_id"]

        if not self.matchdb.find_one({"_id": match_id}):
            return self.matchdb.insert_one({"_id": match_id, "data": matchdata})
        else:
            print(f"Match with ID {match_id} already exists in the database. Skipping insert.")
            return None
    
    def searchplayer(self,name,tag):
        return self.players.find_one(
    {"tag": tag, "name": name},
    collation={"locale": "en", "strength": 2}
)
    def getplayer(self, puuid):

        return self.players.find_one({"_id": puuid})

    def insertplayer(self,puuid,data):
        
        """
        Inserts player data into the players database.
        This function takes a player's PUUID and player data as input and inserts it into the players database. The PUUID is used as the document ID in the database, and the fields are stored as specified.
        Args:
            puuid (str): The PUUID of the player to be inserted.
            data (dict): A dictionary containing the player's data, including region, account level, tag, name, and card ID.
        Returns:
            pymongo.results.InsertOneResult: The result of the insert operation, which includes information about the inserted document.
        """
        if not self.players.find_one({"_id": puuid}):
            return self.players.insert_one({"_id":puuid,
                             "region":data["region"],
                             "account_level":data["account_level"],
                             "tag":data["tag"],
                             "name":data["name"],
                             "card":data["card"]})
        else:
            print(f"Player with PUUID {puuid} already exists in the database. Skipping insert.")
            return None
        
    def insertmmrhistory(self,history,puuid):
        if not self.mmrhistorydb.find_one({"_id": puuid}):
            return self.mmrhistorydb.insert_one({"_id":puuid,"history":history})
        else:
            print(f"MMR history for PUUID {puuid} already exists in the database. Skipping insert.")
            return None

    def downloadandstoreplayer(self, name, tag, region="eu", platform="pc"):
        url = f"https://api.henrikdev.xyz/valorant/v2/mmr-history/{region}/{platform}/{name}/{tag}"
        response = requests.get(url, headers={"Authorization": self.apikey, "Accept": "*/*"})
        if response.status_code != 200:
            print(f"Error: {response.status_code} - {response.text}")
            return False
        payload = response.json().get("data", {})
        history = payload.get("history", [])
        account = payload.get("account", {})
        puuid = account.get("puuid")
        if not puuid:
            return False

        full_player_data = self.downloadplayerdata(puuid)
        if not full_player_data:
            return False
        self.insertplayer(puuid, full_player_data)

        existing_history_doc = self.getmmrhistory(puuid)
        if not existing_history_doc:
            self.insertmmrhistory(history, puuid)
        else:
            existing_ids = {match.get("match_id") for match in existing_history_doc.get("history", [])}
            to_insert = [match for match in history if match.get("match_id") and match.get("match_id") not in existing_ids]
            if to_insert:
                self.mmrhistorydb.update_one(
                    {"_id": puuid},
                    {
                        "$push": {
                            "history": {
                                "$each": to_insert,
                                "$sort": {"date": -1}
                            }
                        }
                    }
                )

        # Download all matches from history and update player stats in mmr history.
        for match in history:
            match_id = match.get("match_id")
            if not match_id:
                continue
            match_data = self.downloadmatch(match_id, region)
            self.insertmatch(match_data)
            self.updatemmrhistory(match_data, puuid)

        return True

    def downloadandstoreplayerbypuuid(self, puuid, region="eu", platform="pc"):
        if not puuid:
            return False

        full_player_data = self.downloadplayerdata(puuid)
        if not full_player_data:
            return False

        history_payload = self.downloadmmrhistory(puuid, region, platform)
        if not history_payload:
            return False

        history = history_payload.get("history", [])
        self.insertplayer(puuid, full_player_data)

        existing_history_doc = self.getmmrhistory(puuid)
        if not existing_history_doc:
            self.insertmmrhistory(history, puuid)
        else:
            existing_ids = {match.get("match_id") for match in existing_history_doc.get("history", [])}
            to_insert = [match for match in history if match.get("match_id") and match.get("match_id") not in existing_ids]
            if to_insert:
                self.mmrhistorydb.update_one(
                    {"_id": puuid},
                    {
                        "$push": {
                            "history": {
                                "$each": to_insert,
                                "$sort": {"date": -1}
                            }
                        }
                    }
                )

        for match in history:
            match_id = match.get("match_id")
            if not match_id:
                continue
            match_data = self.downloadmatch(match_id, region)
            self.insertmatch(match_data)
            self.updatemmrhistory(match_data, puuid)

        return True

    def gettop10players(self):
        pipeline = [
    {
        '$unwind': '$history'
    }, {
        '$group': {
            '_id': '$_id', 
            'history': {
                '$topN': {
                    'output': '$history', 
                    'sortBy': {
                        'history.stats.kills': -1
                    }, 
                    'n': 10
                }
            }
        }
    }, {
        '$addFields': {
            'Sumofkills': {
                '$sum': '$history.stats.kills'
            }
        }
    }, {
        '$sort': {
            'Sumofkills': -1
        }
    }, {
        '$limit': 10
    }, {
        '$lookup': {
            'from': 'players', 
            'localField': '_id', 
            'foreignField': '_id', 
            'as': 'stats'
        }
    }
]
        return list(self.mmrhistorydb.aggregate(pipeline))
    
    def getmostplayedwith(self, puuid):
        pipeline = [
    {
        '$match': {
            'data.players.puuid': '082e989c-c557-5303-a5f5-0df21787ea28'
        }
    }, {
        '$unwind': '$data.players'
    }, {
        '$match': {
            'data.players.puuid': {
                '$ne': '082e989c-c557-5303-a5f5-0df21787ea28'
            }
        }
    }, {
        '$group': {
            '_id': {
                'puuid': '$data.players.puuid', 
                'name': '$data.players.name', 
                'tag': '$data.players.tag'
            }, 
            'count': {
                '$sum': 1
            }
        }
    }, {
        '$sort': {
            'count': -1
        }
    }, {
        '$group': {
            '_id': '$count', 
            'players': {
                '$push': {
                    'puuid': '$_id.puuid', 
                    'name': '$_id.name', 
                    'tag': '$_id.tag', 
                    'count': '$count'
                }
            }
        }
    }, {
        '$sort': {
            '_id': -1
        }
    }, {
        '$unwind': '$players'
    }, {
        '$limit': 5
    }, {
        '$replaceWith': '$players'
    }
]
        return list(self.matchdb.aggregate(pipeline))

    def hideindex(self, colleciton, indexname):
        self.mydb.command({"collMod": colleciton, "index": {"name": indexname, "hidden": True}})

    def enableindex(self, colleciton, indexname):
        self.mydb.command({"collMod": colleciton, "index": {"name": indexname, "hidden": False}})

    def mostplayedagents(self):
        pipeline = [
    {
        '$unwind': '$data.players'
    }, {
        '$group': {
            '_id': '$data.players.agent.name', 
            'count': {
                '$sum': 1
            }
        }
    }, {
        '$sort': {
            'count': -1
        }
    }
]
        return list(self.matchdb.aggregate(pipeline))

    def getmatchesbtwdates(self, start_date, end_date):
        return self.matchdb.find(filter={'data.metadata.started_at': {'$gte': start_date, '$lte': end_date}}, projection={'_id': 1, "data.metadata.started_at": 1})

if __name__== "__main__":
    database=db()
    
#    print(database.searchplayer("Faraday","1709"))
#    print(database.getplayersfromamatch("da05c50c-8151-46aa-af27-3fb04da316a2"))
    print(database.getmmrhistory("86995d18-3176-5d95-93f4-041c22b5bc72"))