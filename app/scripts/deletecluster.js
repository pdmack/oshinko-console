/**
 * Created by croberts on 2/2/17.
 */

'use strict';

angular.module('openshiftConsole')
  .controller('OshinkoClusterDeleteCtrl',
    function ($q, $scope, clusterData, $uibModalInstance, dialogData, $routeParams, ProjectsService) {

      $scope.clusterName = dialogData.clusterName || "";
      $scope.workerCount = dialogData.workerCount || 0;
      $scope.masterCount = dialogData.masterCount || 0;

      $scope.deleteCluster = function deleteCluster() {
        ProjectsService
          .get($routeParams.project)
          .then(_.spread(function (project, context) {
            $scope.project = project;
            $scope.context = context;
            clusterData.sendDeleteCluster($scope.clusterName, $scope.context)
              .then(function (values) {
                var err = false;
                angular.forEach(values, function (value) {
                  if (value.code >= 300 || value.code < 200) {
                    err = true;
                  }
                });
                if (err) {
                  $uibModalInstance.dismiss(values);
                } else {
                  $uibModalInstance.close(values);
                }
              }, function (error) {
                $uibModalInstance.dismiss(error);
              });
          }));
      };

      $scope.cancelfn = function () {
        $uibModalInstance.dismiss('cancel');
      };
    }
  );
