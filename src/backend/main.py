from flask import Flask, jsonify, current_app
from flask_restful import Resource, Api
from flask_cors import CORS
from db import db
app = Flask(__name__)
CORS(app)
api = Api(app)
database= db()
class GetProfile(Resource):
    def get(self, username):
        nametag=str(username).strip().split("#")
        if len(nametag)!=2:
            return {"error": "Invalid username format. Expected 'name#tag'."}, 400
        
        name, tag = nametag
        player = database.searchplayer(name, tag)
        if not player:
            return {"error": "User not found"}, 404
        mmrhistory = database.getmmrhistory(player["_id"])
        
        if player:
            return jsonify(player, mmrhistory)
        else:
            return {"error": "User not found"}, 404


class DownloadMatch(Resource):
    def get(self, match_id):
        matchdata=database.downloadmatch(match_id)
        database.insertmatch(matchdata)
        database.floodupdatemmrhistory(match_id)
        return {'message': ' Match added'}, 200


class GetMatch(Resource):
    def get(self, match_id):
        match = database.getmatch(match_id)
        if not match:
            return {"error": "Match not found"}, 404
        return jsonify(match["data"])

class RefreshProfile(Resource):
    def post(self, puuid):
        if not puuid:
            return {"error": "PUUID is required."}, 400
        if database.getplayer(str(puuid).strip()) is None:
            return {"error": "Player not found."}, 404
        
        success = database.refresh(puuid=puuid, region="eu", platform="pc")
        if not success:
            return {"error": "Unable to refresh player data."}, 500

        return {"message": "Player data refreshed successfully."}, 200

class PlayerExists(Resource):
    def get(self, puuid):
        player = database.getplayer(str(puuid).strip())
        return {"exists": bool(player)}, 200


class DownloadPlayer(Resource):
    def get(self, puuid):
        success = database.downloadandstoreplayerbypuuid(str(puuid).strip())
        if not success:
            return {"error": "Unable to download player data."}, 500

        return {"message": "Player downloaded with mmr history and matches."}, 200

class Top10Players(Resource):
    def get(self):
        players = database.gettop10players()
        return jsonify(players)

class Hello(Resource):
    def get(self):
        
        return jsonify({'message': 'hello world'})

class Square(Resource):
    def get(self, num):
        return jsonify({'square': num ** 2})

api.add_resource(Hello, '/')
api.add_resource(Square, '/square/<int:num>')
api.add_resource(GetProfile, '/profile/<string:username>')
api.add_resource(DownloadMatch, '/downloadMatch/<string:match_id>')
api.add_resource(GetMatch, '/match/<string:match_id>')
api.add_resource(PlayerExists, '/playerExists/<string:puuid>')
api.add_resource(DownloadPlayer, '/downloadPlayer/<string:puuid>')
api.add_resource(RefreshProfile, '/refresh/<string:puuid>')
api.add_resource(Top10Players, '/top10Players')
if __name__ == '__main__':
    app.run(port=5110, debug=True)
    