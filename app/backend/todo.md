issue a default avatar
issue a match history , after you implement the game

edit this controller : async UpdateMyProfile(request, reply), model: async user_update_profile(db, user_id, { name, avatar })
remove this controller : async DeleteUser(request, reply)