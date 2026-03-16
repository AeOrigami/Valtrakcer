from db import db  
from dotenv import load_dotenv
import os
import time

NPLAYERS=1000
load_dotenv(dotenv_path="src\\backend\\.env")


def recursivefill_init():
    database=db()
    count=0
    puuid=os.getenv("PUUID")
    known_players=set(database.players.distinct("_id"))
    known_matches=set(database.matchdb.distinct("_id"))
    known_mmrhistories=set(database.mmrhistorydb.distinct("_id"))

    visited=set()
    return recursivefill(database,count,puuid,known_players,visited,known_matches,known_mmrhistories)
    

def recursivefill(database,count,puuid,known_players,visited,known_matches,known_mmrhistories):

        if puuid in visited:
            print(f"Already visited PUUID {puuid}. Skipping to avoid cycles.")
            return count
        visited.add(puuid)

        if count >= NPLAYERS:
            print(f"Reached the limit of {NPLAYERS} players. Stopping.")
            return count

        # Use cached player data when available; call API only for players not in DB.
        data = None
        if puuid not in known_players:
            time.sleep(2)
            data=database.downloadplayerdata(puuid)
            if data:
                insert_result = database.insertplayer(puuid,data)
                if insert_result is not None:
                    known_players.add(puuid)
                    count += 1
            else:
                print(f"Failed to download data for PUUID {puuid}. Stopping branch.")
                return count
        else:
            print(f"PUUID {puuid} already in database. Skipping API call.")
        if count >= NPLAYERS:
            print(f"Reached the limit of {NPLAYERS} players. Stopping.")
            return count

        # Prefer local history first to avoid unnecessary API calls.
        history_doc = database.mmrhistorydb.find_one({"_id": puuid}, {"history": 1})
        if history_doc and "history" in history_doc:
            history = history_doc["history"]
        else:
            time.sleep(2)
            print(f"downloading mmrhistory for PUUID {puuid}")
            mmr_history=database.downloadmmrhistory(puuid)
            if not mmr_history or "history" not in mmr_history:
                print(f"Failed to download MMR history for PUUID {puuid}. Stopping branch.")
                return count
            history = mmr_history["history"]
            database.insertmmrhistory(history, puuid)

        print(f"Processing player {puuid}")
        players_lists=[]
        match_ids=[match["match_id"] for match in history]

        # Identify matches that need to be loaded from DB
        matches_to_load = [mid for mid in match_ids if mid in known_matches]
        
        # Batch load cached matches from DB
        cached_matches={doc["_id"]: doc["data"] for doc in database.matchdb.find(
            {"_id": {"$in": matches_to_load}},
            {"data": 1}
        )}

        for match in history:
            matchid=match["match_id"]
            if matchid in known_matches:
                # Load from cache if not already loaded
                if matchid not in cached_matches:
                    match_doc = database.matchdb.find_one({"_id": matchid}, {"data": 1})
                    if match_doc and "data" in match_doc:
                        cached_matches[matchid] = match_doc["data"]
                match_data = cached_matches.get(matchid)
            else:
                time.sleep(5)
                print(f"downloading match data for match {matchid}")
                match_data=database.downloadmatch(matchid)
                if match_data:
                    database.insertmatch(match_data)
                    cached_matches[matchid]=match_data
                    known_matches.add(matchid)  # Update the global list

            if not match_data:
                continue

            # Skip update if this history item already has computed stats.
            if "stats" not in match:
                print(f"updating mmrhistory for PUUID {puuid} with match {matchid}")
                database.updatemmrhistory(match_data, puuid)

            players_lists.append(match_data["players"])
        

        for players in players_lists:
            count +=1
            for player in players:
                if count >= NPLAYERS:
                    print(f"Reached the limit of {NPLAYERS} players. Stopping.")
                    return count
                next_puuid = player["puuid"]
                if next_puuid!=puuid and next_puuid not in known_players and next_puuid not in visited:
                    print(f"Recursively filling data for PUUID {next_puuid}")
                    count = recursivefill(database,count,next_puuid,known_players,visited,known_matches,known_mmrhistories)
                    if count >= NPLAYERS:
                        return count

        return count


if __name__ == "__main__":
    recursivefill_init()