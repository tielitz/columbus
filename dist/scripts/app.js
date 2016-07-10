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

            let jsxParser = new JsxParser();
            let astParser = new AstParser($window.esprima);

            let parsedJsxCode = jsxParser.transform($scope.jsContent);
            let ast = astParser.parse(parsedJsxCode);

            $scope.syntaxContent = ast.asJson();
            $scope.tokensContent = ast.tokensAsJson();

            let modelExtractorChain = new ModelExtractorChain();
            let extractedModel = modelExtractorChain.apply(ast);

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
                // disables syntax checker
                editor.getSession().setUseWorker(false);

                //Watch 'content' and update content whenever it changes
                scope.$watch('content', function(newValue, oldValue) {
                    // only update the contents if it is different
                    // fixes the bug that the curser jumpes at the
                    // end of the editor after each key stroke
                    if (editor.getValue() !== newValue) {
                        editor.setValue(newValue);
                        editor.clearSelection();
                    }
                }, true);


                editor.on("change", function(e) {
                    $timeout(function() {
                        scope.content = editor.getValue();
                    });

                });

            }
        };
    }]);
