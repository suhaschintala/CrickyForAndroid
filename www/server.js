var express = require('express')
var app = express()
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');

var players = ["bot"]
var games = []

app.use(express.static(__dirname));
io.on('connection', function (socket){
    // console.log("HEY!! I connected "+socket.id)

    socket.on('disconnect', function () {

        for(var i=0;i<socket.rooms.length;i++){
            io.sockets.in(socket.rooms[i]).emit('user_disconnected',{'hi':'bye'})
        }

    });

    socket.on('register_me', function (data){
        // console.log(data)
        players.push(data)
        socket.emit('registered_me', {'name':players.length-1})
    })

    socket.on('game_over', function (data){
        // if hack needed
        io.sockets.in('ha'+data.id).emit('game_ended', data)
    })

    socket.on('bat_number',function (data){
        // console.log('taka -- '+'user : '+players[data.pid])
        var gameObj = data.gameObj
        var number = data.number
        var curr_game = games[gameObj.id]
        curr_game.bat_number = number
        if(curr_game.bowl_number!=0){
            process_curr_game_obj(gameObj.id)
            io.sockets.to('ha'+gameObj.id).emit('send_gameObj', curr_game)
        }
        else {
            if(curr_game.isTeamABatting&&curr_game.teamB.players[curr_game.curr_bowl].isBot){
                rnd = Math.floor(Math.random()*6)+1
                curr_game.bowl_number = rnd
                process_curr_game_obj(gameObj.id)
                io.sockets.to('ha'+gameObj.id).emit('send_gameObj', curr_game)
            }
            else if(!curr_game.isTeamABatting&&curr_game.teamA.players[curr_game.curr_bowl].isBot){
                rnd = Math.floor(Math.random()*6)+1
                curr_game.bowl_number = rnd
                process_curr_game_obj(gameObj.id)
                io.sockets.to('ha'+gameObj.id).emit('send_gameObj', curr_game)
            }
        }
    })

    socket.on('bowl_number', function (data){
        // console.log('tiki -- '+'user : '+players[data.pid])
        // console.log('---bowl_num---')
        // console.log(data)
        var gameObj = data.gameObj
        var number = data.number
        var curr_game = games[data.gameObj.id]
        curr_game.bowl_number = number
        if(curr_game.bat_number!=0){
            process_curr_game_obj(gameObj.id)
            io.sockets.to('ha'+gameObj.id).emit('send_gameObj', curr_game)
        }
        else {
            // console.log("hehe")
            // console.log(curr_game.teamA.players[curr_game.curr_bat].isBot+' -- '+ curr_game.isTeamABatting)
            if(curr_game.isTeamABatting&&curr_game.teamA.players[curr_game.curr_bat].isBot){
                rnd = Math.floor(Math.random()*6)+1
                curr_game.bat_number = rnd
                process_curr_game_obj(gameObj.id)
                io.sockets.to('ha'+gameObj.id).emit('send_gameObj', curr_game)
            }
            else if((!curr_game.isTeamABatting)&&curr_game.teamB.players[curr_game.curr_bat].isBot){
                rnd = Math.floor(Math.random()*6)+1
                curr_game.bat_number = rnd
                process_curr_game_obj(gameObj.id)
                io.sockets.to('ha'+gameObj.id).emit('send_gameObj', curr_game)
            }
        }
    })

    socket.on('no_response', function (data){
        var gameObj = data
        var curr_game = games[gameObj.id]
        if(curr_game.bat_number==0){
            var rnd = Math.floor(Math.random()*6)+1
            curr_game.bat_number = rnd
        }
        if(curr_game.bowl_number==0){
            var rnd = Math.floor(Math.random()*6)+1
            curr_game.bowl_number = rnd
        }
        process_curr_game_obj(gameObj.id)
        // console.log("after process")
        // console.log(curr_game)
        io.sockets.to('ha'+gameObj.id).emit('send_gameObj', curr_game)
    })

    socket.on('broadcast_start_game_signal', function (data){ // data is gameObj
        // console.log('--start broacast--')
        // console.log(data)
        var curr_game = games[data.id]
        curr_game.isStarted = true
        // console.log('sending')
        // console.log(curr_game)
        io.sockets.in('ha'+data.id).emit('game_start_alert', curr_game)
    })

    socket.on('join_game', function (data){
        socket.join('ha'+data.gid)
        var curr_game = games[data.gid]
        curr_game.active_players++
        if(curr_game.teamA.players.length<=curr_game.teamB.players.length){
            curr_game.teamA.players.push({
                id : data.pid,
                name: players[data.pid],
                batting_score:0,
                bowling_score : 0,
                balls_bowled : 0,
                wickets_taken : 0,
                isBot : false
            })
        }
        else {
            curr_game.teamB.players.push({
                id : data.pid,
                name: players[data.pid],
                batting_score:0,
                bowling_score : 0,
                balls_bowled : 0,
                wickets_taken : 0,
                isBot : false
            })
        }

        io.sockets.in('ha'+data.gid).emit('joined_game', curr_game)
    })

    socket.on('leave_game', function (data){
        var curr_game = games[data.gid]
        socket.leave('ha'+data.gid)
        curr_game.active_players--
        for(var i=0;i<curr_game.teamA.players.length;i++){
            if(curr_game.teamA.players[i].id==data.pid){
                curr_game.teamA.players.splice(data.pid, 1);
            }
        }
        for(var i=0;i<curr_game.teamB.players.length;i++){
            if(curr_game.teamB.players[i].id==data.pid){
                curr_game.teamB.players.splice(data.pid, 1);
            }
        }
        io.sockets.in('ha'+data.gid).emit('joined_game', curr_game)
    })

    socket.on('create_game', function (data){
        var max_size = data.max_size
        var pid = data.pid

        var game = {
            id : games.length,
            host : pid,
            teamA : {
                players:[{
                    id : pid,
                    name : players[pid],
                    isBatting : false,
                    isBowling : false,
                    batting_score : 0,
                    bowling_score : 0,
                    isBot : false,
                    wickets_taken : 0
                }],
                score:0,
                balls_bowled:0,
                wickets:0
            },
            teamB : {
                players:[
                ],
                score:0,
                balls_bowled:0,
                wickets:0
            },
            isTeamABatting : true,
            isFirstInnings : true,
            isCompleted : false,
            isStarted : false,
            active_players : 1,
            bat_number : 0,
            bowl_number : 0,
            curr_bat:0,
            curr_bowl:0,
            max_team_size : max_size,
            isSinglePlayer : false

        }
        games.push(game)
        socket.join('ha'+game.id)
        socket.emit('created_game', game)
    })
    socket.on('create_single_player', function (data){
        var pid = data.pid
        socket.join('ha'+games.length)
        var random_num = Math.floor(Math.random()*2);
        if(random_num==0){
            value = true
        }
        else value = false
        var game = {
            id : games.length,
            host : pid,
            teamA : {
                players:[{
                    id : pid,
                    name : players[pid],
                    isBatting : value,
                    isBowling : !value,
                    batting_score : 0,
                    bowling_score : 0,
                    isBot : false,
                    wickets_taken : 0
                }],
                score:0,
                balls_bowled:0,
                wickets:0
            },
            teamB : {
                players:[{
                    id : 0,
                    name : players[0],
                    isBatting : !value,
                    isBowling : value,
                    batting_score : 0,
                    bowling_score : 0,
                    isBot : true,
                    wickets_taken : 0
                }],
                score:0,
                balls_bowled:0,
                wickets:0
            },
            isTeamABatting : value,
            isFirstInnings : true,
            isCompleted : false,
            isStarted : false,
            active_players : 0,
            bat_number : 0,
            bowl_number : 0,
            curr_bat:0,
            curr_bowl:0,
            max_team_size : 1,
            isSinglePlayer : true

        }
        games.push(game)
        // console.log(game)
        io.sockets.in('ha'+game.id).emit('created_single_player',game)
    })
})

