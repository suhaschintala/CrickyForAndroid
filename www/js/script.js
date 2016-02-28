angular.module('app',[])
.controller('myCtrl',function ($scope,$http,socket, $timeout){
	$scope.isReg = false;
	$scope.isSinglePlayer=false;
	$scope.gameObj = null;
	$scope.isGameOp = false;
    $scope.isGameStarted = false;
    $scope.isHost = false;
    $scope.showStartButtonHost = false;
    $scope.isCounter = false
    $scope.time_out = 0
    $scope.showClickToJoin = false
    $scope.showRunningGames = false
    $scope.showCreateGameMenu = false
    $scope.showWaiting = false
    $scope.showScoreCard = false
    $scope.showGameEnded = false
    $scope.target = 0
    $scope.handCmp = false
    $scope.bgimg = "img/cricket_ball_on_grass1.jpg"
    $scope.bg2img = "img/cricket_ball_on_grass1.jpg"
    console.log("hii")
    var ip = 'http://137.135.124.174:80'
	//if (localStorage.player_id != null){$scope.isReg = true;}
    var mytimeout = null;
    $scope.counter = 5;
    $scope.no_response_counter = 0
    $scope.startTimer = function (){
        if($scope.c_batting || $scope.c_bowling){
            $scope.isCounter = true
            $scope.counter = 5;
            $scope.onTimeout = function(){
                if($scope.counter<=0){
                    console.log('---no response---')
                    console.log($scope.gameObj)
                    $scope.no_response_counter++
                    console.log('#no_response -- "hehe" --'+$scope.no_response_counter)
                    socket.emit('no_response',$scope.gameObj)
                    return
                }
                $scope.counter--;
                mytimeout = $timeout($scope.onTimeout,1000);
            }
            mytimeout = $timeout($scope.onTimeout,1000);
        }
    }


    $scope.stop = function(){
        $timeout.cancel(mytimeout);
    }

	$scope.joinGame = function (){
        socket.emit('join_game',{pid:localStorage.player_id, gameObj:$scope.gameObj})
    }

    $scope.register_me = function () {
        socket.emit('register_me', $scope.username)
	}

    socket.on('registered_me', function (data){
        console.log('----registered_me---')
        console.log(data)
        localStorage.player_id = data.name;
        $scope.isReg = true;
        $scope.isGameOp = true;
    })

    socket.on('user_disconnected', function (data){
        $scope.reset()
    })

    $scope.reset = function (){
        $scope.showScoreCard = false
        $scope.isGameStarted = false
        $scope.c_batting = false
        $scope.c_bowling = false
        $scope.isGameOp = true
    }

    socket.on('game_ended', function (data){
        $scope.showScoreCard = true
        $scope.isGameStarted = false
        $scope.c_batting = false
        $scope.c_bowling = false
        $scope.showGameEnded = true
        alert('THE GAME HAS ENDED!!')
    })

    socket.on('send_gameObj',function (data){
        $scope.gameObj = data;
        manipulateGameObject();

    })

    socket.on('game_start_alert', function (data){
        // remove waiting screen
        $scope.showWaiting = false
        $scope.showScoreCard = false
        $scope.isGameStarted = true
        // alert user for start of game
        // check for his turn
        console.log('--game start alert socket')
        console.log(data)
        $scope.gameObj = data
        manipulateGameObject();
        alert("THE GAME HAS STARTED!!")
        console.log('--after man gamestartalert')
    })

    socket.on('joined_game', function (data){
        console.log('----joined game----')
        console.log(data)
        $scope.showWaiting = true
        $scope.gameObj = data
        $scope.showScoreCard = true
        // when someone joins game, do this
        // show waiting screen until start_game_alert comes
    })

    socket.on('created_game', function (data){
        console.log("Created game")
        console.log(data)
        // initialize $scope.gameObj
        $scope.gameObj = data
        $scope.showScoreCard = true

    })

    socket.on('created_single_player', function (data){
        $scope.gameObj = data;
        console.log("--single_player function--")
        console.log(data)
        manipulateGameObject();
        $scope.c_batting=false;
        $scope.c_bowling=false;
        $scope.isSinglePlayer = true;
        $scope.isGameOp = false;
        $scope.isGameStarted = false;
        if(data.host==localStorage.player_id){
            $scope.isHost = true;
            $scope.showStartButtonHost = true;
        }
    })

	$scope.single_player = function() {
        data = {pid:localStorage.player_id}
        $scope.isGameOp = false;
        $scope.bgimg = $scope.bg2img
        socket.emit('create_single_player', data)
		// $http.get(ip+'/games/'+localStorage.player_id+'/single_player').success(function(res){
		// 	$scope.gameObj = res;
  //           console.log("--single_player function--")
		// 	console.log(res)
  //           manipulateGameObject();
		// 	$scope.isSinglePlayer = true;
  //           $scope.isGameOp = false;
  //           $scope.isGameStarted = true;
  //           if(res.host==localStorage.player_id){
  //               $scope.isHost = true;
  //               $scope.showStartButtonHost = true;
  //           }
  //       });
	};

    $scope.show_games = function () {
        // dom manipulation to be done
        $scope.isGameOp = false;
        $scope.bgimg = $scope.bg2img
        $scope.games = []
        $http.get(ip+'/games_available').success(function (res){
            console.log(res)
            $scope.games = res
        });
        $scope.showRunningGames = true
    }

    $scope.leaveRoom = function (){
        socket.emit('leave_game',{pid : localStorage.player_id, gid : $scope.gameObj.id})
        $scope.showWaiting = false
        $scope.showScoreCard = false
        $scope.showRunningGames = true
        // div show/hide
    }

    $scope.show_create_game_menu = function (){
        $scope.showCreateGameMenu = true
        $scope.isGameOp = false;
        $scope.bgimg = $scope.bg2img
    }

    $scope.create_game = function () {
        var data ={'max_size':$scope.max_size, 'pid':localStorage.player_id}
        socket.emit('create_game',data)
        $scope.max_size = 0
        $scope.showCreateGameMenu = false
        $scope.showStartButtonHost = true
        // Show/hide divs for main game waiting hall
    }

    $scope.join_game = function (id){
        socket.emit('join_game',{pid : localStorage.player_id, gid : id})
        $scope.showRunningGames = false
        // main game div
    }

    $scope.startGame = function () {
        socket.emit('broadcast_start_game_signal',$scope.gameObj);
        $scope.showStartButtonHost = false;
    }

    $scope.returnToMenu = function (){
        $scope.showScoreCard = false
        $scope.isGameStarted = false
        $scope.c_batting = false
        $scope.c_bowling = false
        $scope.isGameOp = true
        $scope.showGameEnded = false
        $scope.gameObj = {}
    }

	$scope.bat = function(num) {
        $scope.stop()
		var out = {'pid':localStorage.player_id,'gameObj':$scope.gameObj,'number':num}
		socket.emit('bat_number',out);
        console.log('taka -- '+num)
	}

	$scope.bowl = function(num) {
        $scope.stop()
		var out = {'pid':localStorage.player_id,'gameObj':$scope.gameObj,'number':num}
        console.log('---bowl---')
        console.log(out)
		socket.emit('bowl_number',out);
        console.log('tiki -- '+num)
	}



    function manipulateGameObject() {
        console.log("--manipulate gameobj--")
        console.log($scope.gameObj)

        var tmp = $scope.gameObj.teamA;
        if($scope.gameObj.isTeamABatting == false)
        {
            tmp = $scope.gameObj.teamB;
        }
        $scope.score = tmp.score
        $scope.wickets = tmp.wickets

        if(tmp.players[$scope.gameObj.curr_bat].id==localStorage.player_id){
            $scope.c_batting = true;
            $scope.c_bowling = false;
        }
        else {
            $scope.c_batting = false;
        }
        $scope.current_batsmen = tmp.players[$scope.gameObj.curr_bat].name;
        $scope.individual_score = tmp.players[$scope.gameObj.curr_bat].batting_score;
         // current batting assemment done!!

         //current bowling
        if($scope.gameObj.isTeamABatting == false)
            tmp1 = $scope.gameObj.teamA;
        else
            tmp1 = $scope.gameObj.teamB;

        if(!$scope.gameObj.isFirstInnings){
            $scope.target = tmp1.score
            $scope.required_runs = tmp1.score - tmp.score + 1
        }

        if(tmp1.players[$scope.gameObj.curr_bowl].id==localStorage.player_id){
            $scope.c_batting = false;
            $scope.c_bowling = true;
        }
        else {
            $scope.c_bowling = false;
        }
        $scope.current_bowler = tmp1.players[$scope.gameObj.curr_bowl].name;
        // $scope.overNo = (tmp1.balls_bowled)/6
        $scope.overs =  Math.floor((tmp1.balls_bowled)/6) + '.'+ (tmp1.balls_bowled%6);
        console.log("after man")
        console.log($scope.gameObj)
        if($scope.gameObj.isCompleted||$scope.required_runs<=0){
            console.log("GAME OVER!!"); // GAME OVER!
            if(tmp.score>tmp1.score){
                if(tmp==$scope.gameObj.teamA){
                    $scope.winner = "teamA"
                }
                else {
                    $scope.winner = "teamB"
                }
            }
            else if(tmp.score<tmp1.score){
                if(tmp1==$scope.gameObj.teamA){
                    $scope.winner = "teamA"
                }
                else {
                    $scope.winner = "teamB"
                }
            }
            else {
                $scope.winner = "Draw"
            }
            socket.emit('game_over',$scope.gameObj)
        }
        else {
            //$scope.startTimer();
        }
        $scope.temp_bat_number = $scope.gameObj.temp_bat_number;
        $scope.temp_bowl_number = $scope.gameObj.temp_bowl_number;
    }














	// function manipulateGameObject() {
 //        console.log("--manipulate gameobj--")
 //        console.log($scope.gameObj)
	// 	var tmp = $scope.gameObj.teamA;
	// 	if($scope.gameObj.isTeamABatting == false)
	// 	{
	// 		tmp = $scope.gameObj.teamB;
	// 	}
	// 	for(var i=0;i<tmp.players.length;i++)
	// 	{
	// 		if(tmp.players[i].isBatting)
	// 		{
	// 			if(tmp.players[i].id==localStorage.player_id){
	// 				$scope.c_batting = true;
 //                    $scope.c_bowling = false;
	// 			}
	// 			else {
	// 				$scope.c_batting = false;
	// 			}
	// 			$scope.current_batsmen = tmp.players[i].name;
	// 			$scope.individual_score = tmp.players[i].batting_score;
	// 			break;
	// 		}
	// 	}

	// 	if($scope.gameObj.isTeamABatting == false)
	// 		tmp1 = $scope.gameObj.teamA;
	// 	else
	// 		tmp1 = $scope.gameObj.teamB;
	// 	for(var i=0;i<tmp1.players.length;i++)
	// 	{
 //            console.log("enetered shit")
	// 		if(tmp1.players[i].isBowling)
	// 		{
	// 			if(tmp1.players[i].id==localStorage.player_id){
 //                    $scope.c_bowling = true;
 //                    $scope.c_batting = false;
 //                }
	// 			else {
	// 				$scope.c_bowling = false;
	// 			}
	// 			$scope.current_bowler = tmp1.players[i].name;
	// 			$scope.overs = (tmp1.balls_bowled)/6 + '.'+ (tmp1.balls_bowled%6);
	// 			break;
	// 		}
	// 	}
	// }
})

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


