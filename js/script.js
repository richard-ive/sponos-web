var app = angular.module('myApp', ['ionic', 'ngResource', 'ngRoute']);

app.run(function(NowPlaying, Playlists, $rootScope){

  var scope = $rootScope;

  NowPlaying.poll().then(function(resp){
      scope.stat = resp.data;
  });

  Playlists.get().then(function(resp){
      scope.playlists = resp.data;
  });

});

app.factory('SponosSearch', function($http, $q) {

  return {
    search: function(query) {
      var q = $q.defer();

      $http.jsonp('http://192.168.0.200:8888/search/?callback=JSON_CALLBACK&search=' + query,  { format: 'json', jsoncallback: 'JSON_CALLBACK' , 'method': 'GET', data:{search:query}}).then(function(r) {
      q.resolve(r);

      });

      return q.promise;
    }
  };
});

app.factory('SponosRadio', function($http, $q) {

  return {
    loadStations: function(value) {
      var q = $q.defer();

      $http.jsonp('http://192.168.0.200:8888/audio/radio/?callback=JSON_CALLBACK',  { format: 'json', jsoncallback: 'JSON_CALLBACK' , 'method': 'GET'}).then(function(r) {
      q.resolve(r);

      });

      return q.promise;
    }
  };
});

app.factory('SponosControls', function($http, $q) {

      
  return {
    control: function(action, settings) {
      var q = $q.defer();

      uri = '';

      if(settings.isQueue){
        uri = (settings.value)? '&idx=' + settings.value : '';
      }else{
        uri = (settings.value)? '&uri=' + settings.value : '';
      }


      $http.jsonp('http://192.168.0.200:8888/audio/' + action + '/?callback=JSON_CALLBACK' + uri,  { format: 'json', jsoncallback: 'JSON_CALLBACK' , 'method': 'GET', data:{uri:uri}}).then(function(r) {
        q.resolve(r);
      });

      return q.promise;
    }
  };
});

app.factory('SponosVolume', function($http, $q) {

  return {
    set: function(value) {
      var q = $q.defer();

      $http.jsonp('http://192.168.0.200:8888/audio/volume/?callback=JSON_CALLBACK&set=' + value,  { format: 'json', jsoncallback: 'JSON_CALLBACK' , 'method': 'GET', data:{set:value}}).then(function(r) {
        q.resolve(r);

      });

      return q.promise;
    }
  };
});

app.factory('NowPlaying', function($http, $q) {


    return {
      poll: function($scope) {
        var q = $q.defer();
        $http.jsonp('http://192.168.0.200:8888/audio/nowplaying/?callback=JSON_CALLBACK', { format: 'json', jsoncallback: 'JSON_CALLBACK' , 'method': 'JSONP' }).then(function(r) {
              var input = document.getElementById("volume");
              input.value = r.data.volume;

              q.resolve(r);
        });

        return q.promise;
      }

    };
});

app.factory('Playlists', function($http, $q) {

  return {
    get: function() {
      var q = $q.defer();


      $http.jsonp('http://192.168.0.200:8888/audio/playlists/?callback=JSON_CALLBACK',  { format: 'json', jsoncallback: 'JSON_CALLBACK' , 'method': 'GET'}).then(function(r) {
        q.resolve(r);
      });

      return q.promise;
    }
  };
});

app.controller('MainCtrl', function($scope, NowPlaying) {

    $scope.toggleMenu = function() {
      $scope.sideMenuController.toggleLeft();
    };

    $scope.nowPlayingRefresh = function(){
      NowPlaying.poll().then(function(resp, status){
        $scope.stat = resp.data;
      });
    };

});

app.controller('RadioCtrl', function($scope, SponosRadio) {
    SponosRadio.loadStations().then(function(resp) {
        $scope.stations = resp.data;
    });
});

app.controller('SearchCtrl', function($scope, SponosSearch) {

  var doSearch = ionic.debounce(function(query) {
    SponosSearch.search(query).then(function(resp) {
       
        $scope.results = resp.data;
        $scope.tracks =  resp.data.tracks;
        $scope.albums = resp.data.albums;
        $scope.artists = resp.data.artists;

    });
  }, 750);
  
  $scope.search = function() {
    doSearch($scope.query);
  };

});

