"use strict";

!function() {
var a = "oshinkoConsole";
angular.module(a, [ "openshiftConsole", "oshinkoConsoleTemplates" ]).config([ "$routeProvider", function(a) {
a.when("/project/:project/oshinko", {
templateUrl:"views/oshinko/clusters.html",
controller:"OshinkoClustersCtrl"
}), a.when("/project/:project/oshinko/:cluster", {
templateUrl:"views/oshinko/cluster.html",
controller:"OshinkoClustersCtrl"
});
} ]).run(function() {
window.OPENSHIFT_CONSTANTS.PROJECT_NAVIGATION.push({
href:"/oshinko",
label:"Spark Clusters",
iconClass:"pficon  pficon-cluster"
});
}), hawtioPluginLoader.addModule(a);
}(), angular.module("openshiftConsole").controller("OshinkoClustersCtrl", [ "$scope", "$interval", "$location", "$route", "DataService", "ProjectsService", "$routeParams", "$rootScope", "$filter", "$uibModal", function(a, b, c, d, e, f, g, h, i, j) {
function k(a) {
return !!q(a, "oshinko-cluster");
}
function l(a, b, c) {
var d, e, f, g, h, i = {};
return _.each(a, function(a) {
k(a) && (d = q(a, "oshinko-cluster"), f = _.get(a, "metadata.name", ""), e = q(a, "oshinko-type"), h = _.find(b, function(b) {
var c = new LabelSelector(b.spec.selector);
return c.matches(a);
}), h && (g = _.get(h, "metadata.name", ""), _.set(i, [ d, e, "svc", g ], h)), _.set(i, [ d, e, "pod", f ], a));
}), _.each(b, function(a) {
e = q(a, "oshinko-type"), "webui" === e && (d = q(a, "oshinko-cluster"), g = _.get(a, "metadata.name", ""), _.set(i, [ d, e, "svc", g ], a));
}), _.each(c, function(a) {
d = q(a, "oshinko-cluster"), d && _.set(i, [ d, "uiroute" ], a);
}), i;
}
var m, n, o, p = [];
a.projectName = g.project, a.serviceName = g.service, a.currentCluster = g.cluster || "", a.projects = {}, a.oshinkoClusters = {}, a.oshinkoClusterNames = [], a.cluster_details = null, a.alerts = a.alerts || {}, a.selectedTab = {};
var q = i("label");
a.cluster_id = d.current.params.Id || "", a.breadcrumbs = [ {
title:a.projectName,
link:"project/" + a.projectName
}, {
title:"Spark Clusters",
link:"project/" + a.projectName + "/oshinko"
} ], "" !== a.currentCluster && a.breadcrumbs.push({
title:a.currentCluster
}), g.tab && (a.selectedTab[g.tab] = !0);
var r = function(b, c) {
try {
a.cluster_details = c[b], a.cluster_details.name = a.cluster_details.master.svc[Object.keys(a.cluster_details.master.svc)[0]].metadata.labels["oshinko-cluster"], a.cluster_details.workerCount = Object.keys(a.cluster_details.worker.pod).length, a.cluster_details.masterCount = Object.keys(a.cluster_details.master.pod).length;
} catch (d) {
a.cluster_details = null;
}
}, s = function() {
n && m && (a.oshinkoClusters = l(n, m, o), a.oshinkoClusterNames = Object.keys(a.oshinkoClusters), "" !== a.currentCluster && a.oshinkoClusters[a.currentCluster] ? r(a.currentCluster, a.oshinkoClusters) :a.cluster_details = null);
};
a.countWorkers = function(a) {
if (!a || !a.worker || !a.worker.pod) return 0;
var b = a.worker.pod, c = Object.keys(b).length;
return c;
}, a.countMasters = function(a) {
if (!a || !a.master || !a.master.pod) return 0;
var b = a.master.pod, c = Object.keys(b).length;
return c;
}, a.getClusterName = function(a) {
var b = Object.keys(a);
return b[0];
}, a.getSparkWebUi = function(a) {
var b = "";
try {
b = "http://" + a.uiroute.spec.host;
} catch (c) {
b = null;
}
return b;
}, a.getClusterStatus = function(a) {
var b, c = "Starting...", d = !1;
return a && a.master && a.master.pod ? (a.worker && a.worker.pod && _.each(a.worker.pod, function(a) {
d = !0, "Running" !== a.status.phase && (b = a.status.phase);
}), _.each(a.master.pod, function(a) {
d = !0, "Running" !== a.status.phase && (b = a.status.phase);
}), d && b ? b :d ? "Running" :c) :"Pending";
}, a.getSparkMasterUrl = function(a) {
var b = "spark://" + a + ":7077";
return b;
}, a.getCluster = function() {
if (a.oshinkoClusters && a.cluster) {
var b = a.oshinkoClusters[a.cluster];
return b;
}
}, a.gotoCluster = function(a) {
var b = c.path() + "/" + encodeURIComponent(a);
c.path(b);
};
var t = g.project;
f.get(t).then(_.spread(function(b, c) {
a.project = b, a.projectContext = c, p.push(e.watch("pods", c, function(b) {
a.pods = n = b.by("metadata.name"), s();
})), p.push(e.watch("services", c, function(b) {
a.services = m = b.by("metadata.name"), s();
})), p.push(e.watch("routes", c, function(b) {
a.routes = o = b.by("metadata.name"), s();
})), a.$on("$destroy", function() {
e.unwatchAll(p);
});
})), a.$on("$destroy", function() {
e.unwatchAll(p);
}), a.deleteCluster = function(b) {
var c = j.open({
animation:!0,
controller:"OshinkoClusterDeleteCtrl",
templateUrl:"views/oshinko/delete-cluster.html",
backdrop:"static",
resolve:{
dialogData:function() {
return {
clusterName:b
};
}
}
});
c.result.then(function() {
var c = "cluster-delete";
a.alerts = {}, a.alerts[c] = {
type:"success",
message:b + " has been marked for deletion"
};
})["catch"](function(c) {
if ("cancel" !== c) {
var d = b + "-delete";
a.alerts[d] = {
type:"error",
message:b + " has been marked for deletion, but there were errors"
};
}
});
}, a.newCluster = function() {
var b = j.open({
animation:!0,
controller:"OshinkoClusterNewCtrl",
templateUrl:"views/oshinko/new-cluster.html",
backdrop:"static",
resolve:{
dialogData:function() {
return {};
}
}
});
b.result.then(function(b) {
var c = b[0].metadata.labels["oshinko-cluster"], d = "cluster-create";
a.alerts = {}, a.alerts[d] = {
type:"success",
message:c + " has been created"
};
})["catch"](function(b) {
if ("cancel" !== b) {
var c = "error-create";
a.alerts[c] = {
type:"error",
message:"Cluster create failed"
};
}
});
}, a.scaleCluster = function(b, c, d) {
var e = j.open({
animation:!0,
controller:"OshinkoClusterScaleCtrl",
templateUrl:"views/oshinko/scale-cluster.html",
backdrop:"static",
resolve:{
dialogData:function() {
return {
clusterName:b,
workerCount:c,
masterCount:d
};
}
}
});
e.result.then(function(c) {
var d = c[0].spec.replicas || 0, e = c[1].spec.replicas || 0, f = b + "-scale", g = 1 !== e ? " masters" :" master", h = 1 !== d ? " workers" :" worker";
a.alerts = {}, a.alerts[f] = {
type:"success",
message:b + " has been scaled to " + d + h + " and " + e + g
};
})["catch"](function(b) {
if ("cancel" !== b) {
var c = "error-scale";
a.alerts[c] = {
type:"error",
message:"Cluster scale failed"
};
}
});
};
} ]), angular.module("openshiftConsole").filter("depName", function() {
var a = {
replicationController:[ "openshift.io/deployment-config.name" ]
};
return function(b) {
return a[b];
};
}).filter("clusterName", function() {
var a = {
route:[ "oshinko-cluster" ]
};
return function(b) {
return a[b];
};
}).factory("clusterData", [ "$http", "$q", "DataService", "DeploymentsService", "ApplicationGenerator", "$filter", function(a, b, c, d, e, f) {
function g(a, b, d) {
return c["delete"](b, a, d, null);
}
function h(a, d) {
var e = b.defer(), g = null;
return c.list("replicationcontrollers", d, function(a) {
var b = a.by("metadata.name");
angular.forEach(b, function(a) {
(!g || new Date(a.metadata.creationTimestamp) > new Date(g.metadata.creationTimestamp)) && (g && c["delete"]("replicationcontrollers", g.metadata.name, d, null).then(angular.noop), g = a);
}), g.spec.replicas = 0, c.update("replicationcontrollers", g.metadata.name, g, d).then(function() {
c["delete"]("replicationcontrollers", g.metadata.name, d, null).then(function(a) {
e.resolve(a);
})["catch"](function(a) {
e.reject(a);
});
})["catch"](function(a) {
e.reject(a);
});
}, {
http:{
params:{
labelSelector:f("depName")("replicationController") + "=" + a
}
}
}), e.promise;
}
function i(a, e, f, g) {
var h = b.defer();
return c.get("deploymentconfigs", e, g, null).then(function(a) {
d.scale(a, f).then(function(a) {
h.resolve(a);
});
}), h.promise;
}
function j(a, b) {
return c.list("routes", b, function(a) {
var c = a.by("metadata.name");
angular.forEach(c, function(a) {
g(a.metadata.name, "routes", b);
});
}, {
http:{
params:{
labelSelector:f("clusterName")("route") + "=" + a
}
}
});
}
function k(a, c) {
var d = a + "-m", e = a + "-w";
return b.all([ h(d, c), h(e, c), g(d, "deploymentconfigs", c), g(e, "deploymentconfigs", c), g(a, "services", c), j(a, c), g(a + "-ui", "services", c) ]);
}
function l(a, b, c, d) {
var e = [];
angular.forEach(a.deploymentConfig.envVars, function(a, b) {
e.push({
name:b,
value:a
});
});
var f = angular.copy(a.labels);
f.deploymentconfig = a.name;
var g = {
image:b.toString(),
name:a.name,
ports:c,
env:e,
resources:{},
terminationMessagePath:"/dev/termination-log",
imagePullPolicy:"IfNotPresent"
}, h = [];
d && (h = [ {
name:d,
configMap:{
name:d,
defaultMode:420
}
} ], g.volumeMounts = [ {
name:d,
readOnly:!0,
mountPath:"/etc/oshinko-spark-configs"
} ]), "master" === a.labels["oshinko-type"] ? (g.livenessProbe = {
httpGet:{
path:"/",
port:8080,
scheme:"HTTP"
},
timeoutSeconds:1,
periodSeconds:10,
successThreshold:1,
failureThreshold:3
}, g.readinessProbe = {
httpGet:{
path:"/",
port:8080,
scheme:"HTTP"
},
timeoutSeconds:1,
periodSeconds:10,
successThreshold:1,
failureThreshold:3
}) :g.livenessProbe = {
httpGet:{
path:"/",
port:8081,
scheme:"HTTP"
},
timeoutSeconds:1,
periodSeconds:10,
successThreshold:1,
failureThreshold:3
};
var i;
i = a.scaling.autoscaling ? a.scaling.minReplicas || 1 :a.scaling.replicas;
var j = {
apiVersion:"v1",
kind:"DeploymentConfig",
metadata:{
name:a.name,
labels:a.labels,
annotations:a.annotations
},
spec:{
replicas:i,
selector:{
"oshinko-cluster":a.labels["oshinko-cluster"]
},
triggers:[ {
type:"ConfigChange"
} ],
template:{
metadata:{
labels:f
},
spec:{
volumes:h,
containers:[ g ],
restartPolicy:"Always",
terminationGracePeriodSeconds:30,
dnsPolicy:"ClusterFirst",
securityContext:{}
}
}
}
};
return a.deploymentConfig.deployOnNewImage && j.spec.triggers.push({
type:"ImageChange",
imageChangeParams:{
automatic:!0,
containerNames:[ a.name ],
from:{
kind:b.kind,
name:b.toString()
}
}
}), j;
}
function m(a, b, c, d, e, f) {
var g = "master" === c ? "-m" :"-w", h = {
deploymentConfig:{
envVars:{
OSHINKO_SPARK_CLUSTER:b
}
},
name:b + g,
labels:{
"oshinko-cluster":b,
"oshinko-type":c
},
annotations:{
"created-by":"oshinko-console"
},
scaling:{
autoscaling:!1,
minReplicas:1
}
};
"worker" === c && (h.deploymentConfig.envVars.SPARK_MASTER_ADDRESS = "spark://" + b + ":7077", h.deploymentConfig.envVars.SPARK_MASTER_UI_ADDRESS = "http://" + b + "-ui:8080"), f && (h.deploymentConfig.envVars.SPARK_CONF_DIR = "/etc/oshinko-spark-configs"), h.scaling.replicas = d ? d :1;
var i = l(h, a, e, f);
return i;
}
function n(a, b, c) {
if (!c || !c.length) return null;
var d = {
kind:"Service",
apiVersion:"v1",
metadata:{
name:b,
labels:a.labels,
annotations:a.annotations
},
spec:{
selector:a.selectors,
ports:c
}
};
return d;
}
function o(a, b, c, d) {
var e = {
labels:{
"oshinko-cluster":b,
"oshinko-type":c
},
annotations:{},
name:a + "-" + c,
selectors:{
"oshinko-cluster":b,
"oshinko-type":"master"
}
};
return n(e, a, d);
}
function p(a, b) {
return c.create("deploymentconfigs", null, a, b, null);
}
function q(a, b) {
return c.create("services", null, a, b, null);
}
function r(a, b) {
var d = a.metadata.name, f = a.metadata.labels, g = {
name:d + "-route"
}, h = e.createRoute(g, d, f);
return c.create("routes", null, h, b);
}
function s(a, d, e, f, g) {
var h = b.defer(), i = {};
return a ? c.get("configmaps", a, g, null).then(function(a) {
a.data.workercount && (i.workerCount = parseInt(a.data.workercount)), a.data.sparkmasterconfig && (i.masterConfigName = a.data.sparkmasterconfig), a.data.sparkworkerconfig && (i.workerConfigName = a.data.sparkworkerconfig), d && (i.workerCount = d), e && (i.workerConfigName = e), f && (i.masterConfigName = f), h.resolve(i);
})["catch"](function() {
d && (i.workerCount = d), e && (i.workerConfigName = e), f && (i.masterConfigName = f), h.resolve(i);
}) :(d && (i.workerCount = d), e && (i.workerConfigName = e), f && (i.masterConfigName = f), h.resolve(i)), h.promise;
}
function t(a, c) {
var d = [ {
name:"spark-webui",
containerPort:8081,
protocol:"TCP"
} ], e = [ {
name:"spark-webui",
containerPort:8080,
protocol:"TCP"
}, {
name:"spark-master",
containerPort:7077,
protocol:"TCP"
} ], f = [ {
protocol:"TCP",
port:7077,
targetPort:7077
} ], g = [ {
protocol:"TCP",
port:8080,
targetPort:8080
} ], h = null, i = null, j = null, k = null, l = b.defer();
return s(a.configName, a.workerCount, a.workerConfigName, a.masterConfigName).then(function(n) {
h = m(a.sparkImage, a.clusterName, "master", null, e, n.masterConfigName), i = m(a.sparkImage, a.clusterName, "worker", n.workerCount, d, n.workerConfigName), j = o(a.clusterName, a.clusterName, "master", f), k = o(a.clusterName + "-ui", a.clusterName, "webui", g);
var s = [ p(h, c), p(i, c), q(j, c), q(k, c) ];
a.exposewebui && s.push(r(k, c)), b.all(s).then(function(a) {
l.resolve(a);
})["catch"](function(a) {
l.reject(a);
});
}), l.promise;
}
function u(a, c, d, e) {
var f = a + "-w", g = a + "-m", h = [ i(a, f, c, e), i(a, g, d, e) ];
return b.all(h);
}
return {
sendDeleteCluster:k,
sendCreateCluster:t,
sendScaleCluster:u
};
} ]), angular.module("oshinkoConsole").controller("OshinkoClusterNewCtrl", [ "$q", "$scope", "dialogData", "clusterData", "$uibModalInstance", "ProjectsService", "DataService", "$routeParams", function(a, b, c, d, e, f, g, h) {
function i(b, c, d, e) {
var f, h = a.defer();
return b || h.resolve(), g.get("configmaps", b, e, null).then(function() {
h.resolve();
})["catch"](function() {
f = new Error("The " + d + " named '" + b + "' does not exist"), f.target = c, h.reject(f);
}), h.promise;
}
function j(c, d) {
b.formError = "";
var e, f = a.defer();
return void 0 !== c && (c ? k.test(c) || (e = new Error("The cluster name contains invalid characters.")) :e = new Error("The cluster name cannot be empty."), e && (e.target = "#cluster-new-name", f.reject(e))), void 0 !== d && (d ? l.test(d) ? d <= 0 && (e = new Error("Please give a value greater than 0.")) :e = new Error("Please give a valid number of workers.") :e = new Error("The number of workers count cannot be empty."), e && (e.target = "#cluster-new-workers", f.reject(e))), e || f.resolve(), f.promise;
}
var k = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/, l = /^[0-9]*$/, m = {
name:"",
workers:1,
advworkers:1,
configname:"",
masterconfigname:"",
workerconfigname:"",
exposewebui:!0,
sparkimage:"docker.io/radanalyticsio/openshift-spark:latest"
};
b.fields = m, b.advanced = !1, b.toggleAdvanced = function() {
b.advanced = !b.advanced;
}, b.cancelfn = function() {
e.dismiss("cancel");
}, b.newCluster = function() {
var c = b.fields.name.trim(), g = b.advanced, k = b.fields.workers, l = g ? b.fields.configname :null, m = g ? b.fields.masterconfigname :null, n = g ? b.fields.workerconfigname :null, o = !g || b.fields.exposewebui, p = g && "" !== b.fields.sparkimage ? b.fields.sparkimage :"docker.io/radanalyticsio/openshift-spark:latest", q = {
clusterName:c,
workerCount:k,
configName:l,
masterConfigName:m,
workerConfigName:n,
exposewebui:o,
sparkImage:p
};
return f.get(h.project).then(_.spread(function(f, g) {
return b.project = f, b.context = g, a.all([ j(c, k), i(l, "cluster-config-name", "cluster configuration", b.context), i(m, "cluster-masterconfig-name", "master spark configuration", b.context), i(n, "cluster-workerconfig-name", "worker spark configuration", b.context) ]).then(function() {
d.sendCreateCluster(q, b.context).then(function(a) {
e.close(a);
}, function(a) {
b.formError = a.data.message;
});
}, function(a) {
b.formError = a.message;
});
}));
};
} ]), angular.module("openshiftConsole").controller("OshinkoClusterDeleteCtrl", [ "$q", "$scope", "clusterData", "$uibModalInstance", "dialogData", "$routeParams", "ProjectsService", function(a, b, c, d, e, f, g) {
b.clusterName = e.clusterName || "", b.workerCount = e.workerCount || 0, b.masterCount = e.masterCount || 0, b.deleteCluster = function() {
g.get(f.project).then(_.spread(function(a, e) {
b.project = a, b.context = e, c.sendDeleteCluster(b.clusterName, b.context).then(function(a) {
var b = !1;
angular.forEach(a, function(a) {
(a.code >= 300 || a.code < 200) && (b = !0);
}), b ? d.dismiss(a) :d.close(a);
}, function(a) {
d.dismiss(a);
});
}));
}, b.cancelfn = function() {
d.dismiss("cancel");
};
} ]), angular.module("openshiftConsole").controller("OshinkoClusterScaleCtrl", [ "$q", "$scope", "clusterData", "$uibModalInstance", "dialogData", "$routeParams", "ProjectsService", function(a, b, c, d, e, f, g) {
function h(c) {
b.formError = "";
var d, e = a.defer();
return void 0 === c || null === c ? d = new Error("The number of workers cannot be empty or less than 0.") :i.test(c) ? c < 0 && (d = new Error("Please give a value greater than or equal to 0.")) :d = new Error("Please give a valid number of workers."), d && (d.target = "#numworkers", e.reject(d)), d || e.resolve(), e.promise;
}
b.clusterName = e.clusterName || "", b.workerCount = e.workerCount || 0, b.masterCount = e.masterCount || 0, b.cancelfn = function() {
d.dismiss("cancel");
};
var i = /^[0-9]*$/;
b.scaleCluster = function(a, e) {
g.get(f.project).then(_.spread(function(f, g) {
b.project = f, b.context = g, h(a).then(function() {
c.sendScaleCluster(b.clusterName, a, e, b.context).then(function(a) {
d.close(a);
}, function(a) {
b.formError = a.data.message;
});
}, function(a) {
b.formError = a.message;
});
}));
};
} ]);