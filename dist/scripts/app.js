'use strict';

angular.module('columbusApp', ['ngMaterial'])
    .controller('AppCtrl', function($scope,$window) {

        if (angular.isUndefined($window.esprima)) {
            throw new Error('This Application depends on Esprima library - http://esprima.org/');
        }

        $scope.jsContent = "";

        $scope.syntaxContent = '';
        $scope.tokensContent = '';
        $scope.modelContent  = '';

        //Watch 'content' and update content whenever it changes
        /*$scope.$watch('jsContent', function(newValue, oldValue){
            $scope.syntaxContent =  JSON.stringify($window.esprima.parse(newValue), null, '\t');
            $scope.tokensContent =  JSON.stringify($window.esprima.tokenize(newValue), null, '\t');
        }, true);*/

        $scope.extractModel = function extractModel() {
            console.log('extracting the model');

            var jsxParser = new JsxParser();
            var astParser = new AstParser($window.esprima);

            var parsedJsxCode = jsxParser.transform($scope.jsContent);
            var ast = astParser.parse(parsedJsxCode);

            $scope.syntaxContent = ast.asJson();
            $scope.tokensContent = ast.tokensAsJson();

            var modelExtractorChain = new ModelExtractorChain();
            var extractedModel = modelExtractorChain.apply(ast);

            $scope.modelContent = JSON.stringify(extractedModel, null, '\t');
        }


    })
    .directive('editor', ['$window','$timeout', function ($window,$timeout) {

        if (angular.isUndefined($window.ace)) {
            throw new Error('This directive depends on Ace Editor - https://github.com/ajaxorg/ace');
        }

        return {
            restrict: 'E',
            scope: {
                type: '@',
                content: '='
            },
            link: function (scope, elem, attrs) {
                var node = elem[0];

                var mode ='';
                switch (scope.type) {
                    case 'json':
                        mode = 'ace/mode/json';
                        break;
                    case 'javascript':
                        mode = 'ace/mode/javascript';
                        break;
                    default:
                        mode = 'ace/mode/text';
                }


                //Define styles
                node.style.display='block';
                node.style.margin ='10px';


                var editor = $window.ace.edit(node);
                editor.session.setMode(mode);
                editor.$blockScrolling = Infinity;
                editor.setAutoScrollEditorIntoView(true);
                editor.setOption("minLines", 5);
                editor.setOption("maxLines", 50);

                //Watch 'content' and update content whenever it changes
                scope.$watch('content', function(newValue, oldValue){
                    editor.setValue(newValue);
                    editor.clearSelection();
                }, true);


                editor.on("change", function(e) {
                    $timeout(function(){
                        scope.content = editor.getValue();
                    });

                });

            }
        };
    }]);
