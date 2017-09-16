var angApp = angular.module('myApp',[]);

angApp.controller('TopController', function($scope, $timeout){
  $scope.bbName = "Benedict Bot";
  $scope.latestJoiner = "";
  $scope.dataObj;
  $scope.latestColor = "white";
  $scope.viewArr = {vals: [] };
  var ws = "";
  var hostname = "";
  var hold = false;


  if ("WebSocket" in window) {
    hostName = "ws://localhost:9696";
    ws = new WebSocket(hostName);
  }
  else {
    alert("WebSocket NOT supported by your Browser!");
  }

  ws.onmessage = function(evt){
    $scope.dataObj = JSON.parse(evt.data);

    $scope.$apply(()=>{
      if ($scope.dataObj.cmd !== undefined){
        if ($scope.dataObj.cmd === "Join"){
          $scope.latestJoiner = $scope.dataObj.latestViewer;
          if(hold === false){
            hold = true;
            $timeout(()=>{
              $scope.latestColor = "#00ff00";
            },500);
            $timeout(()=>{
              $scope.latestColor = "white";
            },1000);
            $timeout(()=>{
              $scope.latestColor = "#00ff00";
            },1500);
            $timeout(()=>{
              $scope.latestColor = "white";
            },2000);
            $timeout(()=>{
              $scope.latestColor = "#00ff00";
            },2500);
            $timeout(()=>{
              $scope.latestColor = "white";
              hold = false;
            },3000);

          }
          $scope.viewArr = {vals: [] };
          for (var prop in $scope.dataObj.viewerList) {
            if ($scope.dataObj.viewerList[prop] === 1)
              $scope.viewArr.vals.push(prop);
          }

        }
        if ($scope.dataObj.cmd === "Part"){
          if(hold === false){
            hold = true;
            $timeout(()=>{
              $scope.latestColor = "red";
            },500);
            $timeout(()=>{
              $scope.latestColor = "white";
            },1000);
            $timeout(()=>{
              $scope.latestColor = "red";
            },1500);
            $timeout(()=>{
              $scope.latestColor = "white";
            },2000);
            $timeout(()=>{
              $scope.latestColor = "red";
            },2500);
            $timeout(()=>{
              $scope.latestColor = "white";
              hold = false;
            },3000);

          }
          $scope.viewArr = {vals: [] };
          for (var prop in $scope.dataObj.viewerList) {
            if ($scope.dataObj.viewerList[prop] === 1)
              $scope.viewArr.vals.push(prop);
          }
        }
      }
    });

  }


});

angApp.controller('httpController', function($scope, $http) {

  $scope.cStat = "Disconnected";
  $scope.tryIt = function(){
    var parameters = {amount:123};
    $http.get('idk', {params: parameters})
    .then(function(res){ // Success
      $scope.bbName = res;
    },
    function(err){ // Failure
      $scope.bbName = 2;
    });



    console.log('hi');
  }

  $scope.connectToTwitch = function(state){

    if (state === 1) {

      $http.get('connectToTwitch')
      .then(function(res){ // Success
        $scope.cStat = res.data;
      },
      function(err){ // Failure
        $scope.bbName = 2;
      });
    }
    else {
      $http.get('disconnectFromTwitch')
      .then(function(res){ // Success
        $scope.cStat = res.data;
      },
      function(err){ // Failure
        $scope.bbName = 2;
      });
    }
  }

});
