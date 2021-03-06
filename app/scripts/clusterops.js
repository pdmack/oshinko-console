/**
 * Created by croberts on 2/2/17.
 */

'use strict';

angular.module('openshiftConsole')
  .filter('depName', function () {
    var labelMap = {
      'replicationController': ["openshift.io/deployment-config.name"]
    };
    return function (labelKey) {
      return labelMap[labelKey];
    };
  })
  .filter('clusterName', function () {
    var labelMap = {
      'route': ["oshinko-cluster"]
    };
    return function (labelKey) {
      return labelMap[labelKey];
    };
  })
  .factory('clusterData',
    function ($http, $q, DataService, DeploymentsService, ApplicationGenerator, $filter) {

      // Start delete-related functions
      function deleteObject(name, resourceType, context) {
        return DataService.delete(resourceType, name, context, null);
      }

      function scaleDeleteReplication(deploymentName, context) {
        var deferred = $q.defer();
        var mostRecentRC = null;
        // we need to determine the most recent replication controller in the event that
        // changes have been made to the deployment, we can not assume clustername-w-1
        DataService.list('replicationcontrollers', context, function (result) {
          var rcs = result.by("metadata.name");
          angular.forEach(rcs, function (rc) {
            if (!mostRecentRC || new Date(rc.metadata.creationTimestamp) > new Date(mostRecentRC.metadata.creationTimestamp)) {
              // if we have a mostRecentRC, it's about to be replaced, so we
              // can delete it as it's most definitely not the most recent one
              if (mostRecentRC) {
                DataService.delete('replicationcontrollers', mostRecentRC.metadata.name, context, null).then(angular.noop);
              }
              mostRecentRC = rc;
            }
          });
          mostRecentRC.spec.replicas = 0;
          DataService.update('replicationcontrollers', mostRecentRC.metadata.name, mostRecentRC, context).then(function () {
            DataService.delete('replicationcontrollers', mostRecentRC.metadata.name, context, null).then(function (result) {
              deferred.resolve(result);
            }).catch(function (err) {
              deferred.reject(err);
            });
          }).catch(function (err) {
            deferred.reject(err);
          });
        }, {
          http: {
            params: {
              labelSelector: $filter('depName')('replicationController') + '=' + deploymentName
            }
          }
        });
        return deferred.promise;
      }

      function scaleReplication(clusterName, deploymentName, count, context) {
        var deferred = $q.defer();
        DataService.get('deploymentconfigs', deploymentName, context, null).then(function (dc) {
          DeploymentsService.scale(dc, count).then(function (result) {
            deferred.resolve(result);
          });
        });
        return deferred.promise;
      }

      function deleteRoute(clusterName, context) {
        return DataService.list('routes', context, function (result) {
          var routes = result.by("metadata.name");
          angular.forEach(routes, function(route) {
            deleteObject(route.metadata.name, 'routes', context);
          });
        }, {
          http: {
            params: {
              labelSelector: $filter('clusterName')('route') + '=' + clusterName
            }
          }
        });
      }

      function sendDeleteCluster(clusterName, context) {
        var masterDeploymentName = clusterName + "-m";
        var workerDeploymentName = clusterName + "-w";

        return $q.all([
          scaleDeleteReplication(masterDeploymentName, context),
          scaleDeleteReplication(workerDeploymentName, context),
          deleteObject(masterDeploymentName, 'deploymentconfigs', context),
          deleteObject(workerDeploymentName, 'deploymentconfigs', context),
          deleteObject(clusterName, 'services', context),
          deleteRoute(clusterName, context),
          deleteObject(clusterName + "-ui", 'services', context)
        ]);
      }

      // Start create-related functions
      function makeDeploymentConfig(input, imageSpec, ports, specialConfig) {
        var env = [];
        angular.forEach(input.deploymentConfig.envVars, function (value, key) {
          env.push({name: key, value: value});
        });
        var templateLabels = angular.copy(input.labels);
        templateLabels.deploymentconfig = input.name;

        var container = {
          image: imageSpec.toString(),
          name: input.name,
          ports: ports,
          env: env,
          resources: {},
          terminationMessagePath: "/dev/termination-log",
          imagePullPolicy: "IfNotPresent"
        };

        var volumes = [];
        if (specialConfig) {
          volumes = [
            {
              name: specialConfig,
              configMap: {
                name: specialConfig,
                defaultMode: 420
              }
            }
          ];
          container.volumeMounts = [
            {
              name: specialConfig,
              readOnly: true,
              mountPath: "/etc/oshinko-spark-configs"
            }
          ];
        }

        if (input.labels["oshinko-type"] === "master") {
          container.livenessProbe = {
            httpGet: {
              path: "/",
              port: 8080,
              scheme: "HTTP"
            },
            timeoutSeconds: 1,
            periodSeconds: 10,
            successThreshold: 1,
            failureThreshold: 3
          };
          container.readinessProbe = {
            httpGet: {
              path: "/",
              port: 8080,
              scheme: "HTTP"
            },
            timeoutSeconds: 1,
            periodSeconds: 10,
            successThreshold: 1,
            failureThreshold: 3
          };
        } else {
          container.livenessProbe = {
            httpGet: {
              path: "/",
              port: 8081,
              scheme: "HTTP"
            },
            timeoutSeconds: 1,
            periodSeconds: 10,
            successThreshold: 1,
            failureThreshold: 3
          };
        }

        var replicas;
        if (input.scaling.autoscaling) {
          replicas = input.scaling.minReplicas || 1;
        } else {
          replicas = input.scaling.replicas;
        }

        var deploymentConfig = {
          apiVersion: "v1",
          kind: "DeploymentConfig",
          metadata: {
            name: input.name,
            labels: input.labels,
            annotations: input.annotations
          },
          spec: {
            replicas: replicas,
            selector: {
              "oshinko-cluster": input.labels["oshinko-cluster"]
            },
            triggers: [
              {
                type: "ConfigChange"
              }
            ],
            template: {
              metadata: {
                labels: templateLabels
              },
              spec: {
                volumes: volumes,
                containers: [container],
                restartPolicy: "Always",
                terminationGracePeriodSeconds: 30,
                dnsPolicy: "ClusterFirst",
                securityContext: {}
              }
            }
          }
        };
        if (input.deploymentConfig.deployOnNewImage) {
          deploymentConfig.spec.triggers.push(
            {
              type: "ImageChange",
              imageChangeParams: {
                automatic: true,
                containerNames: [
                  input.name
                ],
                from: {
                  kind: imageSpec.kind,
                  name: imageSpec.toString()
                }
              }
            }
          );
        }
        return deploymentConfig;
      }

      function sparkDC(image, clusterName, sparkType, workerCount, ports, sparkConfig) {
        var suffix = sparkType === "master" ? "-m" : "-w";
        var input = {
          deploymentConfig: {
            envVars: {
              OSHINKO_SPARK_CLUSTER: clusterName
            }
          },
          name: clusterName + suffix,
          labels: {
            "oshinko-cluster": clusterName,
            "oshinko-type": sparkType
          },
          annotations: {"created-by": "oshinko-console"},
          scaling: {
            autoscaling: false,
            minReplicas: 1
          }
        };
        if (sparkType === "worker") {
          input.deploymentConfig.envVars.SPARK_MASTER_ADDRESS = "spark://" + clusterName + ":" + 7077;
          input.deploymentConfig.envVars.SPARK_MASTER_UI_ADDRESS = "http://" + clusterName + "-ui:" + 8080;
        }
        if (sparkConfig) {
          input.deploymentConfig.envVars.SPARK_CONF_DIR = "/etc/oshinko-spark-configs";
        }
        input.scaling.replicas = workerCount ? workerCount : 1;
        var dc = makeDeploymentConfig(input, image, ports, sparkConfig);
        return dc;
      }

      function makeService(input, serviceName, ports) {
        if (!ports || !ports.length) {
          return null;
        }

        var service = {
          kind: "Service",
          apiVersion: "v1",
          metadata: {
            name: serviceName,
            labels: input.labels,
            annotations: input.annotations
          },
          spec: {
            selector: input.selectors,
            ports: ports
          }
        };

        return service;
      }

      function sparkService(serviceName, clusterName, serviceType, ports) {
        var input = {
          labels: {
            "oshinko-cluster": clusterName,
            "oshinko-type": serviceType
          },
          annotations: {},
          name: serviceName + "-" + serviceType,
          selectors: {
            "oshinko-cluster": clusterName,
            "oshinko-type": "master"
          }
        };
        return makeService(input, serviceName, ports);
      }

      function createDeploymentConfig(dcObject, context) {
        return DataService.create("deploymentconfigs", null, dcObject, context, null);
      }

      function createService(srvObject, context) {
        return DataService.create("services", null, srvObject, context, null);
      }

      function createRoute(srvObject, context) {
        var serviceName = srvObject.metadata.name;
        var labels = srvObject.metadata.labels;
        var routeOptions = {
          name: serviceName + "-route"
        };
        var route = ApplicationGenerator.createRoute(routeOptions, serviceName, labels);
        return DataService.create('routes', null, route, context);
      }

      function getFinalConfigs(configName, workerCount, sparkWorkerConfig, sparkMasterConfig, context) {
        var deferred = $q.defer();
        var finalConfig = {};
        if (configName) {
          DataService.get('configmaps', configName, context, null).then(function (cm) {
            if (cm.data["workercount"]) {
              finalConfig["workerCount"] = parseInt(cm.data["workercount"]);
            }
            if (cm.data["sparkmasterconfig"]) {
              finalConfig["masterConfigName"] = cm.data["sparkmasterconfig"];
            }
            if (cm.data["sparkworkerconfig"]) {
              finalConfig["workerConfigName"] = cm.data["sparkworkerconfig"];
            }
            if (workerCount) {
              finalConfig["workerCount"] = workerCount;
            }
            if (sparkWorkerConfig) {
              finalConfig["workerConfigName"] = sparkWorkerConfig;
            }
            if (sparkMasterConfig) {
              finalConfig["masterConfigName"] = sparkMasterConfig;
            }
            deferred.resolve(finalConfig);
          }).catch(function () {
            if (workerCount) {
              finalConfig["workerCount"] = workerCount;
            }
            if (sparkWorkerConfig) {
              finalConfig["workerConfigName"] = sparkWorkerConfig;
            }
            if (sparkMasterConfig) {
              finalConfig["masterConfigName"] = sparkMasterConfig;
            }
            deferred.resolve(finalConfig);
          });
        } else {
          if (workerCount) {
            finalConfig["workerCount"] = workerCount;
          }
          if (sparkWorkerConfig) {
            finalConfig["workerConfigName"] = sparkWorkerConfig;
          }
          if (sparkMasterConfig) {
            finalConfig["masterConfigName"] = sparkMasterConfig;
          }
          deferred.resolve(finalConfig);
        }
        return deferred.promise;
      }

      function sendCreateCluster(clusterConfig, context) {
        var workerPorts = [
          {
            "name": "spark-webui",
            "containerPort": 8081,
            "protocol": "TCP"
          }
        ];
        var masterPorts = [
          {
            "name": "spark-webui",
            "containerPort": 8080,
            "protocol": "TCP"
          },
          {
            "name": "spark-master",
            "containerPort": 7077,
            "protocol": "TCP"
          }
        ];
        var masterServicePort = [
          {
            protocol: "TCP",
            port: 7077,
            targetPort: 7077
          }
        ];
        var uiServicePort = [
          {
            protocol: "TCP",
            port: 8080,
            targetPort: 8080
          }
        ];

        var sm = null;
        var sw = null;
        var smService = null;
        var suiService = null;
        var deferred = $q.defer();
        getFinalConfigs(clusterConfig.configName, clusterConfig.workerCount,
          clusterConfig.workerConfigName, clusterConfig.masterConfigName).then(function (finalConfigs) {
          sm = sparkDC(clusterConfig.sparkImage, clusterConfig.clusterName, "master", null, masterPorts, finalConfigs["masterConfigName"]);
          sw = sparkDC(clusterConfig.sparkImage, clusterConfig.clusterName, "worker", finalConfigs["workerCount"], workerPorts, finalConfigs["workerConfigName"]);
          smService = sparkService(clusterConfig.clusterName, clusterConfig.clusterName, "master", masterServicePort);
          suiService = sparkService(clusterConfig.clusterName + "-ui", clusterConfig.clusterName, "webui", uiServicePort);

          var steps = [
            createDeploymentConfig(sm, context),
            createDeploymentConfig(sw, context),
            createService(smService, context),
            createService(suiService, context)
          ];

          // if expose webui was checked, we expose the apache spark webui via a route
          if (clusterConfig.exposewebui) {
            steps.push(createRoute(suiService, context));
          }

          $q.all(steps).then(function (values) {
            deferred.resolve(values);
          }).catch(function (err) {
            deferred.reject(err);
          });
        });
        return deferred.promise;
      }

      // Start scale-related functions
      function sendScaleCluster(clusterName, workerCount, masterCount, context) {
        var workerDeploymentName = clusterName + "-w";
        var masterDeploymentName = clusterName + "-m";
        var steps = [
          scaleReplication(clusterName, workerDeploymentName, workerCount, context),
          scaleReplication(clusterName, masterDeploymentName, masterCount, context)
        ];

        return $q.all(steps);
      }

      return {
        sendDeleteCluster: sendDeleteCluster,
        sendCreateCluster: sendCreateCluster,
        sendScaleCluster: sendScaleCluster
      };
    }
  );