app.controller('ControlsCtrl', function($scope, $window, SponosControls, $location, NowPlaying, $http, $ionicModal) {

  var doControl = function(action, settings) {
    SponosControls.control(action, settings).then(function(resp) {
        NowPlaying.poll().then(function(resp){
          $scope.stat = resp.data;
        });
    });
  };

  $scope.next = function(){
    doControl("next", {});
  };

  $scope.prev = function(){
    doControl("prev", {});
  };

  $scope.pause = function(){
    doControl("pause", {});
  };

  $scope.play = function(value, isQueue){
    isQueue = (isQueue)? true: false;
    doControl("play", {value:value, isQueue:isQueue});
  };

  $scope.logout = function(){
	   $http.get('http://192.168.0.200:8888/auth/logout/').success(function(){
		    location.reload(true);
  	 });
  };

  $scope.loginSubmit = function(){

    console.log(this.username);

     $http.get('http://192.168.0.200:8888/auth/login/?username=' + this.username + '&password=' + this.password).success(function(){
        location.reload(true);
     }).error(function(){
        alert('Incorrect logins');
     });

  };

  
 // $scope.control = function() {

    $scope.$on('$routeChangeSuccess', function ($event, $current) {
        doControl($current.params.action, $current.params.value);
    });
    
  //};

});

app.controller('VolumeCtrl', function($scope, SponosVolume) {

    var doSetVolume = ionic.debounce(function(volume) {
      SponosVolume.set(volume).then(function(resp) {});
    }, 200);
    
    $scope.setVolume = function() {
      doSetVolume($scope.volume);
    };

    $scope.volumePlus10 = function(newVol) {
      console.log(newVol);
      var input = document.getElementById("volume");
      input.value = parseInt(input.value) + 10;
      doSetVolume(input.value);
    };

    $scope.volumeMinus10 = function(newVol) {
      var input = document.getElementById("volume");
      input.value = parseInt(input.value) - 10;
      doSetVolume(input.value);
    };

});

app.service('ModalService', function($ionicModal, $rootScope) {
  
  
  var init = function(tpl, $scope) {

    var promise;
    $scope = $scope || $rootScope.$new();
    
    promise = $ionicModal.fromTemplateUrl(tpl, function(modal) {
      $scope.modal = modal;
      return modal;
    }, {
      scope: $scope,
      animation: 'slide-in-up'
    });

    $scope.openModal = function() {
       $scope.modal.show();
     };
     $scope.closeModal = function() {
       $scope.modal.hide();
     };
     $scope.$on('$destroy', function() {
       $scope.modal.remove();
     });
    
    return promise;
  };
  
  return {
    init: init
  };
  
});

app.controller('ModalCtrl', function($scope, ModalService) {
  
  $scope.modalLogin = function() {
    ModalService
      .init('login.html', $scope)
      .then(function(modal) {
        modal.show();
      });
  };
  
  $scope.modalNowPlaying = function() {
    ModalService
      .init('modal.html', $scope)
      .then(function(modal) {
        modal.show();
      });
  };
  
});

app.controller('ContentController', function($scope, $ionicSideMenuDelegate) {
  $scope.toggleLeft = function() {
    $ionicSideMenuDelegate.toggleLeft();
  };
});

app.config(['$routeProvider', '$locationProvider',
  function($routeProvider, $locationProvider) {
    $routeProvider.
        when('/control/:action/:value', {
            controller: 'ControlsCtrl'
        });
}]);


app.config(['$httpProvider', function($httpProvider) {

  $httpProvider.interceptors.push(function($q) {
    return {

      request: function (config) {
        //console.log("request", config); // Contains the data about the request before it is sent.

        // Return the config or wrap it in a promise if blank.
        return config || $q.when(config);
      },

      // On request failure
      requestError: function (rejection) {
        console.log("requestError", rejection); // Contains the data about the error on the request.

        // Return the promise rejection.
        return $q.reject(rejection);
      },

      // On response success
      response: function (response) {
        //console.log("response", response); // Contains the data from the response.

        // Return the response or promise.
        return response || $q.when(response);
      },

      // On response failture
      responseError: function (rejection) {
        console.log("responseError", rejection); // Contains the data about the error.

        // Return the promise rejection.
        return $q.reject(rejection);
      }
    };
  });
}]);