function process_curr_game_obj (id) {
    var curr_game = games[id]
    // console.log("before process")
    // console.log(curr_game)
    var out_flag = false
    // before EVERY RETURN, initialize bat_number, bowl_number
    if(curr_game.isTeamABatting){
        var curr_batsman = curr_game.teamA.players[curr_game.curr_bat]
        var curr_bowler = curr_game.teamB.players[curr_game.curr_bowl]

        curr_bowler.bowled_balls++
        curr_game.teamB.balls_bowled++

        if(curr_game.bat_number==curr_game.bowl_number){
            out_flag = true
            // curr_batsman.isBatting = false
            curr_bowler.wickets_taken++
            curr_game.teamA.wickets++

            if(curr_game.teamA.wickets>=curr_game.teamA.players.length){
                if(curr_game.isFirstInnings){
                    curr_game.isTeamABatting = false
                    curr_game.isFirstInnings = false
                    curr_game.curr_bat = 0
                    curr_game.curr_bowl = 0
                    // curr_game.teamA.players[0].isBowling = true
                    // curr_game.teamB.players[0].isBatting = true
                    // return // 1st innings completed
                }
                else {
                    curr_game.isCompleted = true
                    // ?? emit game end signal with gameobj
                    // return  // game completed
                }
            }
            else {
                curr_game.curr_bat +=1
                // curr_game.teamA.players[curr_game.curr_bat].isBatting = true
                if(curr_game.teamB.balls_bowled%6==0){
                    if(curr_game.curr_bowl==curr_game.teamB.players.length-1){
                        curr_game.curr_bowl = 0
                        //curr_game.teamB.players[curr_game.curr_bowl].isBowling = true
                    }
                    else {
                        curr_game.curr_bowl++
                    }
                }
                // return
            }
        }
        else {  // NOT OUT CASE
            out_flag = false
            curr_bowler.bowled_balls++
            curr_batsman.batting_score += curr_game.bat_number
            curr_bowler.bowling_score += curr_game.bat_number
            curr_game.teamA.score += curr_game.bat_number
            if(curr_game.teamB.balls_bowled%6==0){
                if(curr_game.curr_bowl==curr_game.teamB.players.length-1){
                    curr_game.curr_bowl = 0
                    //curr_game.teamB.players[curr_game.curr_bowl].isBowling = true
                }
                else {
                    curr_game.curr_bowl++
                }
            }
        }
        // bowler change
    }
    else {
        var curr_batsman = curr_game.teamB.players[curr_game.curr_bat]
        var curr_bowler = curr_game.teamA.players[curr_game.curr_bowl]

        curr_bowler.bowled_balls++
        curr_game.teamA.balls_bowled++

        if(curr_game.bat_number==curr_game.bowl_number){
            out_flag = true
            // curr_batsman.isBatting = false
            curr_bowler.wickets_taken++
            curr_game.teamB.wickets++

            if(curr_game.teamB.wickets>=curr_game.teamB.players.length){
                if(curr_game.isFirstInnings){
                    curr_game.isTeamABatting = true
                    curr_game.isFirstInnings = false
                    curr_game.curr_bat = 0
                    curr_game.curr_bowl = 0
                    // curr_game.teamA.players[0].isBowling = true
                    // curr_game.teamB.players[0].isBatting = true
                    // return // 1st innings completed
                }
                else {
                    curr_game.isCompleted = true
                    // ?? emit game end signal with gameobj
                    // return  // game completed
                }
            }
            else {
                curr_game.curr_bat +=1
                // curr_game.teamB.players[curr_game.curr_bat].isBatting = true
                if(curr_game.teamA.balls_bowled%6==0){
                    if(curr_game.curr_bowl==curr_game.teamA.players.length-1){
                        curr_game.curr_bowl = 0
                        //curr_game.teamA.players[curr_game.curr_bowl].isBowling = true
                    }
                    else {
                        curr_game.curr_bowl++
                    }
                }
                // return
            }
        }
        else {  // NOT OUT CASE
            out_flag = false
            curr_bowler.bowled_balls++
            curr_batsman.batting_score += curr_game.bat_number
            curr_bowler.bowling_score += curr_game.bat_number
            curr_game.teamB.score += curr_game.bat_number
            if(curr_game.teamA.balls_bowled%6==0){
                if(curr_game.curr_bowl==curr_game.teamA.players.length-1){
                    curr_game.curr_bowl = 0
                    //curr_game.teamA.players[curr_game.curr_bowl].isBowling = true
                }
                else {
                    curr_game.curr_bowl++
                }
            }
        }
    }
    curr_game.temp_bat_number = curr_game.bat_number;
    curr_game.temp_bowl_number = curr_game.bowl_number;
    // console.log('--- check ---')
    // console.log(curr_game)
    curr_game.bat_number = 0
    curr_game.bowl_number = 0
    // console.log("after process")
    // console.log(curr_game)
}

