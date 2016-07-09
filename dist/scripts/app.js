'use strict';

class AstContainer {
    constructor(ast, tokens) {
        this.originalAst = ast;
        this.modifiedAst = ast;
    }

    asJson() {
        return JSON.stringify(this.modifiedAst, null, '\t');
    }

    filter() {
        // TODO: filter unnecessary elements
    }

    static fromSourceCode(esprima, code) {
        // FIXME: dont want to pass esprima to this method, but dont have access to $window
        var ast = esprima.parse(code)
        return new AstContainer(ast);
    }
}

class BabelParser {
    static babelify(code) {
        var transformed = Babel.transform(code, {
            presets: ['es2015', 'react']
        });
        return transformed.code;
    }
}

class ESQueryUtil {
    constructor(ast) {
        this.sourceAst = ast;
    }
    extractComponents() {
        // TODO
    }
    countVariablesPerComponent() {
        // TODO
    }
    countFunctionsPerComponent() {
        // TODO
    }
    execute(query) {
        var selectorAst = esquery.parse(query);
        return esquery.match(this.sourceAst, selectorAst);
    }
}

angular.module('columbusApp', ['ngMaterial'])
    .controller('AppCtrl', function($scope,$window) {

        if (angular.isUndefined($window.esprima)) {
            throw new Error('This Application depends on Esprima library - http://esprima.org/');
        }

        $scope.jsContent = 'var dummy = 5;';

        $scope.syntaxContent = '';
        $scope.tokensContent = '';

        var ast = new AstContainer('{fpp:"asd"}');
        console.log(ast.asJson());

        //Watch 'content' and update content whenever it changes
        /*$scope.$watch('jsContent', function(newValue, oldValue){
            $scope.syntaxContent =  JSON.stringify($window.esprima.parse(newValue), null, '\t');
            $scope.tokensContent =  JSON.stringify($window.esprima.tokenize(newValue), null, '\t');
        }, true);*/

        $scope.extractModel = function extractModel() {
            console.log('extracting the model');

            var parsedCode = BabelParser.babelify($scope.jsContent);
            var astContainer = AstContainer.fromSourceCode($window.esprima, parsedCode);

            $scope.syntaxContent = astContainer.asJson();
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