/*
GAME OBJECT DISCRIPTION
game :
    id : autoincrement
    host : personId
    teamA : teamObj
    teamB : teamObj
    isTeamABatting : flag
    isFirstInnings : flag
    isCompleted : flag
    isStarted : flag
    active_players : int = 0
    max_team_size : number (3)
    bat_number : int 0
    bowl_number : int 0
    temp_bat_number : int
    temp_bowl_number : int
    curr_bat : int (pid)
    curr_bowl : int (pid)
    isSinglePlayer : flag

team :
    players : [ list of player objs]
    score   : int
    balls_bowled
    wickets

player :
    id : id
    name : string
    //isBatting : flag
    //isBowling : flag
    batting_score :
    bowling_score :
    bowled_balls:
    wickets_taken : int 0
    isBot : flag

*/


app.get('/',function (req, res){
    //res.json({name:"suhas"});
    // sending the client side html files
    return res.sendFile('index.html');
})

app.get('/register_me/:name', function (req,res){
    var name = req.params.name
    players.push(name)
    return res.json({'name':players.length-1})
})

app.get('/games/:id/single_player', function (req,res){
    var pid = parseInt(req.params.id)
    var random_num = Math.floor(Math.random()*2);
    if(random_num==0){
        value = true
    }
    else value = false
    var game = {
        id : games.length,
        host : pid,
        teamA : {
            players:[{
                id : pid,
                name : players[pid],
                isBatting : value,
                isBowling : !value,
                batting_score : 0,
                bowling_score : 0,
                isBot : false,
                wickets_taken : 0
            }],
            score:0,
            balls_bowled:0,
            wickets:0
        },
        teamB : {
            players:[{
                id : 0,
                name : players[0],
                isBatting : !value,
                isBowling : value,
                batting_score : 0,
                bowling_score : 0,
                isBot : true,
                wickets_taken : 0
            }],
            score:0,
            balls_bowled:0,
            wickets:0
        },
        isTeamABatting : value,
        isFirstInnings : true,
        isCompleted : false,
        isStarted : false,
        active_players : 0,
        bat_number : 0,
        bowl_number : 0,
        curr_bat:0,
        curr_bowl:0,
        max_team_size : 1,
        isSinglePlayer : true

    }
    games.push(game)
    //console.log(game)
    return res.json(game)
})


app.get('/games', function (req, res){
    // return running games
    data=[]
    for(var i=0;i<games.length;i++){
        data.append(games[i].id)
    }
    return res.json(data)
})

app.get('/games_available', function (req, res){
    var av_games = [];
    for (var i=0;i<games.length;i++){
        if(games[i].isStarted==false&&games[i].isSinglePlayer==false&&games[i].active_players<2*games[i].max_team_size){
            curr_size = games[i].active_players
            av_games.push({id:i,host:players[games[i].host],curr_size:curr_size,max_size:2*games[i].max_team_size})
        }
    }
    return res.json(av_games)
})

http.listen(80, function (){
    console.log("Port running on 80");
});
